# Chinese vocabulary chat

Single-user web app to practice Chinese with vocabulary-based conversations. The LLM (Groq) responds in Chinese using a selected vocabulary computed from a spaced-frequency algorithm over a word database.

## Setup

1. Install dependencies: `npm install`
2. Copy `.env.local.example` to `.env.local` and set `GROQ_API_KEY` (from [Groq console](https://console.groq.com)).
3. Seed the database: `npm run seed` (creates `data/app.sqlite` and populates words from `data/words-3000.json`).
4. Run dev server: `npm run dev`
5. Open [http://localhost:3000](http://localhost:3000).

## Scripts

- `npm run dev` — start Next.js dev server
- `npm run build` — production build
- `npm run start` — run production server
- `npm run seed` — seed words and initial usage history (run after first clone)
- `npm run test` — run unit and randomized tests

## Data

- **Seed file:** `data/words-3000.json` — array of `{ word, frequency, pinyin, english_translation }`. Frequency is rank (1 = most frequent). Replace with a full 3000-word list (e.g. CEDICT + SUBTLEX) for production.
- **Database:** SQLite at `data/app.sqlite` (or path in `DATABASE_URL`).

## Design

- **New / Continue:** Entry screen; new prompts for optional topic (English), then chat. Continue loads the current (most recent) conversation.
- **Settings:** “New words per conversation” (default 10) stored in localStorage.
- **Vocabulary:** Union of top 250 by spaced-frequency score and top 10 (or setting) most frequent words with no usage history.
- **Clickable words:** Assistant messages are segmented (jieba); click a word to see pinyin and English and record unsuccessful use. If the word is not in the DB, “Not in vocabulary” is shown and no usage is recorded.
