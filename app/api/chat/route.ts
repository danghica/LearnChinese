import { NextRequest, NextResponse } from "next/server";
import { getSelectedVocabulary } from "@/lib/vocabulary";
import { getCurrentConversation, createConversation, appendMessage, getConversationById } from "@/lib/conversations";
import { chat, parseMisusedWords, stripMisusedJson } from "@/lib/llm";
import { segment } from "@/lib/segment";
import { getWordByWord } from "@/lib/words";
import { recordUsage } from "@/lib/words";

const STANDING_PROMPT =
  "You are a teacher teaching Chinese to an English speaker. Be supportive and pedagogical. Use only the vocabulary words provided.";

function buildSystemPrompt(vocabList: string[], topic: string | null, isNew: boolean): string {
  const vocabBlock = vocabList.length ? `Use ONLY these Chinese words in your responses: ${vocabList.join(", ")}.` : "";
  if (isNew) {
    const topicPart = topic && topic.trim()
      ? `The user has requested a topic or theme (in English): "${topic}".`
      : "The user did not specify a topic; use a general conversation theme.";
    return `${STANDING_PROMPT}\n\n${topicPart}\n\nYou MUST reply with your first message in Chinese. Greet the user and start the conversation (e.g. introduce the topic and ask a first question). Use only the vocabulary words listed below. If needed, use the most common words from the list to form a natural greeting.\n\n${vocabBlock}\n\nRespond in Chinese only.`;
  }
  return `${STANDING_PROMPT}\n\nYou are continuing a conversation. Formulate questions in Chinese about the topic for the user to practice, or correct the user's answer and explain mistakes in Chinese. When you correct the user's answer, at the END of your message add a JSON block on a new line with the list of Chinese words they used incorrectly, e.g.:\n{"misused_words": ["词1", "词2"]}\nIf no words were misused, use: {"misused_words": []}\n\n${vocabBlock}\n\nRespond in Chinese.`;
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
    let conversationId: number;
    let isNew = false;
    const convId = rawConvId ? parseInt(String(rawConvId), 10) : null;
    if (convId && !Number.isNaN(convId)) {
      const existing = getConversationById(convId);
      if (existing) {
        conversationId = convId;
      } else {
        conversationId = createConversation(topicParam ?? "general conversation");
        isNew = true;
      }
    } else {
      conversationId = createConversation(topicParam ?? "general conversation");
      isNew = true;
    }
    const current = getConversationById(conversationId);
    const topic = current?.topic ?? topicParam ?? "general conversation";
    const systemPrompt = buildSystemPrompt(vocabList, topic, isNew);
    let userMessages = messages.map((m: { role: string; content: string }) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));
    if (isNew && userMessages.length === 1 && userMessages[0].role === "user") {
      const firstContent = (userMessages[0].content || "").trim();
      const explicitPrompt =
        firstContent.length === 0 || /^(start|begin|go|hi|hello|start conversation)$/i.test(firstContent)
          ? "Please start the conversation in Chinese. Greet me and ask the first question."
          : `The user wants to start a conversation. Their message (topic or first input, often in English) is: "${firstContent}". Reply with your first message in Chinese: greet them and start the conversation on this topic.`;
      userMessages = [{ role: "user" as const, content: explicitPrompt }];
    }
    const apiMessages: { role: "user" | "assistant" | "system"; content: string }[] = [
      { role: "system", content: systemPrompt },
      ...userMessages,
    ];
    const rawContent = await chat(apiMessages);
    const misused = parseMisusedWords(rawContent);
    const displayContent = stripMisusedJson(rawContent);
    appendMessage(conversationId, "user", lastMessage.content);
    const messageId = appendMessage(conversationId, "assistant", displayContent);
    const isFirstUserMessage = isNew && messages.length === 1;
    if (messages.length >= 2 && !isFirstUserMessage) {
      const lastUserContent = lastMessage.content;
      const userWords = segment(lastUserContent);
      const vocabSet = new Set(vocabList);
      const misusedSet = new Set(misused);
      for (const w of userWords) {
        if (!w.trim()) continue;
        const wordRow = getWordByWord(w);
        if (!wordRow || !vocabSet.has(w)) continue;
        recordUsage(wordRow.id, !misusedSet.has(w));
      }
    }
    const segments = segment(displayContent);
    return NextResponse.json({
      content: displayContent,
      conversationId: String(conversationId),
      messageId: String(messageId),
      segments: segments.map((word) => ({ word })),
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
