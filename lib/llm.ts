const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "llama-3.3-70b-versatile";

export type ChatMessage = { role: "user" | "assistant" | "system"; content: string };

export async function chat(messages: ChatMessage[], model: string = DEFAULT_MODEL): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not set. Add it to .env.local (see .env.local.example). Get a key at https://console.groq.com");
  }
  const res = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      max_tokens: 1024,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    if (res.status === 401) {
      throw new Error(
        "Invalid Groq API key. Check GROQ_API_KEY in .env.local and get a valid key at https://console.groq.com"
      );
    }
    throw new Error(`Groq API error: ${res.status} ${err}`);
  }
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content ?? "";
  return content;
}

/**
 * Extract JSON block with misused_words from end of LLM response.
 * Expects format like {"misused_words": ["词1", "词2"]} at end of message.
 */
export function parseMisusedWords(content: string): string[] {
  const match = content.match(/\{[\s\S]*"misused_words"[\s\S]*\}/g);
  if (!match || match.length === 0) return [];
  const last = match[match.length - 1];
  try {
    const parsed = JSON.parse(last) as { misused_words?: string[] };
    return Array.isArray(parsed.misused_words) ? parsed.misused_words : [];
  } catch {
    return [];
  }
}

/**
 * Strip the trailing JSON block from content so we show only the natural language part.
 */
export function stripMisusedJson(content: string): string {
  const match = content.match(/\{[\s\S]*"misused_words"[\s\S]*\}/g);
  if (!match || match.length === 0) return content.trim();
  const last = match[match.length - 1];
  const idx = content.lastIndexOf(last);
  if (idx === -1) return content.trim();
  return content.slice(0, idx).trim();
}
