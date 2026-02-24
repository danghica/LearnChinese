# Data model

## Tables

- **words:** id, word, frequency (rank 1 = most frequent), pinyin, english_translation
- **usage_history:** id, word_id, day (INTEGER, days since Unix epoch). One row per **failed** use of a word; only failures are recorded.
- **conversations:** id, topic, created_at, updated_at
- **messages:** id, conversation_id, role (user | assistant), content, created_at

## Vocabulary selection

Implemented in [lib/vocabulary.ts](../lib/vocabulary.ts):

- **Current vocabulary** = top **300** words when sorted by **importance score** (descending), with frequency rank as tie-breaker (ascending).
- Importance is computed from failure events only, using exponential decay and clustering. See [vocabulary-score-algorithm.md](vocabulary-score-algorithm.md) for the full algorithm.
- Option: `topWords` (default 300).
