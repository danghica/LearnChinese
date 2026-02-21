/**
 * Pinyin numeric tone marks (e.g. "ni3 hao3") to diacritics (e.g. "nǐ hǎo").
 * Syllables are space-separated; tone is 1–4 (5 or missing = neutral).
 * ü in numeric form may appear as "v" (e.g. lv3) or "u" after l/n.
 */

const TONE_MARKS: Record<string, [string, string, string, string]> = {
  a: ["ā", "á", "ǎ", "à"],
  e: ["ē", "é", "ě", "è"],
  i: ["ī", "í", "ǐ", "ì"],
  o: ["ō", "ó", "ǒ", "ò"],
  u: ["ū", "ú", "ǔ", "ù"],
  ü: ["ǖ", "ǘ", "ǚ", "ǜ"],
};

/** True if the string looks like numeric pinyin (has digit 1–5 at end of a syllable). */
function hasNumericTone(s: string): boolean {
  return /\b[a-züv]+\s*[1-5]\b/i.test(s) || /\b[a-züv]+[1-5]\b/i.test(s);
}

/** Which vowel index in the syllable gets the tone (a/e first, then o in "ou", else last vowel). */
function toneVowelIndex(syllable: string): number {
  const lower = syllable.toLowerCase();
  const a = lower.indexOf("a");
  if (a !== -1) return a;
  const e = lower.indexOf("e");
  if (e !== -1) return e;
  if (lower.includes("ou")) {
    const o = lower.indexOf("o");
    if (o !== -1) return o;
  }
  const o = lower.indexOf("o");
  if (o !== -1) return o;
  const u = lower.indexOf("u");
  if (u !== -1) return u;
  const v = lower.indexOf("v");
  if (v !== -1) return v;
  const i = lower.indexOf("i");
  if (i !== -1) return i;
  return -1;
}

/** Convert one syllable from numeric tone to diacritic (e.g. "hao3" -> "hǎo"). */
function syllableToDiacritic(syllable: string): string {
  const m = syllable.match(/^(.+?)([1-5])$/i);
  if (!m) return syllable;
  const [, base, toneStr] = m;
  const tone = parseInt(toneStr, 10);
  if (tone === 5 || tone === 0) return base;

  const marks = tone >= 1 && tone <= 4 ? TONE_MARKS : null;
  if (!marks) return base;

  const idx = toneVowelIndex(base);
  if (idx === -1) return base;

  const char = base[idx].toLowerCase();
  const key = char === "v" ? "ü" : char;
  const row = marks[key];
  if (!row) return base;

  const replacement = row[tone - 1];
  const isUpper = base[idx] !== base[idx].toLowerCase();
  const newChar = isUpper ? replacement.toUpperCase() : replacement;
  return base.slice(0, idx) + newChar + base.slice(idx + 1);
}

/**
 * If the string looks like numeric pinyin, convert it to diacritic form.
 * Otherwise returns the string unchanged.
 */
export function pinyinToDiacritic(pinyin: string): string {
  if (!pinyin || !hasNumericTone(pinyin)) return pinyin;
  return pinyin
    .split(/\s+/)
    .map((s) => syllableToDiacritic(s.trim()))
    .join(" ");
}
