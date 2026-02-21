import { NextRequest, NextResponse } from "next/server";
import { getWordByWord, getWordsWithUsage } from "@/lib/words";
import { getUsageHistoryForWord } from "@/lib/words";
import { scoreWord } from "@/lib/vocabulary";

const DEFAULT_LIMIT = 100;
const DEFAULT_OFFSET = 0;

function matchesSearch(
  word: string,
  pinyin: string,
  english_translation: string,
  search: string
): boolean {
  const s = search.toLowerCase().trim();
  if (!s) return true;
  return (
    word.toLowerCase().includes(s) ||
    pinyin.toLowerCase().includes(s) ||
    english_translation.toLowerCase().includes(s)
  );
}

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
    const data = getWordsWithUsage();
    const withScores = data.map(({ word, usage }) => ({
      word,
      score: scoreWord(word, usage),
    }));
    let filtered = withScores;
    const searchParam = searchParams.get("search");
    if (searchParam && searchParam.trim()) {
      const s = searchParam.trim();
      filtered = withScores.filter(({ word }) =>
        matchesSearch(word.word, word.pinyin, word.english_translation, s)
      );
    }
    filtered.sort((a, b) => b.score - a.score);
    const total = filtered.length;
    const limitParam = searchParams.get("limit");
    const offsetParam = searchParams.get("offset");
    const limit =
      limitParam !== null
        ? Math.max(1, Math.min(500, parseInt(limitParam, 10) || DEFAULT_LIMIT))
        : DEFAULT_LIMIT;
    const offset =
      offsetParam !== null
        ? Math.max(0, parseInt(offsetParam, 10) || DEFAULT_OFFSET)
        : DEFAULT_OFFSET;
    const slice = filtered.slice(offset, offset + limit);
    const words = slice.map(({ word, score }) => ({
      id: word.id,
      word: word.word,
      frequency: word.frequency,
      pinyin: word.pinyin,
      english_translation: word.english_translation,
      score,
    }));
    return NextResponse.json({ words, total });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
