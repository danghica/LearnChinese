import { NextRequest, NextResponse } from "next/server";
import { recordUsage, getWordById, getWordByWord } from "@/lib/words";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { wordId, word: wordStr, correct } = body as { wordId?: number; word?: string; correct?: boolean };
    if (typeof correct !== "boolean") {
      return NextResponse.json({ error: "correct is required and must be boolean" }, { status: 400 });
    }
    let id: number | null = null;
    if (typeof wordId === "number") {
      const w = getWordById(wordId);
      if (w) id = w.id;
    }
    if (id == null && typeof wordStr === "string") {
      const w = getWordByWord(wordStr);
      if (w) id = w.id;
    }
    if (id == null) {
      return NextResponse.json({ error: "Word not found" }, { status: 400 });
    }
    const usageId = recordUsage(id, correct);
    return NextResponse.json({ id: usageId }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
