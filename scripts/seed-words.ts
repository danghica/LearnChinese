import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const dbPath = process.env.DATABASE_URL || path.join(process.cwd(), "data", "app.sqlite");
const seedPath = path.join(process.cwd(), "data", "words-3000.json");

interface SeedWord {
  word: string;
  frequency: number;
  pinyin: string;
  english_translation: string;
}

function main() {
  const dataDir = path.dirname(dbPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const raw = fs.readFileSync(seedPath, "utf-8");
  const words: SeedWord[] = JSON.parse(raw);
  if (!Array.isArray(words) || words.length === 0) {
    throw new Error("Seed file must be a non-empty JSON array");
  }
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS words (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      word TEXT NOT NULL UNIQUE,
      frequency INTEGER NOT NULL,
      pinyin TEXT NOT NULL,
      english_translation TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS usage_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      word_id INTEGER NOT NULL REFERENCES words(id),
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      correct INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      topic TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT
    );
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL REFERENCES conversations(id),
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  db.prepare("DELETE FROM usage_history").run();
  db.prepare("DELETE FROM messages").run();
  db.prepare("DELETE FROM conversations").run();
  db.prepare("DELETE FROM words").run();
  const insertWord = db.prepare(
    "INSERT INTO words (word, frequency, pinyin, english_translation) VALUES (?, ?, ?, ?)"
  );
  const insertUsage = db.prepare(
    "INSERT INTO usage_history (word_id, timestamp, correct) VALUES (?, datetime('now'), 1)"
  );
  const insertMany = db.transaction((rows: SeedWord[]) => {
    for (const row of rows) {
      insertWord.run(row.word, row.frequency, row.pinyin, row.english_translation);
    }
  });
  insertMany(words);
  const topForUsage = db.prepare("SELECT id FROM words ORDER BY frequency ASC LIMIT 300").all() as { id: number }[];
  const usageMany = db.transaction((ids: number[]) => {
    for (const id of ids) {
      insertUsage.run(id);
    }
  });
  usageMany(topForUsage.map((r) => r.id));
  db.close();
  console.log("Seeded", words.length, "words and", topForUsage.length, "initial usage_history rows.");
}

main();
