import { NextRequest, NextResponse } from "next/server";
import { chat } from "@/lib/llm";
import { segment } from "@/lib/segment";

const STORY_WORD_COUNT = 1500;
const STORY_SYSTEM_PROMPT = `You are a story teller. Write a story in Chinese using only HSK1, HSK2, and HSK3 grammar and vocabulary. The story must be approximately ${STORY_WORD_COUNT} words long (in total across all sentences). You must respond with **only** the story text in Chinese—no JSON, no explanations, no numbering, no English.`;

/** Split Chinese text into sentences on sentence-ending punctuation and newlines. Keeps delimiter with the sentence. */
function splitIntoSentences(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  // Split after 。？！； or newline; delimiter stays with previous segment (lookbehind)
  const parts = trimmed.split(/(?<=[。？！；\n])/);
  return parts.map((s) => s.trim()).filter(Boolean);
}

const TRANSLATION_SYSTEM = "You are a translator. Reply with only the English translation of the given Chinese sentence, nothing else—no quotes, no explanation.";

/** Strip surrounding quotes if the model wrapped the translation. */
function normalizeTranslation(raw: string): string {
  const s = raw.trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'")))
    return s.slice(1, -1).trim();
  return s;
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
    const userPrompt = `Tell me a story with the following topic using Chinese language: ${topicPhrase}. The story must be approximately ${STORY_WORD_COUNT} words long. Use HSK1, HSK2, and HSK3 level grammar and vocabulary. Reply with only the story text in Chinese, nothing else.`;

    const messages = [
      { role: "system" as const, content: STORY_SYSTEM_PROMPT },
      { role: "user" as const, content: userPrompt },
    ];
    const maxAttempts = 3;
    const storyModel = "llama-3.1-8b-instant";

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      rawStory = await chat(messages, storyModel, { max_tokens: 8192 });
      if (rawStory?.trim()) break;
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 800 * attempt));
      }
    }

    if (!rawStory?.trim()) {
      return NextResponse.json(
        { error: "Story generation returned no content. Please try again." },
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
    for (const chinese of sentences) {
      let english = "[Translation failed]";
      try {
        const transMessages = [
          { role: "system" as const, content: TRANSLATION_SYSTEM },
          { role: "user" as const, content: `Translate to English: ${chinese}` },
        ];
        const rawTrans = await chat(transMessages, storyModel, { max_tokens: 128 });
        if (rawTrans?.trim()) {
          english = normalizeTranslation(rawTrans);
        }
      } catch (err) {
        console.error("Translation failed for sentence:", chinese, err);
        // Keep placeholder so the rest of the story still displays
      }

      const chineseWords = segment(chinese);
      const chineseComma = chineseWords.join(",");

      blocks.push({
        chinese,
        english,
        chineseComma,
        chineseWords,
      });
    }

    return NextResponse.json({ blocks });
  } catch (e) {
    console.error(e);
    const message = e instanceof Error ? e.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
