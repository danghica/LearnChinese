import { getDatabase, type Word, type UsageEntry } from "./db";

export function getWordById(id: number): Word | null {
  const db = getDatabase();
  const row = db.prepare("SELECT id, word, frequency, pinyin, english_translation, created_at FROM words WHERE id = ?").get(id) as Word | undefined;
  return row ?? null;
}

export function getWordByWord(word: string): Word | null {
  const db = getDatabase();
  const row = db.prepare("SELECT id, word, frequency, pinyin, english_translation, created_at FROM words WHERE word = ?").get(word) as Word | undefined;
  return row ?? null;
}

export function getUsageHistoryForWord(wordId: number): UsageEntry[] {
  const db = getDatabase();
  const rows = db.prepare("SELECT id, word_id, timestamp, correct FROM usage_history WHERE word_id = ? ORDER BY timestamp DESC").all(wordId) as UsageEntry[];
  return rows;
}

export function recordUsage(wordId: number, correct: boolean): number {
  const db = getDatabase();
  const result = db.prepare("INSERT INTO usage_history (word_id, timestamp, correct) VALUES (?, datetime('now'), ?)").run(wordId, correct ? 1 : 0);
  return result.lastInsertRowid as number;
}

export function getAllWords(): Word[] {
  const db = getDatabase();
  const rows = db.prepare("SELECT id, word, frequency, pinyin, english_translation, created_at FROM words ORDER BY frequency ASC").all() as Word[];
  return rows;
}

export function getWordsWithUsage(): { word: Word; usage: UsageEntry[] }[] {
  const words = getAllWords();
  const db = getDatabase();
  return words.map((word) => {
    const usage = db.prepare("SELECT id, word_id, timestamp, correct FROM usage_history WHERE word_id = ? ORDER BY timestamp DESC").all(word.id) as UsageEntry[];
    return { word, usage };
  });
}
