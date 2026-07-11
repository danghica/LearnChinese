import { NextRequest, NextResponse } from "next/server";
import { getStoryById } from "@/lib/stories";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id: idParam } = await context.params;
    const id = parseInt(idParam, 10);
    if (Number.isNaN(id) || id <= 0) {
      return NextResponse.json({ error: "Invalid story id" }, { status: 400 });
    }
    const story = getStoryById(id);
    if (!story) {
      return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }
    return NextResponse.json(story);
  } catch (e) {
    console.error(e);
    const message = e instanceof Error ? e.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
