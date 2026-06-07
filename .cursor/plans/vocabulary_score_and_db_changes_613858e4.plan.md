---
name: Vocabulary score and DB changes
overview: Change vocabulary to record only failed word uses with day-level timestamps, replace the score with an exponential-decay importance formula, define current vocabulary as the top 300 words when sorted by this score, and update the LLM prompt to strongly urge using this vocabulary plus any HSK1/2/3 (no explicit HSK lists).
todos: []
isProject: false
---

# Vocabulary: Failures-Only Storage, Decay-Based Score, Top 300

## Current behavior (brief)

- **lib/words.ts**: `recordUsage(wordId, correct)` inserts into `usage_history` (word_id, timestamp TEXT datetime, correct 0/1) for every use.
- **lib/db.ts**: `usage_history` has `timestamp TEXT`, `correct INTEGER`.
- **lib/vocabulary.ts**: `scoreWord` uses `(3001 - frequency) + need_score`; selection is **top N (250) by score + top K (10) new words** by frequency.

## Target behavior

1. **DB**: Store only **failed** instances; **timestamp** as **days** (integer days since epoch).
2. **Score**: **Importance** = F_eff / σ (exponential decay over failure events + clustering).
3. **Vocabulary**: **Sort all words by this score** (descending). The **top 300 words** form the current vocabulary. Use frequency as tie-breaker when score is equal (e.g. same importance → prefer lower frequency rank).

---

## Vocabulary selection (updated)

- **Single criterion**: Sort the full word list by **importance** (descending). When importance is equal (e.g. all words with no failures have importance 0), sort by **frequency rank** ascending (more frequent words first).
- **Current vocabulary** = **top 300** in this sorted order. No separate “top N + top K new” union; the 300 is the union.
- Constant: `VOCABULARY_SIZE = 300` (configurable if desired). Replace current `topN`/`newK` with this single cap.

---

## 1. Schema and data model

- **usage_history**: one row per **failure**; columns: `id`, `word_id`, `day` (INTEGER, days since Unix epoch) only. Do not keep a `correct` column; no migration from old data is required.
- **lib/db.ts** `initSchema`: create the new table (id, word_id, day) only.
- **lib/words.ts**: `recordUsage(wordId, correct)` inserts only when `correct === false`; write `day = floor(now / 86400)` (or equivalent). `getUsageHistoryForWord` returns `{ id, word_id, day }[]`.

---

## 2. Score algorithm (lib/vocabulary.ts)

- **Importance** from failure days: reference day T = floor(Date.now()/86400000); events from the DB are already sorted by day. For each event day t_i: age a_i = T - t_i (≥ 0); weight w_i = exp(-λ a_i), λ = ln(2)/30; F_eff = Σ w_i; μ = (Σ w_i t_i)/F_eff; σ = sqrt(Σ w_i (t_i - μ)² / F_eff) + ε; **importance = F_eff / σ**. No failures ⇒ importance = 0. See **documentation/vocabulary-score-algorithm.md** for the full algorithm description.
- **computeSelectedVocabulary**: sort all words by (importance desc, frequency asc). Take **top 300**. Expose option e.g. `topWords?: number` default 300.

---

## 3. LLM prompt: vocabulary and HSK levels

- **Strong emphasis**: The system prompt must **strongly urge** the LLM to use the provided (top 300) vocabulary **whenever possible** in its Chinese responses.
- **Allowed extra vocabulary**: The LLM may also use any **HSK1, HSK2, and HSK3** words. Do **not** ship explicit word lists for HSK levels — the model already knows what HSK1, HSK2, and HSK3 mean (standard Chinese proficiency levels), so the prompt only needs to mention them by name.
- **Implementation** in **app/api/chat/route.ts**:
  - Replace current "vocabulary + HSK2" wording with: (1) a strong instruction to prefer the provided vocabulary list whenever possible; (2) permission to use any HSK1, HSK2, and HSK3 vocabulary as needed.
  - Apply in both `buildAcknowledgeSystemPrompt` and `buildSystemPrompt` (and any other places that inject vocabulary). Example phrasing: *"Strongly prefer using words from this vocabulary list whenever possible. You may also use any HSK1, HSK2, or HSK3 vocabulary as needed."*

---

## 4. Recording and APIs

- **app/api/chat/route.ts**: Do not record when `recordedAllCorrect`; record only failures in the misused loop.
- **app/api/usage/route.ts**: Insert only when `correct === false`.
- **GET /api/words**, **GET /api/vocabulary**: Return usage as failure days (e.g. `day` or formatted date). **app/words/page.tsx**: Display “Failed on: &lt;date&gt;”.

---

## 5. Constants and call sites

- **VOCABULARY_SIZE = 300** in lib/vocabulary.ts (and optionally in app/api/chat/route.ts / app/api/vocabulary/route.ts when calling getSelectedVocabulary).
- Replace `topN: 250`, `newK: 10` with a single `topWords: 300` (or use default 300 everywhere).

---

## 6. Files to touch

| Area | File | Changes |
|------|------|---------|
| Schema/types | lib/db.ts | New usage_history (id, word_id, day only; no correct; no migration), UsageEntry type |
| Words layer | lib/words.ts | recordUsage only on failure, write day; getUsageHistoryForWord returns day |
| Score + selection | lib/vocabulary.ts | importance formula; sort by (importance desc, frequency asc); top 300 = vocabulary |
| Chat | app/api/chat/route.ts | No record when all correct; record only failures; use top 300; **prompt: strongly urge provided vocabulary + HSK1/2/3 (no explicit lists)** |
| Usage API | app/api/usage/route.ts | Insert only when correct === false |
| Words API | app/api/words/route.ts, app/api/words/[id]/route.ts | usage as failure days |
| Vocabulary API | app/api/vocabulary/route.ts | top 300, usage with day |
| UI | app/words/page.tsx | New usage shape |
| Seed | scripts/seed-words.ts | New schema; seeding usage_history no longer required |
| Tests | tests/vocabulary.test.ts | importance score; selection = top 300 by score |
| Docs | documentation/data-model.md | failure-only, day, top 300; reference vocabulary-score-algorithm.md |
| Docs | documentation/vocabulary-score-algorithm.md | **New file**: full description of the importance (decay-based) algorithm |

---

## 7. Data flow (summary)

- **Recording**: Only failures → `usage_history(word_id, day)`.
- **Scoring**: Per word: failure days → F_eff, μ, σ → importance = F_eff/σ.
- **Vocabulary**: Sort by (importance ↓, frequency ↑) → **top 300** = current vocabulary.
