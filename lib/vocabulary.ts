import { getWordsWithUsage } from "./words";
import type { Word } from "./db";

const DEFAULT_TOP_N = 250;
const DEFAULT_NEW_K = 10;
const DUE_HOURS = 24;

export type WordWithUsage = { word: Word; usage: { timestamp: string; correct: number }[] };

/**
 * need_score: 0 if word has a successful use within last 24h, else 1.
 * score = (3001 - frequency_rank) + need_score (higher = more preferred).
 */
export function scoreWord(word: Word, usage: { timestamp: string; correct: number }[]): number {
  const base = 3001 - word.frequency;
  const lastSuccess = usage.find((u) => u.correct === 1);
  if (!lastSuccess) return base + 1;
  const lastTime = new Date(lastSuccess.timestamp).getTime();
  const hoursAgo = (Date.now() - lastTime) / (1000 * 60 * 60);
  const needScore = hoursAgo >= DUE_HOURS ? 1 : 0;
  return base + needScore;
}

/**
 * Pure function: selected vocabulary from word+usage data.
 * (1) Top N by spaced-frequency score (2) Top K with no usage, by frequency rank.
 */
export function computeSelectedVocabulary(
  data: WordWithUsage[],
  options: { topN?: number; newK?: number } = {}
): string[] {
  const topN = options.topN ?? DEFAULT_TOP_N;
  const newK = options.newK ?? DEFAULT_NEW_K;
  const withScores = data.map(({ word, usage }) => ({
    word,
    score: scoreWord(word, usage),
    hasUsage: usage.length > 0,
  }));
  const byScore = [...withScores].sort((a, b) => b.score - a.score);
  const spacedSet = new Set(byScore.slice(0, topN).map((x) => x.word.word));
  const noUsage = withScores.filter((x) => !x.hasUsage).sort((a, b) => a.word.frequency - b.word.frequency);
  noUsage.slice(0, newK).map((x) => x.word.word).forEach((w) => spacedSet.add(w));
  return Array.from(spacedSet);
}

/**
 * Selected vocabulary from DB (uses getWordsWithUsage).
 */
export function getSelectedVocabulary(options: { topN?: number; newK?: number } = {}): string[] {
  const data = getWordsWithUsage();
  return computeSelectedVocabulary(data, options);
}
