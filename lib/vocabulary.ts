import { getWordsWithUsage } from "./words";
import type { Word } from "./db";
import type { UsageEntry } from "./db";

const VOCABULARY_SIZE = 300;
const DECAY_HALFLIFE_DAYS = 30;
const LAMBDA = Math.LN2 / DECAY_HALFLIFE_DAYS;
const SIGMA_EPSILON = 1e-6;
const MS_PER_DAY = 86400000;

export type WordWithUsage = { word: Word; usage: UsageEntry[] };

/**
 * Current day (days since Unix epoch).
 */
function currentDay(): number {
  return Math.floor(Date.now() / MS_PER_DAY);
}

/**
 * Importance score from failure events: exponential decay + clustering.
 * importance = F_eff / σ; no failures => 0.
 * See documentation/vocabulary-score-algorithm.md.
 */
export function scoreWord(word: Word, usage: { day: number }[]): number {
  if (usage.length === 0) return 0;
  const T = currentDay();
  const ages = usage.map((u) => Math.max(0, T - u.day));
  const weights = ages.map((a) => Math.exp(-LAMBDA * a));
  const F_eff = weights.reduce((s, w) => s + w, 0);
  if (F_eff <= 0) return 0;
  const days = usage.map((u) => u.day);
  const mu = days.reduce((s, t, i) => s + weights[i] * t, 0) / F_eff;
  const variance =
    days.reduce((s, t, i) => s + weights[i] * (t - mu) ** 2, 0) / F_eff;
  const sigma = Math.sqrt(Math.max(0, variance)) + SIGMA_EPSILON;
  return F_eff / sigma;
}

/**
 * Selected vocabulary: top N words by importance (desc), tie-break by frequency (asc).
 * N = topWords (default 300).
 */
export function computeSelectedVocabulary(
  data: WordWithUsage[],
  options: { topWords?: number } = {}
): string[] {
  const topWords = options.topWords ?? VOCABULARY_SIZE;
  const withScores = data.map(({ word, usage }) => ({
    word,
    importance: scoreWord(word, usage),
  }));
  const sorted = [...withScores].sort((a, b) => {
    if (b.importance !== a.importance) return b.importance - a.importance;
    return a.word.frequency - b.word.frequency;
  });
  return sorted.slice(0, topWords).map((x) => x.word.word);
}

/**
 * Selected vocabulary from DB (uses getWordsWithUsage).
 */
export function getSelectedVocabulary(options: { topWords?: number } = {}): string[] {
  const data = getWordsWithUsage();
  return computeSelectedVocabulary(data, options);
}
