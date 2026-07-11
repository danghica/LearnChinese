import { NextRequest, NextResponse } from "next/server";
import { parseStoryBlocks } from "@/lib/stories";
import { buildStoryVocabularyText } from "@/lib/storyVocabulary";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const rawBlocks = body?.blocks;
    if (!Array.isArray(rawBlocks)) {
      return NextResponse.json({ error: "blocks array is required" }, { status: 400 });
    }
    const blocks = parseStoryBlocks(JSON.stringify(rawBlocks));
    if (!blocks) {
      return NextResponse.json({ error: "Invalid story blocks" }, { status: 400 });
    }
    const result = await buildStoryVocabularyText(blocks);
    return NextResponse.json(result);
  } catch (e) {
    console.error(e);
    const message = e instanceof Error ? e.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
