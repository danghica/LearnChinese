import { NextRequest, NextResponse } from "next/server";
import { getSelectedVocabulary } from "@/lib/vocabulary";
import { getWordByWord, getUsageHistoryForWord } from "@/lib/words";

const TOP_WORDS = 300;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const debugParam = searchParams.get("debug");
    const debug =
      debugParam === "true" || debugParam === "1" || debugParam === "yes";

    const wordList = getSelectedVocabulary({ topWords: TOP_WORDS });

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
          usage: [] as { day: number }[],
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
        usage: usage.map((u) => ({ day: u.day })),
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
