# Stack

- **Framework:** Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Database:** SQLite via better-sqlite3 ([lib/db.ts](../lib/db.ts)), file at `data/app.sqlite` (or `DATABASE_URL`)
- **LLM:** Groq API ([lib/llm.ts](../lib/llm.ts)), model `llama-3.3-70b-versatile`
- **Segmentation:** @node-rs/jieba ([lib/segment.ts](../lib/segment.ts)) — lazy-loaded with default dict; [next.config.mjs](../next.config.mjs) externals for `@node-rs/jieba` and `@node-rs/jieba/dict`
- **Word list:** 3000 words from chinese-lexicon (SUBTLEX-CH + CEDICT), [data/words-3000.json](../data/words-3000.json); regenerated via `npm run generate-words` ([scripts/generate-words-3000.cjs](../scripts/generate-words-3000.cjs))
