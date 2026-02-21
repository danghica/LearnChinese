import { NextRequest, NextResponse } from "next/server";
import { getSelectedVocabulary } from "@/lib/vocabulary";
import { getWordByWord, getUsageHistoryForWord } from "@/lib/words";

const DEFAULT_NEW_K = 10;
const TOP_N = 250;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const newKParam = searchParams.get("newWordsPerConversation");
    const newWordsPerConversation =
      newKParam !== null ? parseInt(newKParam, 10) : DEFAULT_NEW_K;
    const newK =
      Number.isNaN(newWordsPerConversation) || newWordsPerConversation < 1
        ? DEFAULT_NEW_K
        : Math.min(50, newWordsPerConversation);
    const debugParam = searchParams.get("debug");
    const debug =
      debugParam === "true" || debugParam === "1" || debugParam === "yes";

    const wordList = getSelectedVocabulary({ topN: TOP_N, newK });

    if (!debug) {
      return NextResponse.json({ vocabulary: wordList });
    }

    const vocabularyWithDetails = wordList.map((w) => {
      const wordRow = getWordByWord(w);
      if (!wordRow) {
        return {
          id: 0,
          word: w,
          frequency: 0,
          pinyin: "",
          english_translation: "",
          created_at: null as string | null,
          usage: [] as { timestamp: string; correct: number }[],
        };
      }
      const usage = getUsageHistoryForWord(wordRow.id);
      return {
        id: wordRow.id,
        word: wordRow.word,
        frequency: wordRow.frequency,
        pinyin: wordRow.pinyin,
        english_translation: wordRow.english_translation,
        created_at: wordRow.created_at ?? null,
        usage: usage.map((u) => ({ timestamp: u.timestamp, correct: u.correct })),
      };
    });

    return NextResponse.json({ vocabulary: vocabularyWithDetails });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 }
    );
  }
}
