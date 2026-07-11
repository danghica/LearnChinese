import { describe, it, expect } from "vitest";
import {
  buildStoryDownloadText,
  buildStoryDownloadFilename,
} from "@/lib/storyDownload";
import type { StoryBlock } from "@/lib/storyStorage";

const sampleBlocks: StoryBlock[] = [
  {
    chinese: "在很远的地方，有一位国王。",
    english: "There is a king in a very far place.",
    chineseComma: "在,很,远",
    chineseWords: ["在", "很", "远"],
  },
  {
    chinese: "他有一个女儿。",
    english: "He has a daughter.",
    chineseComma: "他,有",
    chineseWords: ["他", "有"],
  },
  {
    chinese: "   ",
    english: "",
    chineseComma: "",
    chineseWords: [],
  },
];

describe("buildStoryDownloadText", () => {
  it("joins English sentences with blank lines", () => {
    expect(buildStoryDownloadText(sampleBlocks, "english")).toBe(
      "There is a king in a very far place.\n\nHe has a daughter."
    );
  });

  it("joins Chinese sentences with blank lines", () => {
    expect(buildStoryDownloadText(sampleBlocks, "chinese")).toBe(
      "在很远的地方，有一位国王。\n\n他有一个女儿。"
    );
  });

  it("preserves sentence order", () => {
    const text = buildStoryDownloadText(sampleBlocks, "english");
    expect(text.indexOf("king")).toBeLessThan(text.indexOf("daughter"));
  });
});

describe("buildStoryDownloadFilename", () => {
  it("builds english filename from topic", () => {
    expect(buildStoryDownloadFilename("A King's Tale!", "english")).toBe(
      "a-king-s-tale-english.txt"
    );
  });

  it("builds chinese filename from topic", () => {
    expect(buildStoryDownloadFilename("forest adventure", "chinese")).toBe(
      "forest-adventure-chinese.txt"
    );
  });

  it("uses untitled fallback when topic is missing", () => {
    expect(buildStoryDownloadFilename(undefined, "english")).toBe("untitled-story-english.txt");
  });

  it("prefixes id for saved stories", () => {
    expect(buildStoryDownloadFilename("My Topic", "english", 42)).toBe("42-my-topic-english.txt");
  });

  it("sanitizes special characters", () => {
    expect(buildStoryDownloadFilename("Hello @ World #1", "chinese", 7)).toBe(
      "7-hello-world-1-chinese.txt"
    );
  });

  it("builds vocabulary filename", () => {
    expect(buildStoryDownloadFilename("My Topic", "vocabulary", 3)).toBe("3-my-topic-vocabulary.txt");
  });
});
