# Data model

## Tables

- **words:** id, word, frequency (rank 1 = most frequent), pinyin, english_translation
- **usage_history:** word_id, timestamp, correct (0/1)
- **conversations:** id, topic, created_at, updated_at
- **messages:** id, conversation_id, role (user | assistant), content, created_at

## Vocabulary selection

Implemented in [lib/vocabulary.ts](../lib/vocabulary.ts):

- Union of **top N** by spaced-frequency score and **top K** words with no usage history.
- Score formula: `3001 - frequency` plus a “due” bonus (e.g. +1) if there is no successful use in the last 24 hours.
- Options: `topN` (default 250), `newK` (default 10, overridden by “New words per conversation” in settings).
