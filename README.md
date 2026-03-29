# Chinese vocabulary chat

Single-user web app to practice Chinese with vocabulary-based conversations. The LLM (Groq) responds in Chinese using a selected vocabulary computed from a spaced-frequency algorithm over a word database.

## Setup

1. Install dependencies: `npm install`
2. Copy `.env.local.example` to `.env.local` and set `GROQ_API_KEY` (from [Groq console](https://console.groq.com)).
3. Seed the database: `npm run seed` (creates `data/app.sqlite` and populates words from `data/words-3000.json`).
4. Run dev server: `npm run dev`
5. Open [http://localhost:3000](http://localhost:3000).

**Node version:** Use **Node 20 or 22 LTS** for this project. Node **25+** often has no prebuilt `better-sqlite3` binary yet, so `npm install` tries to compile from source. If that compile fails with `'climits' file not found`, switch to Node 22 (e.g. `nvm install 22 && nvm use 22`), remove `node_modules`, and run `npm install` again. Alternatively install full **Xcode** (not only Command Line Tools) and ensure `xcode-select -p` points at a valid developer directory.

## Scripts

- `npm run dev` — start Next.js dev server
- `npm run build` — production build
- `npm run start` — run production server
- `npm run seed` — seed words and initial usage history (run after first clone)
- `npm run test` — run unit and randomized tests

## Data

- **Seed file:** `data/words-3000.json` — array of `{ word, frequency, pinyin, english_translation }`. Frequency is rank (1 = most frequent). Replace with a full 3000-word list (e.g. CEDICT + SUBTLEX) for production.
- **CEDICT lookup:** `data/cedict-lookup.json` — optional `{ [word]: { pinyin, english_translation } }` for adding words on click. A minimal set is included; for full dictionary run `npm run build-cedict` (downloads CC-CEDICT and rebuilds the file).
- **Database:** SQLite at `data/app.sqlite` (or path in `DATABASE_URL`).

## Deploy (non-local)

The app uses **SQLite** and **native modules** (better-sqlite3, @node-rs/jieba), so you need a host that gives a **persistent filesystem** and a normal Node runtime (not serverless-only like Vercel’s default).

**Recommended:**

1. **Railway** (https://railway.app)  
   - Connect your GitHub repo.  
   - Add a **Volume** and mount it (e.g. `/data`).  
   - Set env: `DATABASE_URL=/data/app.sqlite`, `GROQ_API_KEY=your_key`.  
   - Build: `npm install && npm run build`.  
   - Start: `npm run start`.  
   - Run seed once (Railway CLI or one-off run): `npm run seed` (with `DATABASE_URL` set so the DB is on the volume).

2. **Render** (https://render.com)  
   - New **Web Service** from repo.  
   - Add **Disk** (persistent), mount path e.g. `/data`.  
   - Env: `DATABASE_URL=/data/app.sqlite`, `GROQ_API_KEY=your_key`.  
   - Build: `npm install && npm run build`.  
   - Start: `npm run start`.  
   - Run `npm run seed` once (e.g. via a one-off job or SSH) so the DB on the disk is seeded.

3. **Fly.io** (https://fly.io)  
   - Use a **volume** for SQLite.  
   - Set `DATABASE_URL` to a path on the volume, set `GROQ_API_KEY`.  
   - Build and run Node; run `npm run seed` once after first deploy.

**Not a good fit:** Vercel’s serverless (no persistent SQLite). To use Vercel you’d need to switch to a hosted DB (e.g. Turso, Neon) and avoid native addons in serverless.

## Design

- **New / Continue:** Entry screen; new prompts for optional topic (English), then chat. Continue loads the current (most recent) conversation.
- **Settings:** “New words per conversation” (default 10) stored in localStorage.
- **Vocabulary:** Union of top 250 by spaced-frequency score and top 10 (or setting) most frequent words with no usage history.
- **Clickable words:** Assistant messages are segmented (jieba); click a word to see pinyin and English and record unsuccessful use. If the word is not in the DB, “Not in vocabulary” is shown and no usage is recorded. (Unknown words are looked up in `data/cedict-lookup.json` and added if found.)
