#!/usr/bin/env node
/**
 * Build data/cedict-lookup.json from CC-CEDICT.
 * Usage: node scripts/build-cedict-json.mjs
 * Optional: CEDICT_URL env var for custom URL.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CEDICT_URL =
  process.env.CEDICT_URL ||
  "https://raw.githubusercontent.com/bsun94/ChineseDictionary/master/dict_db/cedict_ts.u8";
const OUT_PATH = path.join(__dirname, "..", "data", "cedict-lookup.json");

// Line format: 傳統 传统 [chuan2 tong3] /traditional/convention/
const LINE_RE = /^(\S+)\s+(\S+)\s+\[([^\]]+)\]\s+(.*)$/;

function parseLine(line) {
  const m = line.match(LINE_RE);
  if (!m) return null;
  const [, , simplified, pinyin, rest] = m;
  const defs = (rest || "")
    .split("/")
    .map((s) => s.trim())
    .filter(Boolean);
  return { simplified, pinyin, english_translation: defs.join("; ") };
}

async function main() {
  console.log("Fetching CEDICT from", CEDICT_URL);
  const res = await fetch(CEDICT_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  const text = await res.text();
  const lines = text.split("\n").filter((l) => l.trim() && !l.startsWith("#"));
  const map = {};
  for (const line of lines) {
    const entry = parseLine(line);
    if (!entry) continue;
    const { simplified, pinyin, english_translation } = entry;
    if (!map[simplified]) map[simplified] = { pinyin, english_translation };
  }
  const dataDir = path.dirname(OUT_PATH);
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(map, null, 0), "utf-8");
  console.log("Wrote", OUT_PATH, "with", Object.keys(map).length, "entries.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
