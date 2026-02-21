# API routes

| Route | Method | Purpose |
|-------|--------|--------|
| [app/api/chat/route.ts](../app/api/chat/route.ts) | POST | Chat with LLM; builds system prompt (new vs continue), sends explicit first-turn user prompt when new; records usage only for non–first-turn user messages (so topic/starter in English is never scored). Returns content, conversationId, messageId, segments, optional misused_words. |
| [app/api/conversations/current/route.ts](../app/api/conversations/current/route.ts) | GET | Current (most recent) conversation and messages for Continue. |
| [app/api/words/route.ts](../app/api/words/route.ts) | GET | **Lookup:** `?word=X` — one word + usage_history. **List (inspect):** no `word` — returns `{ words, total }` sorted by spaced repetition score (desc). Params: `limit` (default 100), `offset` (default 0), `search` (optional filter on word/pinyin/english_translation). Used by /words page. |
| [app/api/words/[id]/route.ts](../app/api/words/[id]/route.ts) | GET | Word by id. |
| [app/api/usage/route.ts](../app/api/usage/route.ts) | POST | Record usage (wordId, correct). |
| [app/api/vocabulary/route.ts](../app/api/vocabulary/route.ts) | GET | Current working vocabulary (same algorithm as chat). Query: `newWordsPerConversation` (default 10), `debug` (default false). If `debug=false`: returns `{ vocabulary: string[] }`. If `debug=true`: returns `{ vocabulary: Array<{ id, word, frequency, pinyin, english_translation, created_at?, usage: { timestamp, correct }[] }> }`. Used by the /vocabulary page (opened from Settings). |
