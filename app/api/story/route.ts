import { NextRequest, NextResponse } from "next/server";
import { chat, type ChatMessage } from "@/lib/llm";
import { segment } from "@/lib/segment";
import { isJiebaFriendlySentence, isPrimarilyHanzi } from "@/lib/storyValidation";

const STORY_WORD_COUNT = 1500;
const STORY_SYSTEM_PROMPT = `You are a story teller. Write a story using only HSK1, HSK2, and HSK3 grammar and vocabulary. The story must be approximately ${STORY_WORD_COUNT} Chinese words long (in total across all sentences).

Output rules (strict):
- Use Chinese characters (汉字) for every Chinese word. Example of correct style: 小女孩走进森林。
- Do not write Chinese in Hanyu Pinyin or any Latin romanization. Do not mix English into the story body.
- No JSON, no numbering, no meta commentary—only the story text.`;

/** Split Chinese text into sentences on sentence-ending punctuation and newlines. Keeps delimiter with the sentence. */
function splitIntoSentences(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  // Split after 。？！； or newline; delimiter stays with previous segment (lookbehind)
  const parts = trimmed.split(/(?<=[。？！；\n])/);
  return parts.map((s) => s.trim()).filter(Boolean);
}

const TRANSLATION_BATCH_SIZE = 8;

const TRANSLATION_SYSTEM = `You are a translator. You will receive several Chinese sentences. Reply with the English translation of each sentence, one per line, in the same order. Use exactly one line per sentence. No numbering, no quotes, no extra explanation.`;

/** Strip surrounding quotes if the model wrapped the translation. */
function normalizeTranslation(raw: string): string {
  const s = raw.trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'")))
    return s.slice(1, -1).trim();
  return s;
}

/** Parse batch translation response into one string per line; pads with placeholder if fewer lines than expected. */
function parseBatchTranslation(raw: string, expectedCount: number): string[] {
  const lines = raw
    .split(/\n/)
    .map((line) => {
      let s = line.trim();
      const numbered = s.match(/^\d+[.)]\s*(.*)$/);
      if (numbered) s = numbered[1].trim();
      return normalizeTranslation(s);
    })
    .filter((line) => line.length > 0);
  const result: string[] = [];
  for (let i = 0; i < expectedCount; i++) {
    result.push(i < lines.length ? lines[i] : "[Translation failed]");
  }
  return result;
}

type StoryBlockOut = {
  chinese: string;
  english: string;
  chineseComma: string;
  chineseWords: string[];
};

export async function POST(request: NextRequest) {
  let rawStory = "";
  try {
    const body = await request.json().catch(() => ({}));
    const topic = typeof body.topic === "string" ? body.topic.trim() : "";
    const topicPhrase = topic || "any topic";
    const userPrompt = `Tell me a story with the following topic: ${topicPhrase}. Write the entire story in Chinese characters (汉字) only—approximately ${STORY_WORD_COUNT} Chinese words. Use HSK1–HSK3 vocabulary. Do not use Pinyin or English in the story. Reply with nothing but the story text.`;

    const messages: ChatMessage[] = [
      { role: "system", content: STORY_SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ];
    const maxAttempts = 4;
    const storyModel = "llama-3.1-8b-instant";

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      rawStory = await chat(messages, storyModel, { max_tokens: 8192 });
      const trimmed = rawStory?.trim() ?? "";
      if (trimmed && isPrimarilyHanzi(trimmed)) break;
      if (attempt < maxAttempts) {
        messages.push({ role: "assistant", content: trimmed || "(empty response)" });
        messages.push({
          role: "user",
          content:
            "Your last reply was not valid: it must be written entirely in Chinese characters (汉字), not Pinyin or English. Rewrite the complete story from the beginning with the same topic and length, using 汉字 for all Chinese words.",
        });
        await new Promise((r) => setTimeout(r, 600 * attempt));
      }
    }

    if (!rawStory?.trim() || !isPrimarilyHanzi(rawStory)) {
      return NextResponse.json(
        {
          error:
            "Story generation did not return proper Chinese (汉字). The model may have used Pinyin—try again, or use a different topic.",
        },
        { status: 502 }
      );
    }

    const sentences = splitIntoSentences(rawStory);
    if (sentences.length === 0) {
      return NextResponse.json(
        { error: "Story generation returned no content. Please try again." },
        { status: 502 }
      );
    }

    const blocks: StoryBlockOut[] = [];
    for (let i = 0; i < sentences.length; i += TRANSLATION_BATCH_SIZE) {
      const batch = sentences.slice(i, i + TRANSLATION_BATCH_SIZE);
      const batchUserPrompt = `Translate the following Chinese sentences to English. Reply with exactly one English sentence per line, in the same order. No numbering.\n\n${batch.map((s, j) => `${j + 1}. ${s}`).join("\n")}`;
      let translations: string[] = batch.map(() => "[Translation failed]");
      try {
        const transMessages = [
          { role: "system" as const, content: TRANSLATION_SYSTEM },
          { role: "user" as const, content: batchUserPrompt },
        ];
        const rawTrans = await chat(transMessages, storyModel, { max_tokens: 512 });
        if (rawTrans?.trim()) {
          translations = parseBatchTranslation(rawTrans, batch.length);
        }
      } catch (err) {
        console.error("Translation batch failed:", err);
      }
      for (let j = 0; j < batch.length; j++) {
        const chinese = batch[j];
        const chineseWords = isJiebaFriendlySentence(chinese)
          ? segment(chinese)
          : [chinese.trim() || chinese];
        const chineseComma = chineseWords.join(",");
        blocks.push({
          chinese,
          english: translations[j],
          chineseComma,
          chineseWords,
        });
      }
    }

    return NextResponse.json({ blocks });
  } catch (e) {
    console.error(e);
    const message = e instanceof Error ? e.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
