import { lookup, lookupFromRemote } from "./cedict";
import { isHsk14Word } from "./hsk";
import { pinyinToDiacritic } from "./pinyin";
import type { StoryBlock } from "./storyStorage";
import { getWordByWord } from "./words";

const CJK_RE = /[\u4e00-\u9fff]/;

export function extractUniqueStoryTokens(blocks: StoryBlock[]): string[] {
  const seen = new Set<string>();
  const tokens: string[] = [];
  for (const block of blocks) {
    for (const raw of block.chineseWords ?? []) {
      const token = raw.trim();
      if (!token || !CJK_RE.test(token) || seen.has(token)) continue;
      seen.add(token);
      tokens.push(token);
    }
  }
  return tokens;
}

export function filterNonHsk14(tokens: string[], isHsk: (word: string) => boolean = isHsk14Word): string[] {
  return tokens.filter((token) => !isHsk(token));
}

export function simplifyEnglish(english: string): string {
  const first = english.split(";")[0]?.trim();
  return first || english.trim();
}

export function formatVocabularyLine(english: string, pinyin: string, word: string): string {
  const en = simplifyEnglish(english);
  const py = pinyinToDiacritic(pinyin.trim());
  return `${en}, ${py}, ${word}`;
}

export async function lookupWordEntry(
  word: string
): Promise<{ english: string; pinyin: string } | null> {
  const dbWord = getWordByWord(word);
  if (dbWord) {
    return {
      english: dbWord.english_translation,
      pinyin: dbWord.pinyin,
    };
  }
  const local = lookup(word);
  if (local) {
    return {
      english: local.english_translation,
      pinyin: local.pinyin,
    };
  }
  const remote = await lookupFromRemote(word);
  if (remote) {
    return {
      english: remote.english_translation,
      pinyin: remote.pinyin,
    };
  }
  return null;
}

export async function buildStoryVocabularyText(
  blocks: StoryBlock[],
  options?: {
    isHsk?: (word: string) => boolean;
    lookup?: (word: string) => Promise<{ english: string; pinyin: string } | null>;
  }
): Promise<{ text: string; count: number }> {
  const isHsk = options?.isHsk ?? isHsk14Word;
  const lookupFn = options?.lookup ?? lookupWordEntry;
  const tokens = filterNonHsk14(extractUniqueStoryTokens(blocks), isHsk);
  const lines: string[] = [];
  for (const token of tokens) {
    const entry = await lookupFn(token);
    if (!entry) continue;
    lines.push(formatVocabularyLine(entry.english, entry.pinyin, token));
  }
  return { text: lines.join("\n"), count: lines.length };
}
