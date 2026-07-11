import { describe, it, expect } from "vitest";
import {
  extractUniqueStoryTokens,
  filterNonHsk14,
  formatVocabularyLine,
  simplifyEnglish,
  buildStoryVocabularyText,
} from "@/lib/storyVocabulary";
import type { StoryBlock } from "@/lib/storyStorage";

const sampleBlocks: StoryBlock[] = [
  {
    chinese: "我有一本书。",
    english: "I have a book.",
    chineseComma: "我,有,一,本,书,。",
    chineseWords: ["我", "有", "一", "本", "书", "。"],
  },
  {
    chinese: "这是传统的方法。",
    english: "This is a traditional method.",
    chineseComma: "这,是,传统,的,方法,。",
    chineseWords: ["这", "是", "传统", "的", "方法", "。"],
  },
];

describe("extractUniqueStoryTokens", () => {
  it("dedupes tokens preserving first-seen order", () => {
    const blocks: StoryBlock[] = [
      {
        chinese: "我我",
        english: "me",
        chineseComma: "我,我",
        chineseWords: ["我", "我"],
      },
      {
        chinese: "你",
        english: "you",
        chineseComma: "你",
        chineseWords: ["你"],
      },
    ];
    expect(extractUniqueStoryTokens(blocks)).toEqual(["我", "你"]);
  });

  it("skips punctuation-only tokens", () => {
    expect(extractUniqueStoryTokens(sampleBlocks)).toEqual(["我", "有", "一", "本", "书", "这", "是", "传统", "的", "方法"]);
  });
});

describe("filterNonHsk14", () => {
  it("removes tokens marked as HSK 1–4", () => {
    const isHsk = (word: string) => ["我", "有", "书"].includes(word);
    expect(filterNonHsk14(["我", "传统", "书"], isHsk)).toEqual(["传统"]);
  });
});

describe("formatVocabularyLine", () => {
  it("formats english, pinyin, and chinese", () => {
    expect(formatVocabularyLine("traditional/convention", "chuan2 tong3", "传统")).toBe(
      "traditional/convention, chuán tǒng, 传统"
    );
  });

  it("uses first english gloss before semicolon", () => {
    expect(simplifyEnglish("first gloss; second gloss")).toBe("first gloss");
  });
});

describe("buildStoryVocabularyText", () => {
  it("returns empty text when all tokens are HSK", async () => {
    const result = await buildStoryVocabularyText(sampleBlocks, {
      isHsk: () => true,
      lookup: async () => ({ english: "x", pinyin: "x1" }),
    });
    expect(result).toEqual({ text: "", count: 0 });
  });

  it("builds lines for non-HSK tokens with lookup hits", async () => {
    const result = await buildStoryVocabularyText(sampleBlocks, {
      isHsk: (word) => word !== "传统" && word !== "方法",
      lookup: async (word) => {
        if (word === "传统") return { english: "tradition", pinyin: "chuan2 tong3" };
        if (word === "方法") return { english: "method", pinyin: "fang1 fa3" };
        return null;
      },
    });
    expect(result.count).toBe(2);
    expect(result.text).toContain("tradition, chuán tǒng, 传统");
    expect(result.text).toContain("method, fāng fǎ, 方法");
  });

  it("skips tokens without dictionary hits", async () => {
    const result = await buildStoryVocabularyText(
      [
        {
          chinese: "测试",
          english: "test",
          chineseComma: "测试",
          chineseWords: ["测试"],
        },
      ],
      {
        isHsk: () => false,
        lookup: async () => null,
      }
    );
    expect(result).toEqual({ text: "", count: 0 });
  });
});
