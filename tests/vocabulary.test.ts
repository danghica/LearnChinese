import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  computeSelectedVocabulary,
  scoreWord,
  type WordWithUsage,
} from "@/lib/vocabulary";
import type { Word, UsageEntry } from "@/lib/db";

const MS_PER_DAY = 86400000;

function usageDays(days: number[]): UsageEntry[] {
  return days.map((day, i) => ({ id: i + 1, word_id: 0, day }));
}

function word(id: number, frequency: number): Word {
  return {
    id,
    word: `w${id}`,
    frequency,
    pinyin: "x",
    english_translation: "y",
  };
}

function today(): number {
  return Math.floor(Date.now() / MS_PER_DAY);
}

describe("scoreWord", () => {
  it("returns 0 when no failures", () => {
    const w = word(1, 1);
    expect(scoreWord(w, [])).toBe(0);
  });

  it("returns positive importance for one failure today", () => {
    const w = word(1, 1);
    const usage = usageDays([today()]);
    expect(scoreWord(w, usage)).toBeGreaterThan(0);
  });

  it("returns higher importance for recent clustered failures than for old scattered ones", () => {
    const w = word(1, 1);
    const T = today();
    const recentCluster = usageDays([T - 5, T - 6, T - 7, T - 8]);
    const oldCluster = usageDays([T - 60, T - 65]);
    const scoreRecent = scoreWord(w, recentCluster);
    const scoreOld = scoreWord(w, oldCluster);
    expect(scoreRecent).toBeGreaterThan(scoreOld);
  });

  it("returns 0 for word with no usage", () => {
    const w = word(1, 1);
    expect(scoreWord(w, [])).toBe(0);
  });
});

describe("computeSelectedVocabulary", () => {
  it("returns at most topWords unique words", () => {
    const data: WordWithUsage[] = [
      { word: word(1, 1), usage: [] },
      { word: word(2, 2), usage: [] },
      { word: word(3, 3), usage: [] },
    ];
    const out = computeSelectedVocabulary(data, { topWords: 2 });
    expect(out.length).toBeLessThanOrEqual(2);
    expect(new Set(out).size).toBe(out.length);
  });

  it("includes highest-frequency (lowest rank) words when all have zero importance", () => {
    const data: WordWithUsage[] = [
      { word: word(1, 1), usage: [] },
      { word: word(2, 2), usage: [] },
      { word: word(3, 3), usage: [] },
    ];
    const out = computeSelectedVocabulary(data, { topWords: 2 });
    expect(out).toContain("w1");
    expect(out).toContain("w2");
  });

  it("respects topWords", () => {
    const data: WordWithUsage[] = Array.from({ length: 100 }, (_, i) => ({
      word: word(i + 1, i + 1),
      usage: [],
    }));
    const out = computeSelectedVocabulary(data, { topWords: 5 });
    expect(out.length).toBe(5);
  });

  it("does not crash on empty data", () => {
    expect(computeSelectedVocabulary([])).toEqual([]);
  });

  it("prefers words with higher importance", () => {
    const T = today();
    const data: WordWithUsage[] = [
      { word: word(1, 1), usage: [] },
      { word: word(2, 2), usage: usageDays([T, T - 1]) },
      { word: word(3, 3), usage: [] },
    ];
    const out = computeSelectedVocabulary(data, { topWords: 2 });
    expect(out[0]).toBe("w2");
    expect(out).toContain("w2");
  });
});

describe("computeSelectedVocabulary (property-based)", () => {
  it("vocabulary size is at most topWords and all words are from data", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.tuple(fc.integer(1, 100), fc.integer(1, 3000)),
          { minLength: 1, maxLength: 40 }
        ).filter((pairs) => new Set(pairs.map(([, f]) => f)).size === pairs.length),
        fc.integer({ min: 1, max: 50 }),
        (pairs, topWords) => {
          const data: WordWithUsage[] = pairs.map(([id, f], i) => ({
            word: word(id + i * 1000, f),
            usage: [],
          }));
          const out = computeSelectedVocabulary(data, { topWords });
          const wordSet = new Set(data.map((d) => d.word.word));
          expect(out.length).toBeLessThanOrEqual(topWords);
          for (const w of out) {
            expect(wordSet.has(w)).toBe(true);
          }
          expect(out.length).toBe(new Set(out).size);
        }
      ),
      { numRuns: 30 }
    );
  });
});
