import { NextRequest, NextResponse } from "next/server";
import { getSelectedVocabulary } from "@/lib/vocabulary";
import { createConversation, appendMessage, getConversationById } from "@/lib/conversations";
import { chat, parseMisusedWords, parseYesNo, stripMisusedJson } from "@/lib/llm";
import { segment } from "@/lib/segment";
import { getWordByWord } from "@/lib/words";
import { recordUsage } from "@/lib/words";

const STANDING_PROMPT =
  "You are a teacher teaching Chinese to an English speaker. Be supportive and pedagogical. Use only the vocabulary words provided.";

const HSK2_INSTRUCTION = " You may also use any HSK2 vocabulary.";

function buildAcknowledgeSystemPrompt(vocabList: string[]): string {
  const vocabBlock = vocabList.length ? `Use ONLY these Chinese words in your responses: ${vocabList.join(", ")}.` : "";
  return `${STANDING_PROMPT}\n\n${vocabBlock}${HSK2_INSTRUCTION}\n\nRespond to the next prompt in Chinese using words in this vocabulary and all HSK2 words.`;
}

function buildSystemPrompt(vocabList: string[], topic: string | null, isNew: boolean): string {
  const vocabBlock = vocabList.length ? `Use ONLY these Chinese words in your responses: ${vocabList.join(", ")}.` : "";
  if (isNew) {
    const topicPart = topic && topic.trim()
      ? `The user has requested a topic or theme (in English): "${topic}".`
      : "The user did not specify a topic; use a general conversation theme.";
    return `${STANDING_PROMPT}\n\n${topicPart}\n\n${vocabBlock}${HSK2_INSTRUCTION}\n\nYou MUST reply with your first message in Chinese. Greet the user and start the conversation (e.g. introduce the topic and ask a first question). Respond in Chinese only.`;
  }
  return `${STANDING_PROMPT}\n\nYou are continuing a conversation. For each user message you must do TWO things in order:\n\n1. First, evaluate the user's answer for correctness. Output this evaluation clearly (e.g. whether their answer is correct or incorrect, what was wrong or what was good, brief feedback).\n\n2. Then, respond conversationally in Chinese: continue the dialogue, ask a follow-up question, or give encouragement, using ONLY the vocabulary words listed below.\n\nWhen you correct the user's answer, at the END of your message add a JSON block on a new line with the list of Chinese words they used incorrectly, e.g.:\n{"misused_words": ["词1", "词2"]}\nIf no words were misused, use: {"misused_words": []}\n\n${vocabBlock}${HSK2_INSTRUCTION}\n\nRespond in Chinese.`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      messages,
      conversationId: rawConvId,
      newWordsPerConversation = 10,
      topic: topicParam,
    } = body as {
      messages?: { role: string; content: string }[];
      conversationId?: string | null;
      newWordsPerConversation?: number;
      topic?: string | null;
    };
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "messages array required" }, { status: 400 });
    }
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role !== "user") {
      return NextResponse.json({ error: "Last message must be from user" }, { status: 400 });
    }
    const vocabList = getSelectedVocabulary({
      topN: 250,
      newK: typeof newWordsPerConversation === "number" ? newWordsPerConversation : 10,
    });
    const usageRecorded: { word: string; correct: boolean }[] = [];
    const convId = rawConvId ? parseInt(String(rawConvId), 10) : null;
    const existingConv = convId != null && !Number.isNaN(convId) ? getConversationById(convId) : null;
    const isNewConversationRequest = !existingConv && messages.length >= 1;

    if (isNewConversationRequest && messages.length === 1) {
      // New conversation: acknowledge then first reply (two LLM calls). No DB until after call 1.
      const acknowledgeSystem = buildAcknowledgeSystemPrompt(vocabList);
      const acknowledgeUser =
        "Respond to the next prompt in Chinese using words in this vocabulary and all HSK2 words. Acknowledge by replying with exactly: Acknowledged.";
      await chat([
        { role: "system", content: acknowledgeSystem },
        { role: "user", content: acknowledgeUser },
      ]);
      // Proceed to call 2 even if acknowledgment was not exact (per plan: do not block).
      const conversationId = createConversation(topicParam ?? "general conversation");
      const topic = topicParam ?? "general conversation";
      const firstContent = (lastMessage.content || "").trim();
      const isPlaceholder =
        firstContent.length === 0 || /^(start|begin|go|hi|hello|start conversation)$/i.test(firstContent);
      const promptForLlm = isPlaceholder ? "discuss a random topic" : firstContent;
      const storedUserContent = firstContent.length > 0 ? firstContent : lastMessage.content || "";
      const systemPrompt = buildSystemPrompt(vocabList, topic, true);
      const rawContent = await chat([
        { role: "system", content: systemPrompt },
        { role: "user", content: promptForLlm },
      ]);
      const displayContent = stripMisusedJson(rawContent);
      appendMessage(conversationId, "user", storedUserContent);
      const messageId = appendMessage(conversationId, "assistant", displayContent);
      const segments = segment(displayContent);
      return NextResponse.json({
        content: displayContent,
        conversationId: String(conversationId),
        messageId: String(messageId),
        segments: segments.map((word) => ({ word })),
        usage_recorded: usageRecorded,
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
      const correctnessReply = await chat([
        { role: "system", content: "Answer only yes or no." },
        { role: "user", content: correctnessPrompt },
      ]);
      const isCorrect = parseYesNo(correctnessReply);
      if (isCorrect) {
        recordedAllCorrect = true;
        const userWords = segment(lastMessage.content);
        for (const w of userWords) {
          if (!w.trim()) continue;
          const wordRow = getWordByWord(w);
          if (!wordRow) continue;
          recordUsage(wordRow.id, true);
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
    const misused = parseMisusedWords(rawContent);
    const displayContent = stripMisusedJson(rawContent);
    appendMessage(conversationId, "user", lastMessage.content);
    const messageId = appendMessage(conversationId, "assistant", displayContent);

    if (messages.length >= 2 && !recordedAllCorrect) {
      const lastUserContent = lastMessage.content;
      const userWords = segment(lastUserContent);
      const vocabSet = new Set(vocabList);
      const misusedSet = new Set(misused);
      for (const w of userWords) {
        if (!w.trim()) continue;
        const wordRow = getWordByWord(w);
        if (!wordRow || !vocabSet.has(w)) continue;
        const correct = !misusedSet.has(w);
        recordUsage(wordRow.id, correct);
        usageRecorded.push({ word: wordRow.word, correct });
      }
    }

    const segments = segment(displayContent);
    return NextResponse.json({
      content: displayContent,
      conversationId: String(conversationId),
      messageId: String(messageId),
      segments: segments.map((word) => ({ word })),
      usage_recorded: usageRecorded,
      ...(misused.length > 0 ? { misused_words: misused } : {}),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 }
    );
  }
}
