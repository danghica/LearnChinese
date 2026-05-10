/** Basic CJK Unified Ideographs (excludes extension blocks; enough for learner text). */
const CJK_RE = /[\u4e00-\u9fff]/g;

/**
 * True if the string looks like Chinese prose (mostly 汉字), not Pinyin/Latin.
 * Used to reject story generation that ignored "Chinese characters only".
 */
export function isPrimarilyHanzi(text: string): boolean {
  const compact = text.replace(/\s+/g, "");
  if (compact.length < 12) return false;
  const cjk = (compact.match(CJK_RE) ?? []).length;
  const ratio = cjk / compact.length;
  return ratio >= 0.22 && cjk >= 15;
}

/**
 * Use jieba only when the sentence is mostly 汉字; otherwise segmentation yields letter fragments (Pinyin).
 */
export function isJiebaFriendlySentence(sentence: string): boolean {
  const compact = sentence.replace(/\s+/g, "");
  if (compact.length < 1) return false;
  const cjk = (compact.match(CJK_RE) ?? []).length;
  if (cjk === 0) return false;
  const asciiLetters = (compact.match(/[a-zA-Z]/g) ?? []).length;
  return cjk >= asciiLetters;
}

/** True if this slice has no 汉字 and looks like trailing dialogue punctuation only (not a real clause). */
function isDialogueOnlyFragment(s: string): boolean {
  if (/[\u4e00-\u9fff]/.test(s)) return false;
  if (/[a-zA-Z]{2,}/.test(s)) return false;
  const t = s.trim();
  if (t.length === 0) return true;
  return /^[”“「」『』"'，。、；：？！…—·\s\d]{1,16}$/.test(t);
}

/**
 * After splitting story text on newlines / sentence marks, reattach orphan quote lines
 * (e.g. `”` alone after `…？`) so each segment is a sensible translation unit.
 */
export function mergeDialogueFragments(parts: string[]): string[] {
  const out: string[] = [];
  for (const raw of parts) {
    const trimmed = raw.trim();
    if (trimmed.length === 0) continue;
    if (out.length === 0) {
      out.push(trimmed);
      continue;
    }
    if (isDialogueOnlyFragment(trimmed)) {
      out[out.length - 1] = `${out[out.length - 1]}${trimmed}`;
    } else {
      out.push(trimmed);
    }
  }
  return out;
}
