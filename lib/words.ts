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
  const rows = db.prepare("SELECT id, word_id, day FROM usage_history WHERE word_id = ? ORDER BY day DESC").all(wordId) as UsageEntry[];
  return rows;
}

const MS_PER_DAY = 86400000;

export function recordUsage(wordId: number, correct: boolean): number | null {
  if (correct) return null;
  const db = getDatabase();
  const day = Math.floor(Date.now() / MS_PER_DAY);
  const result = db.prepare("INSERT INTO usage_history (word_id, day) VALUES (?, ?)").run(wordId, day);
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
    const usage = db.prepare("SELECT id, word_id, day FROM usage_history WHERE word_id = ? ORDER BY day DESC").all(word.id) as UsageEntry[];
    return { word, usage };
  });
}

export function getMaxFrequency(): number {
  const db = getDatabase();
  const row = db.prepare("SELECT COALESCE(MAX(frequency), 0) AS max FROM words").get() as { max: number };
  return row.max;
}

export function insertWord(
  word: string,
  pinyin: string,
  english_translation: string,
  frequency: number
): Word {
  const db = getDatabase();
  const result = db
    .prepare(
      "INSERT INTO words (word, frequency, pinyin, english_translation) VALUES (?, ?, ?, ?)"
    )
    .run(word, frequency, pinyin, english_translation);
  const id = result.lastInsertRowid as number;
  const row = db.prepare("SELECT id, word, frequency, pinyin, english_translation, created_at FROM words WHERE id = ?").get(id) as Word;
  return row;
}
