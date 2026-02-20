import { NextResponse } from "next/server";
import { getCurrentConversation } from "@/lib/conversations";

export async function GET() {
  try {
    const conv = getCurrentConversation();
    if (!conv) {
      return NextResponse.json({ id: null, topic: null, messages: [] });
    }
    return NextResponse.json({
      id: String(conv.id),
      topic: conv.topic ?? undefined,
      messages: conv.messages.map((m) => ({
        id: String(m.id),
        role: m.role,
        content: m.content,
      })),
      createdAt: conv.created_at,
      updatedAt: conv.updated_at ?? undefined,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
