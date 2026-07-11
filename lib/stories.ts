import { getDatabase } from "./db";
import type { StoryBlock } from "./storyStorage";

const PREVIEW_MAX_LEN = 120;

export function parseStoryBlocks(raw: string): StoryBlock[] | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    for (const block of parsed) {
      if (
        typeof block !== "object" ||
        block === null ||
        typeof (block as StoryBlock).chinese !== "string" ||
        typeof (block as StoryBlock).english !== "string"
      ) {
        return null;
      }
    }
    return parsed as StoryBlock[];
  } catch {
    return null;
  }
}

function previewFromBlocks(blocks: StoryBlock[]): string {
  const first = blocks[0];
  const text = first.english?.trim() || first.chinese?.trim() || "";
  if (text.length <= PREVIEW_MAX_LEN) return text;
  return `${text.slice(0, PREVIEW_MAX_LEN)}…`;
}

export function saveStory(topic: string | null | undefined, blocks: StoryBlock[]): number {
  const db = getDatabase();
  const result = db
    .prepare("INSERT INTO stories (topic, blocks_json, created_at) VALUES (?, ?, datetime('now'))")
    .run(topic?.trim() || null, JSON.stringify(blocks));
  return result.lastInsertRowid as number;
}

export function listStories(
  limit = 50,
  offset = 0
): { stories: { id: number; topic: string | null; created_at: string; preview: string }[]; total: number } {
  const db = getDatabase();
  const safeLimit = Math.max(1, Math.min(200, limit));
  const safeOffset = Math.max(0, offset);
  const totalRow = db.prepare("SELECT COUNT(*) AS count FROM stories").get() as { count: number };
  const rows = db
    .prepare(
      "SELECT id, topic, blocks_json, created_at FROM stories ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?"
    )
    .all(safeLimit, safeOffset) as { id: number; topic: string | null; blocks_json: string; created_at: string }[];

  const stories = rows
    .map((row) => {
      const blocks = parseStoryBlocks(row.blocks_json);
      if (!blocks) return null;
      return {
        id: row.id,
        topic: row.topic,
        created_at: row.created_at,
        preview: previewFromBlocks(blocks),
      };
    })
    .filter((s): s is NonNullable<typeof s> => s !== null);

  return { stories, total: totalRow.count };
}

export function getStoryById(
  id: number
): { id: number; topic: string | null; blocks: StoryBlock[]; created_at: string } | null {
  if (!Number.isFinite(id) || id <= 0) return null;
  const db = getDatabase();
  const row = db
    .prepare("SELECT id, topic, blocks_json, created_at FROM stories WHERE id = ?")
    .get(id) as { id: number; topic: string | null; blocks_json: string; created_at: string } | undefined;
  if (!row) return null;
  const blocks = parseStoryBlocks(row.blocks_json);
  if (!blocks) return null;
  return {
    id: row.id,
    topic: row.topic,
    blocks,
    created_at: row.created_at,
  };
}
