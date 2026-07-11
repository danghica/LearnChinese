import { NextRequest, NextResponse } from "next/server";
import { chat, DEFAULT_CHAT_MODEL, type ChatMessage } from "@/lib/llm";
import { segment } from "@/lib/segment";
import { isJiebaFriendlySentence, isPrimarilyHanzi, mergeDialogueFragments } from "@/lib/storyValidation";
import { saveStory } from "@/lib/stories";

/** Story generation plus translation batches can exceed default serverless timeouts. */
export const maxDuration = 300;

/** ~1100 words trims the dominant story-generation latency versus very long targets while keeping a substantial story. */
const STORY_WORD_COUNT = 1100;
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

/** Fewer round-trips; size stays within one JSON response with generous max_tokens. */
const TRANSLATION_BATCH_SIZE = 24;
/** Paid API: run many translation requests in parallel to minimize wall time. */
const TRANSLATION_CONCURRENCY = 16;

const TRANSLATION_SYSTEM_JSON = `You translate Chinese to English. Reply ONLY with a valid JSON array of strings: same length as the input list, each element the English translation of the matching Chinese sentence. No markdown code fences, no keys, no commentary—only the JSON array.`;

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

/** Prefer strict JSON array from model (avoids paragraph replies that break line-based parsing). */
function parseTranslationJsonArray(raw: string, expectedCount: number): string[] | null {
  let s = raw.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```/im.exec(s);
  if (fence) s = fence[1].trim();
  const start = s.indexOf("[");
  const end = s.lastIndexOf("]");
  if (start === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(s.slice(start, end + 1)) as unknown;
    if (!Array.isArray(parsed) || parsed.length !== expectedCount) return null;
    const out: string[] = [];
    for (const item of parsed) {
      if (typeof item !== "string") return null;
      const t = item.trim();
      if (!t) return null;
      out.push(t);
    }
    return out;
  } catch {
    return null;
  }
}

async function translateSentenceBatch(batch: string[]): Promise<string[]> {
  const failAll = () => batch.map(() => "[Translation failed]");
  const payload = JSON.stringify(batch);
  const baseUser = `Translate each string in this JSON array from Chinese to English.

Input (JSON array, ${batch.length} strings):
${payload}

Output: ONLY a JSON array of exactly ${batch.length} English strings in the same order. Use double quotes for JSON strings; escape any " inside a translation as \\".`;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const retryHint =
        attempt === 1
          ? `\n\nIMPORTANT: Your previous answer was not a valid JSON array of exactly ${batch.length} strings. Reply with nothing but that array.`
          : "";
      const rawTrans = await chat(
        [
          { role: "system" as const, content: TRANSLATION_SYSTEM_JSON },
          { role: "user" as const, content: baseUser + retryHint },
        ],
        DEFAULT_CHAT_MODEL,
        { max_tokens: 4096 }
      );
      if (!rawTrans?.trim()) continue;
      const jsonParsed = parseTranslationJsonArray(rawTrans, batch.length);
      if (jsonParsed) return jsonParsed;
      const lineParsed = parseBatchTranslation(rawTrans, batch.length);
      const failedLines = lineParsed.filter((t) => t === "[Translation failed]").length;
      if (failedLines === 0) return lineParsed;
    } catch (err) {
      console.error("Translation batch failed:", err);
    }
  }
  return failAll();
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

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      rawStory = await chat(messages, DEFAULT_CHAT_MODEL, { max_tokens: 6144 });
      const trimmed = rawStory?.trim() ?? "";
      if (trimmed && isPrimarilyHanzi(trimmed)) break;
      if (attempt < maxAttempts) {
        messages.push({ role: "assistant", content: trimmed || "(empty response)" });
        messages.push({
          role: "user",
          content:
            "Your last reply was not valid: it must be written entirely in Chinese characters (汉字), not Pinyin or English. Rewrite the complete story from the beginning with the same topic and length, using 汉字 for all Chinese words.",
        });
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

    const sentences = mergeDialogueFragments(splitIntoSentences(rawStory));
    if (sentences.length === 0) {
      return NextResponse.json(
        { error: "Story generation returned no content. Please try again." },
        { status: 502 }
      );
    }

    const batches: string[][] = [];
    for (let i = 0; i < sentences.length; i += TRANSLATION_BATCH_SIZE) {
      batches.push(sentences.slice(i, i + TRANSLATION_BATCH_SIZE));
    }

    const batchTranslations: string[][] = new Array(batches.length);
    for (let w = 0; w < batches.length; w += TRANSLATION_CONCURRENCY) {
      const wave = batches.slice(w, w + TRANSLATION_CONCURRENCY);
      const waveIdxOffset = w;
      const waveResults = await Promise.all(
        wave.map((batch, wi) => translateSentenceBatch(batch).then((t) => ({ wi: waveIdxOffset + wi, t })))
      );
      for (const { wi, t } of waveResults) {
        batchTranslations[wi] = t;
      }
    }

    const blocks: StoryBlockOut[] = [];
    for (let b = 0; b < batches.length; b++) {
      const batch = batches[b];
      const translations = batchTranslations[b];
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

    const id = saveStory(topic || null, blocks);

    return NextResponse.json({ blocks, id, topic: topic || undefined });
  } catch (e) {
    console.error(e);
    const message = e instanceof Error ? e.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
