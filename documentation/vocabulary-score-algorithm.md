# Vocabulary score algorithm (importance with exponential decay)

This document describes how the **importance score** for a word is computed from its failure history. The score is used to sort the word list; the **top 300 words** by this score form the current vocabulary.

## Data

- **usage_history** stores only **failed** uses of a word: one row per failure, with a **day** (integer: days since Unix epoch).
- Events for a word are read from the database; they are **already sorted by day** (no need to sort in code).

## Reference time

- Let **T** be the current day: `T = floor(Date.now() / 86400000)` (days since Unix epoch).
- All ages and weights are computed relative to **T**.

## Step-by-step algorithm

### 1. Events

- For a given word, use all returned events (each row is one failure).
- Denote the event days as \( t_1, t_2, \ldots, t_F \) (F = number of failure events). The database returns them already ordered by day.

### 2. Ages

- For each event at day \( t_i \), compute **age** (days ago):
  \[
  a_i = T - t_i
  \]
- If \( t_i > T \) (future), set \( a_i = 0 \) (clip to non-negative).

### 3. Exponential decay weights

- Choose a decay rate \( \lambda > 0 \). We use **half-life 30 days**:
  \[
  \lambda = \frac{\ln(2)}{30} \approx 0.0231
  \]
- Weight for each event:
  \[
  w_i = e^{-\lambda \, a_i}
  \]
- Recent events (small \( a_i \)) have weight close to 1; old events (large \( a_i \)) have weight close to 0.

### 4. Effective count

- **F_eff** = sum of weights:
  \[
  F_{\text{eff}} = \sum_{i=1}^{F} w_i
  \]
- This replaces the raw count F: many recent failures give a high F_eff; old failures contribute less.

### 5. Weighted mean and standard deviation (clustering)

- **Weighted mean time**:
  \[
  \mu = \frac{\sum_i w_i \, t_i}{F_{\text{eff}}}
  \]
- **Weighted variance**:
  \[
  \text{Var} = \frac{\sum_i w_i \, (t_i - \mu)^2}{F_{\text{eff}}}
  \]
- **Weighted standard deviation** (add a small \( \varepsilon \), e.g. 1e-6, if variance is 0 to avoid division by zero):
  \[
  \sigma = \sqrt{\text{Var}} + \varepsilon
  \]
- Low \( \sigma \) means failures are tightly clustered in time (e.g. many recent failures); high \( \sigma \) means they are spread out.

### 6. Importance score

- **Importance**:
  \[
  \text{importance} = \frac{F_{\text{eff}}}{\sigma}
  \]
- If there are **no failure events** for the word (\( F = 0 \)), set **importance = 0**.
- Interpretation: high importance = many recent failures and/or tightly clustered failures (word needs more practice).

## Vocabulary selection

- Sort **all words** by **importance** (descending).
- When importance is equal (e.g. all words with no failures have importance 0), use **frequency rank** as tie-breaker (ascending: more frequent words first).
- The **top 300** words in this order form the **current vocabulary**.

## Example

- Time in days; **T** = today (e.g. Feb 24, 2026 as day 0 for the example).
- \( \lambda = \ln(2)/30 \approx 0.023 \).
- Failure events at ages 5, 10, 60, 65 days ago (i.e. one recent cluster and one old cluster).

**Ages:** 5, 10, 60, 65.

**Weights:** \( e^{-0.023 \cdot 5} \approx 0.89 \), \( \approx 0.79 \), \( \approx 0.25 \), \( \approx 0.22 \).

**F_eff** \( \approx 0.89 + 0.79 + 0.25 + 0.22 = 2.15 \).

**μ** ≈ weighted average day (pulled toward recent events).

**σ** ≈ 28 (spread from old events, but discounted).

**Importance** \( \approx 2.15 / 28 \approx 0.077 \) (low: old cluster is discounted).

If instead all events are recent (e.g. ages 5, 6, 7, 8):

- Weights all ~0.89; **F_eff** ≈ 3.56; **σ** ≈ 1.3; **Importance** ≈ 3.56/1.3 ≈ 2.74 (high: many recent, clustered failures).

## Constants (implementation)

- **DECAY_HALFLIFE_DAYS** = 30.
- **LAMBDA** = `Math.LN2 / DECAY_HALFLIFE_DAYS`.
- **Current day**: `Math.floor(Date.now() / 86400000)`.
- **ε** (for zero variance): e.g. 1e-6.

## See also

- [Data model](data-model.md) for table schemas and vocabulary selection summary.
- [lib/vocabulary.ts](../lib/vocabulary.ts) for the implementation.
