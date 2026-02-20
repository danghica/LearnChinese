/**
 * Generates data/words-3000.json from chinese-lexicon (SUBTLEX-CH word frequency + CEDICT).
 * Run: node scripts/generate-words-3000.cjs
 * Requires: npm install chinese-lexicon
 */
const { allEntries } = require("chinese-lexicon");
const { writeFileSync } = require("fs");
const { join } = require("path");

function main() {
  const outPath = join(process.cwd(), "data", "words-3000.json");

  const withRank = allEntries.filter(
    (e) => e.statistics && Number.isFinite(e.statistics.movieWordRank)
  );

  const byWord = new Map();
  for (const e of withRank) {
    const r = e.statistics.movieWordRank;
    if (!byWord.has(e.simp) || byWord.get(e.simp).statistics.movieWordRank > r) {
      byWord.set(e.simp, e);
    }
  }

  const sorted = [...byWord.values()].sort(
    (a, b) => a.statistics.movieWordRank - b.statistics.movieWordRank
  );
  const top3000 = sorted.slice(0, 3000);

  const words = top3000.map((e, i) => ({
    word: e.simp,
    frequency: i + 1,
    pinyin: e.pinyin || "",
    english_translation: (e.definitions && e.definitions[0]) || "",
  }));

  writeFileSync(outPath, JSON.stringify(words, null, 2), "utf-8");
  console.log("Wrote", words.length, "words to", outPath);
}

main();
