# API routes

| Route | Method | Purpose |
|-------|--------|--------|
| [app/api/chat/route.ts](../app/api/chat/route.ts) | POST | Chat with LLM; builds system prompt (new vs continue), sends explicit first-turn user prompt when new; records usage only for non–first-turn user messages (so topic/starter in English is never scored). Returns content, conversationId, messageId, segments, optional misused_words. |
| [app/api/conversations/current/route.ts](../app/api/conversations/current/route.ts) | GET | Current (most recent) conversation and messages for Continue. |
| [app/api/words/route.ts](../app/api/words/route.ts) | GET | List words or lookup by `?word=`. |
| [app/api/words/[id]/route.ts](../app/api/words/[id]/route.ts) | GET | Word by id. |
| [app/api/usage/route.ts](../app/api/usage/route.ts) | POST | Record usage (wordId, correct). |
