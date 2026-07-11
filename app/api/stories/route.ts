import { NextRequest, NextResponse } from "next/server";
import { listStories } from "@/lib/stories";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") ?? "50", 10);
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);
    const result = listStories(
      Number.isNaN(limit) ? 50 : limit,
      Number.isNaN(offset) ? 0 : offset
    );
    return NextResponse.json(result);
  } catch (e) {
    console.error(e);
    const message = e instanceof Error ? e.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
