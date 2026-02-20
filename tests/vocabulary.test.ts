import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  computeSelectedVocabulary,
  scoreWord,
  type WordWithUsage,
} from "@/lib/vocabulary";
import type { Word } from "@/lib/db";

function word(id: number, frequency: number): Word {
  return {
    id,
    word: `w${id}`,
    frequency,
    pinyin: "x",
    english_translation: "y",
  };
}

describe("scoreWord", () => {
  it("gives higher base for lower frequency rank", () => {
    const w1 = word(1, 1);
    const w2 = word(2, 2);
    expect(scoreWord(w1, [])).toBeGreaterThan(scoreWord(w2, []));
  });

  it("adds need score when no successful use", () => {
    const w = word(1, 1);
    const withNone = scoreWord(w, []);
    const withWrong = scoreWord(w, [{ timestamp: new Date().toISOString(), correct: 0 }]);
    // base = 3001 - 1 = 3000, need_score = 1 => 3001
    expect(withNone).toBe(3000 + 1);
    expect(withWrong).toBe(3000 + 1);
  });

  it("reduces need score when recent successful use", () => {
    const w = word(1, 1);
    const usage = [{ timestamp: new Date().toISOString(), correct: 1 }];
    // base = 3000, need_score = 0 => 3000
    expect(scoreWord(w, usage)).toBe(3000);
  });
});

describe("computeSelectedVocabulary", () => {
  it("returns at most topN + newK unique words", () => {
    const data: WordWithUsage[] = [
      { word: word(1, 1), usage: [] },
      { word: word(2, 2), usage: [] },
      { word: word(3, 3), usage: [] },
    ];
    const out = computeSelectedVocabulary(data, { topN: 2, newK: 2 });
    expect(out.length).toBeLessThanOrEqual(4);
    expect(new Set(out).size).toBe(out.length);
  });

  it("includes highest-frequency (lowest rank) words when no usage", () => {
    const data: WordWithUsage[] = [
      { word: word(1, 1), usage: [] },
      { word: word(2, 2), usage: [] },
      { word: word(3, 3), usage: [] },
    ];
    const out = computeSelectedVocabulary(data, { topN: 2, newK: 10 });
    expect(out).toContain("w1");
    expect(out).toContain("w2");
  });

  it("respects topN", () => {
    const data: WordWithUsage[] = Array.from({ length: 100 }, (_, i) => ({
      word: word(i + 1, i + 1),
      usage: [],
    }));
    const out = computeSelectedVocabulary(data, { topN: 5, newK: 0 });
    expect(out.length).toBe(5);
  });

  it("does not crash on empty data", () => {
    expect(computeSelectedVocabulary([])).toEqual([]);
  });
});

describe("computeSelectedVocabulary (property-based)", () => {
  it("vocabulary size is at most topN + newK and all words are from data", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.tuple(fc.integer(1, 100), fc.integer(1, 3000)),
          { minLength: 1, maxLength: 40 }
        ).filter((pairs) => new Set(pairs.map(([, f]) => f)).size === pairs.length),
        fc.integer({ min: 1, max: 15 }),
        fc.nat(5),
        (pairs, topN, newK) => {
          const data: WordWithUsage[] = pairs.map(([id, f], i) => ({
            word: word(id + i * 1000, f),
            usage: [],
          }));
          const out = computeSelectedVocabulary(data, { topN, newK });
          const wordSet = new Set(data.map((d) => d.word.word));
          expect(out.length).toBeLessThanOrEqual(topN + newK);
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
