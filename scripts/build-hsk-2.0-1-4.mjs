/**
 * Build data/hsk-2.0-1-4.json from drkameleon/complete-hsk-vocabulary (HSK 2.0 levels 1–4).
 * Run: npm run build-hsk
 */
import { writeFileSync } from "fs";
import { join } from "path";

const SOURCE_URL =
  "https://raw.githubusercontent.com/drkameleon/complete-hsk-vocabulary/main/complete.json";
const HSK20_LEVELS = new Set(["old-1", "old-2", "old-3", "old-4"]);

async function main() {
  const res = await fetch(SOURCE_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch HSK vocabulary: ${res.status} ${res.statusText}`);
  }
  const entries = await res.json();
  if (!Array.isArray(entries)) {
    throw new Error("Unexpected HSK vocabulary format");
  }

  const words = new Set();
  for (const entry of entries) {
    const simplified = entry.simplified?.trim();
    const levels = entry.level;
    if (!simplified || !Array.isArray(levels)) continue;
    if (levels.some((level) => HSK20_LEVELS.has(level))) {
      words.add(simplified);
    }
  }

  const sorted = [...words].sort((a, b) => a.localeCompare(b, "zh"));
  const outPath = join(process.cwd(), "data", "hsk-2.0-1-4.json");
  writeFileSync(outPath, JSON.stringify(sorted, null, 2), "utf-8");
  console.log(`Wrote ${sorted.length} HSK 2.0 level 1–4 words to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
