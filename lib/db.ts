import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const dbPath = process.env.DATABASE_URL || path.join(process.cwd(), "data", "app.sqlite");

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!db) {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    db = new Database(dbPath);
    db.pragma("journal_mode = WAL");
    initSchema(db);
  }
  return db;
}

function initSchema(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS words (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      word TEXT NOT NULL UNIQUE,
      frequency INTEGER NOT NULL,
      pinyin TEXT NOT NULL,
      english_translation TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_words_frequency ON words(frequency);
    CREATE INDEX IF NOT EXISTS idx_words_word ON words(word);

    CREATE TABLE IF NOT EXISTS usage_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      word_id INTEGER NOT NULL REFERENCES words(id),
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      correct INTEGER NOT NULL,
      FOREIGN KEY (word_id) REFERENCES words(id)
    );
    CREATE INDEX IF NOT EXISTS idx_usage_word_id ON usage_history(word_id);
    CREATE INDEX IF NOT EXISTS idx_usage_timestamp ON usage_history(timestamp);

    CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      topic TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL REFERENCES conversations(id),
      role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (conversation_id) REFERENCES conversations(id)
    );
    CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
  `);
}

export function getDatabase() {
  return getDb();
}

export type Word = {
  id: number;
  word: string;
  frequency: number;
  pinyin: string;
  english_translation: string;
  created_at?: string;
};

export type UsageEntry = {
  id: number;
  word_id: number;
  timestamp: string;
  correct: number;
};

export type Conversation = {
  id: number;
  topic: string | null;
  created_at: string;
  updated_at: string | null;
};

export type Message = {
  id: number;
  conversation_id: number;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};
