import { NextRequest, NextResponse } from "next/server";
import { getWordByWord, getAllWords } from "@/lib/words";
import { getUsageHistoryForWord } from "@/lib/words";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const wordParam = searchParams.get("word");
    if (wordParam) {
      const word = getWordByWord(wordParam);
      if (!word) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      const usage = getUsageHistoryForWord(word.id);
      return NextResponse.json({
        id: word.id,
        word: word.word,
        frequency: word.frequency,
        pinyin: word.pinyin,
        english_translation: word.english_translation,
        usage_history: usage.map((u) => ({ timestamp: u.timestamp, correct: u.correct === 1 })),
      });
    }
    const words = getAllWords();
    return NextResponse.json(
      words.map((w) => ({
        id: w.id,
        word: w.word,
        frequency: w.frequency,
        pinyin: w.pinyin,
        english_translation: w.english_translation,
      }))
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
