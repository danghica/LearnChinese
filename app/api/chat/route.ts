import { NextRequest, NextResponse } from "next/server";
import { getSelectedVocabulary } from "@/lib/vocabulary";
import { createConversation, appendMessage, getConversationById } from "@/lib/conversations";
import { chat, parseMisusedWords, parseYesNo, stripMisusedJson, stripMarkdown } from "@/lib/llm";
import { segment } from "@/lib/segment";
import { getWordByWord } from "@/lib/words";
import { recordUsage } from "@/lib/words";

const STANDING_PROMPT =
  "Use chinese language for the dialogue. Use English language for corrections and explanations.";

const VOCAB_INSTRUCTION =
  "Strongly prefer using words from this vocabulary list whenever possible. You may also use any HSK1, HSK2, or HSK3 vocabulary as needed.";

function buildAcknowledgeSystemPrompt(vocabList: string[]): string {
  const vocabBlock = vocabList.length
    ? `Vocabulary to use: ${vocabList.join(", ")}.\n\n${VOCAB_INSTRUCTION}`
    : `You may use any HSK1, HSK2, or HSK3 vocabulary.`;
  return `${STANDING_PROMPT}\n\n${vocabBlock}\n\nRespond to the next prompt in Chinese using this vocabulary.`;
}

function buildSystemPrompt(vocabList: string[], topic: string | null, isNew: boolean): string {
  const vocabBlock = vocabList.length
    ? `Vocabulary to use: ${vocabList.join(", ")}.\n\n${VOCAB_INSTRUCTION}`
    : `You may use any HSK1, HSK2, or HSK3 vocabulary.`;
  if (isNew) {
    const topicPart = topic && topic.trim()
      ? `The user has requested a topic or theme (in English or Chinese): "${topic}".`
      : "The user did not specify a topic; use a general conversation theme.";
    return `${STANDING_PROMPT}\n\n${vocabBlock}\n\n${topicPart}\n\nYou MUST reply with your first message in Chinese. Greet the user and start the conversation (e.g. introduce the topic and ask a first question). Respond in Chinese only.`;
  }
  return (
    `${STANDING_PROMPT}\n\nYou are continuing a conversation. For each user message you must do TWO things in order:\n\n` +
    `1. First, evaluate the user's answer for correctness. Output this evaluation clearly using English ` +
    `(e.g. whether their answer is correct or incorrect, what was wrong or what was good, brief feedback).\n\n` +
    `2. Then, respond conversationally in Chinese: continue the dialogue, ask a follow-up question, or test comprehension of what was said so far. ` +
    `Use the vocabulary list below; strongly prefer it whenever possible, and you may use any HSK1, HSK2, or HSK3 vocabulary as needed.\n\n` +
    `When you correct the user's answer, at the END of your message add a JSON block on a new line with the list of Chinese words they used incorrectly, e.g.:\n` +
    `{"misused_words": ["词1", "词2"]}\nIf no words were misused, use: {"misused_words": []}\n\n` +
    `${vocabBlock}\n\nRespond in Chinese.`
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      messages,
      conversationId: rawConvId,
      newWordsPerConversation = 10,
      topic: topicParam,
      debug: debugMode = false,
    } = body as {
      messages?: { role: string; content: string }[];
      conversationId?: string | null;
      newWordsPerConversation?: number;
      topic?: string | null;
      debug?: boolean;
    };
    type LlmCall = { sent: { role: string; content: string }[]; received: string };
    const llmCalls: LlmCall[] = [];
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "messages array required" }, { status: 400 });
    }
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role !== "user") {
      return NextResponse.json({ error: "Last message must be from user" }, { status: 400 });
    }
    const vocabList = getSelectedVocabulary({ topWords: 300 });
    const vocabSet = new Set(vocabList);
    const usageRecorded: { word: string; correct: boolean }[] = [];
    const convId = rawConvId ? parseInt(String(rawConvId), 10) : null;
    const existingConv = convId != null && !Number.isNaN(convId) ? getConversationById(convId) : null;
    const isNewConversationRequest = !existingConv && messages.length >= 1;

    if (isNewConversationRequest && messages.length === 1) {
      // New conversation: acknowledge then first reply (two LLM calls). No DB until after call 1.
      const acknowledgeSystem = buildAcknowledgeSystemPrompt(vocabList);
      const acknowledgeUser =
        "Respond to the next prompt in Chinese using this vocabulary and any HSK1, HSK2, or HSK3 words. Acknowledge by replying with exactly: Acknowledged.";
      const ackMessages = [
        { role: "system" as const, content: acknowledgeSystem },
        { role: "user" as const, content: acknowledgeUser },
      ];
      const ackReceived = await chat(ackMessages);
      if (debugMode) llmCalls.push({ sent: ackMessages, received: ackReceived });
      // Proceed to call 2 even if acknowledgment was not exact (per plan: do not block).
      const conversationId = createConversation(topicParam ?? "general conversation");
      const topic = topicParam ?? "general conversation";
      const firstContent = (lastMessage.content || "").trim();
      const isPlaceholder =
        firstContent.length === 0 || /^(start|begin|go|hi|hello|start conversation)$/i.test(firstContent);
      const promptForLlm = isPlaceholder ? "discuss a random topic" : firstContent;
      const storedUserContent = firstContent.length > 0 ? firstContent : lastMessage.content || "";
      const systemPrompt = buildSystemPrompt(vocabList, topic, true);
      const firstReplyMessages = [
        { role: "system" as const, content: systemPrompt },
        { role: "user" as const, content: promptForLlm },
      ];
      const rawContent = await chat(firstReplyMessages);
      if (debugMode) llmCalls.push({ sent: firstReplyMessages, received: rawContent });
      const displayContent = stripMisusedJson(rawContent);
      const plainContent = stripMarkdown(displayContent);
      appendMessage(conversationId, "user", storedUserContent);
      const messageId = appendMessage(conversationId, "assistant", plainContent);
      const segments = segment(plainContent);
      return NextResponse.json({
        content: plainContent,
        conversationId: String(conversationId),
        messageId: String(messageId),
        segments: segments.map((word) => ({ word, inVocabulary: vocabSet.has(word) })),
        usage_recorded: usageRecorded,
        ...(debugMode && llmCalls.length > 0 ? { llm_calls: llmCalls } : {}),
      });
    }

    // Continuation: resolve conversationId, then correctness call, then main reply.
    let conversationId: number;
    if (existingConv) {
      conversationId = convId!;
    } else {
      conversationId = createConversation(topicParam ?? "general conversation");
    }
    const current = getConversationById(conversationId);
    const topic = current?.topic ?? topicParam ?? "general conversation";
    let recordedAllCorrect = false;

    if (messages.length >= 2) {
      // Correctness step: last 6 messages (or full thread) + yes/no question.
      const recent = messages.slice(-6);
      const contextLines = recent.map((m: { role: string; content: string }) => `[${m.role}]: ${m.content}`).join("\n");
      const correctnessPrompt = `Conversation:\n${contextLines}\n\nis the following sentence correct and meaningful in the context of the conversation? answer just yes or no: ${lastMessage.content}`;
      const correctnessMessages = [
        { role: "system" as const, content: "Answer only yes or no." },
        { role: "user" as const, content: correctnessPrompt },
      ];
      const correctnessReply = await chat(correctnessMessages);
      if (debugMode) llmCalls.push({ sent: correctnessMessages, received: correctnessReply });
      const isCorrect = parseYesNo(correctnessReply);
      if (isCorrect) {
        recordedAllCorrect = true;
        const userWords = segment(lastMessage.content);
        for (const w of userWords) {
          if (!w.trim()) continue;
          const wordRow = getWordByWord(w);
          if (!wordRow) continue;
          usageRecorded.push({ word: wordRow.word, correct: true });
        }
      }
    }

    const systemPrompt = buildSystemPrompt(vocabList, topic, false);
    const userMessages = messages.map((m: { role: string; content: string }) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));
    const apiMessages: { role: "user" | "assistant" | "system"; content: string }[] = [
      { role: "system", content: systemPrompt },
      ...userMessages,
    ];
    const rawContent = await chat(apiMessages);
    if (debugMode) llmCalls.push({ sent: apiMessages, received: rawContent });
    const misused = parseMisusedWords(rawContent);
    const displayContent = stripMisusedJson(rawContent);
    const plainContent = stripMarkdown(displayContent);
    appendMessage(conversationId, "user", lastMessage.content);
    const messageId = appendMessage(conversationId, "assistant", plainContent);

    if (messages.length >= 2 && !recordedAllCorrect) {
      const lastUserContent = lastMessage.content;
      const userWords = segment(lastUserContent);
      const misusedSet = new Set(misused);
      for (const w of userWords) {
        if (!w.trim()) continue;
        const wordRow = getWordByWord(w);
        if (!wordRow || !vocabSet.has(w)) continue;
        const correct = !misusedSet.has(w);
        if (!correct) recordUsage(wordRow.id, false);
        usageRecorded.push({ word: wordRow.word, correct });
      }
    }

    const segments = segment(plainContent);
    return NextResponse.json({
      content: plainContent,
      conversationId: String(conversationId),
      messageId: String(messageId),
      segments: segments.map((word) => ({ word, inVocabulary: vocabSet.has(word) })),
      usage_recorded: usageRecorded,
      ...(misused.length > 0 ? { misused_words: misused } : {}),
      ...(debugMode && llmCalls.length > 0 ? { llm_calls: llmCalls } : {}),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 }
    );
  }
}
