import { NextRequest, NextResponse } from "next/server";
import { getWordById, getUsageHistoryForWord } from "@/lib/words";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = parseInt((await params).id, 10);
    if (Number.isNaN(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    const word = getWordById(id);
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
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
