# Implementation details

- **First-turn prompt:** For a new conversation with a single user message, the API rewrites that message into an explicit instruction for the LLM (topic or “Please start the conversation in Chinese…”), so the model always gets a clear first reply. The original user message is still stored in the DB.

- **Usage recording:** Only runs when `messages.length >= 2` and not the first user message (`!isFirstUserMessage`), so the initial English topic/starter is never counted as correct/incorrect.

- **Misused words:** Assistant replies can end with a JSON block `{"misused_words": ["词1", ...]}`; [lib/llm.ts](../lib/llm.ts) parses and strips it; API uses it when recording usage for the last user message.

- **Jieba/dict:** Segmenter is lazy-loaded in [lib/segment.ts](../lib/segment.ts) via `require("@node-rs/jieba")` and `require("@node-rs/jieba/dict")` so the dict is resolved at runtime from node_modules; `@node-rs/jieba` and `@node-rs/jieba/dict` are in server webpack externals.
