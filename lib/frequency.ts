/**
 * Frequency lookup for Chinese words.
 * Returns frequency rank (1 = most frequent) from an optional data file, or null.
 * If null, the API uses a fallback (e.g. MAX(frequency)+1 from DB).
 * To enable lookup: add data/word-frequency.json with format { "word": rank } (rank number, 1 = most frequent).
 */
import path from "path";
import fs from "fs";

let cache: Record<string, number> | null = null;

function loadFrequencyMap(): Record<string, number> {
  if (cache !== null) return cache;
  try {
    const p = path.join(process.cwd(), "data", "word-frequency.json");
    if (!fs.existsSync(p)) {
      cache = {};
      return cache;
    }
    const raw = fs.readFileSync(p, "utf-8");
    const data = JSON.parse(raw) as Record<string, number>;
    cache = typeof data === "object" && data !== null ? data : {};
    return cache;
  } catch {
    cache = {};
    return cache;
  }
}

export function lookupFrequency(word: string): number | null {
  if (!word || !word.trim()) return null;
  const map = loadFrequencyMap();
  const rank = map[word.trim()];
  return typeof rank === "number" && Number.isInteger(rank) && rank >= 1 ? rank : null;
}
