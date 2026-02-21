/**
 * CEDICT lookup for simplified Chinese words.
 * Uses data/cedict-lookup.json first; if not found, fetches full CC-CEDICT once per process (lookupFromRemote).
 */
import path from "path";
import fs from "fs";

const CEDICT_URL =
  process.env.CEDICT_URL ||
  "https://raw.githubusercontent.com/bsun94/ChineseDictionary/master/dict_db/cedict_ts.u8";

// Line format: 傳統 传统 [chuan2 tong3] /traditional/convention/
const LINE_RE = /^(\S+)\s+(\S+)\s+\[([^\]]+)\]\s+(.*)$/;

type CedictEntry = { pinyin: string; english_translation: string };
let cache: Record<string, CedictEntry> | null = null;
let remoteCache: Record<string, CedictEntry> | null = null;
let remoteLoadPromise: Promise<Record<string, CedictEntry>> | null = null;

function loadCedictMap(): Record<string, CedictEntry> {
  if (cache !== null) return cache;
  try {
    const p = path.join(process.cwd(), "data", "cedict-lookup.json");
    if (!fs.existsSync(p)) {
      cache = {};
      return cache;
    }
    const raw = fs.readFileSync(p, "utf-8");
    const data = JSON.parse(raw) as Record<string, CedictEntry>;
    cache = typeof data === "object" && data !== null ? data : {};
    return cache;
  } catch {
    cache = {};
    return cache;
  }
}

function parseCedictLine(line: string): { simplified: string; pinyin: string; english_translation: string } | null {
  const m = line.match(LINE_RE);
  if (!m) return null;
  const [, , simplified, pinyin, rest] = m;
  const defs = (rest || "")
    .split("/")
    .map((s) => s.trim())
    .filter(Boolean);
  return { simplified, pinyin, english_translation: defs.join("; ") };
}

async function loadRemoteCedict(): Promise<Record<string, CedictEntry>> {
  if (remoteCache !== null) return remoteCache;
  if (remoteLoadPromise !== null) return remoteLoadPromise;
  remoteLoadPromise = (async () => {
    const fetchCmd = `fetch("${CEDICT_URL}")`;
    try {
      const res = await fetch(CEDICT_URL);
      if (!res.ok) {
        const msg = `CEDICT remote fetch failed: ${fetchCmd} → ${res.status} ${res.statusText}`;
        console.error("[cedict]", msg);
        throw new Error(msg);
      }
      const text = await res.text();
      const lines = text.split("\n").filter((l) => l.trim() && !l.startsWith("#"));
      const map: Record<string, CedictEntry> = {};
      for (const line of lines) {
        const entry = parseCedictLine(line);
        if (!entry) continue;
        const { simplified, pinyin, english_translation } = entry;
        if (!map[simplified]) map[simplified] = { pinyin, english_translation };
      }
      remoteCache = map;
      return map;
    } catch (err) {
      const msg =
        err instanceof Error
          ? `${err.message}`
          : `CEDICT remote load error: ${fetchCmd} threw ${String(err)}`;
      console.error("[cedict]", msg);
      throw new Error(msg);
    }
  })();
  return remoteLoadPromise;
}

export function lookup(word: string): { pinyin: string; english_translation: string } | null {
  if (!word || !word.trim()) return null;
  const w = word.trim();
  const map = loadCedictMap();
  return map[w] ?? null;
}

export async function lookupFromRemote(
  word: string
): Promise<{ pinyin: string; english_translation: string } | null> {
  if (!word || !word.trim()) return null;
  const w = word.trim();
  const map = await loadRemoteCedict();
  return map[w] ?? null;
}
