import path from "path";
import fs from "fs";

let hsk14Set: Set<string> | null = null;

function loadHsk14Set(): Set<string> {
  if (hsk14Set !== null) return hsk14Set;
  try {
    const p = path.join(process.cwd(), "data", "hsk-2.0-1-4.json");
    if (!fs.existsSync(p)) {
      hsk14Set = new Set();
      return hsk14Set;
    }
    const raw = fs.readFileSync(p, "utf-8");
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) {
      hsk14Set = new Set();
      return hsk14Set;
    }
    hsk14Set = new Set(data.filter((w): w is string => typeof w === "string" && w.trim().length > 0));
    return hsk14Set;
  } catch {
    hsk14Set = new Set();
    return hsk14Set;
  }
}

/** True if the word appears in HSK 2.0 levels 1–4. */
export function isHsk14Word(word: string): boolean {
  const w = word.trim();
  if (!w) return false;
  return loadHsk14Set().has(w);
}

/** Exposed for tests to reset cached set after env changes. */
export function resetHsk14Cache(): void {
  hsk14Set = null;
}
