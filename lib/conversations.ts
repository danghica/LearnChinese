import { getDatabase, type Conversation, type Message } from "./db";

export function getCurrentConversation(): {
  id: number;
  topic: string | null;
  created_at: string;
  updated_at: string | null;
  messages: Message[];
} | null {
  const db = getDatabase();
  const conv = db
    .prepare(
      "SELECT id, topic, created_at, updated_at FROM conversations ORDER BY COALESCE(updated_at, created_at) DESC LIMIT 1"
    )
    .get() as Conversation | undefined;
  if (!conv) return null;
  const messages = db
    .prepare("SELECT id, conversation_id, role, content, created_at FROM messages WHERE conversation_id = ? ORDER BY created_at ASC")
    .all(conv.id) as Message[];
  return {
    id: conv.id,
    topic: conv.topic,
    created_at: conv.created_at,
    updated_at: conv.updated_at,
    messages,
  };
}

export function createConversation(topic?: string | null): number {
  const db = getDatabase();
  const result = db.prepare("INSERT INTO conversations (topic, created_at, updated_at) VALUES (?, datetime('now'), datetime('now'))").run(topic ?? null);
  return result.lastInsertRowid as number;
}

export function appendMessage(conversationId: number, role: "user" | "assistant", content: string): number {
  const db = getDatabase();
  db.prepare("UPDATE conversations SET updated_at = datetime('now') WHERE id = ?").run(conversationId);
  const result = db.prepare("INSERT INTO messages (conversation_id, role, content, created_at) VALUES (?, ?, ?, datetime('now'))").run(conversationId, role, content);
  return result.lastInsertRowid as number;
}

export function getConversationById(id: number): { id: number; topic: string | null; messages: Message[] } | null {
  const db = getDatabase();
  const conv = db.prepare("SELECT id, topic, created_at, updated_at FROM conversations WHERE id = ?").get(id) as Conversation | undefined;
  if (!conv) return null;
  const messages = db
    .prepare("SELECT id, conversation_id, role, content, created_at FROM messages WHERE conversation_id = ? ORDER BY created_at ASC")
    .all(conv.id) as Message[];
  return {
    id: conv.id,
    topic: conv.topic,
    messages,
  };
}
