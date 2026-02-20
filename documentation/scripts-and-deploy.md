# Scripts and deploy

## Scripts

- `npm run dev` — Next.js dev server
- `npm run build` — Production build
- `npm run start` — Production server
- `npm run seed` — Seed words and initial usage history (creates/overwrites DB from [data/words-3000.json](../data/words-3000.json))
- `npm run generate-words` — Regenerate [data/words-3000.json](../data/words-3000.json) from chinese-lexicon
- `npm run test` — Unit and property-based tests

See [README.md](../README.md) for full list.

## Deploy

The app needs **persistent storage** for SQLite and a **Node runtime** (not serverless-only). The main [README.md](../README.md) recommends:

- **Railway** — Volume mounted (e.g. `/data`), `DATABASE_URL=/data/app.sqlite`, `GROQ_API_KEY`; run `npm run seed` once.
- **Render** — Web Service with Disk; same env and seed step.
- **Fly.io** — Volume for SQLite; same idea.

**Vercel** is a poor fit without switching to a hosted DB (e.g. Turso, Neon) and avoiding native addons in serverless.
