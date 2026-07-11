import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import type { StoryBlock } from "@/lib/storyStorage";

const sampleBlocks: StoryBlock[] = [
  {
    chinese: "在很远的地方，有一位国王。",
    english: "There is a king in a very far place.",
    chineseComma: "在,很,远,的,地方,，,有,一位,国王,。",
    chineseWords: ["在", "很", "远", "的", "地方", "，", "有", "一位", "国王", "。"],
  },
  {
    chinese: "他有一个女儿。",
    english: "He has a daughter.",
    chineseComma: "他,有,一个,女儿,。",
    chineseWords: ["他", "有", "一个", "女儿", "。"],
  },
];

let tmpDb: string;
let originalDbUrl: string | undefined;

beforeEach(() => {
  tmpDb = path.join(os.tmpdir(), `stories-test-${Date.now()}-${Math.random().toString(36).slice(2)}.sqlite`);
  originalDbUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = tmpDb;
  vi.resetModules();
});

afterEach(() => {
  if (originalDbUrl === undefined) {
    delete process.env.DATABASE_URL;
  } else {
    process.env.DATABASE_URL = originalDbUrl;
  }
  if (fs.existsSync(tmpDb)) fs.unlinkSync(tmpDb);
  vi.resetModules();
});

describe("parseStoryBlocks", () => {
  it("returns null for invalid JSON", async () => {
    const { parseStoryBlocks } = await import("@/lib/stories");
    expect(parseStoryBlocks("not json")).toBeNull();
  });

  it("returns null for empty array", async () => {
    const { parseStoryBlocks } = await import("@/lib/stories");
    expect(parseStoryBlocks("[]")).toBeNull();
  });

  it("returns null when chinese or english is missing", async () => {
    const { parseStoryBlocks } = await import("@/lib/stories");
    expect(parseStoryBlocks(JSON.stringify([{ chinese: "你好" }]))).toBeNull();
  });

  it("parses valid blocks", async () => {
    const { parseStoryBlocks } = await import("@/lib/stories");
    expect(parseStoryBlocks(JSON.stringify(sampleBlocks))).toEqual(sampleBlocks);
  });
});

describe("saveStory and getStoryById", () => {
  it("round-trips blocks", async () => {
    const { saveStory, getStoryById } = await import("@/lib/stories");
    const id = saveStory("A king's tale", sampleBlocks);
    const story = getStoryById(id);
    expect(story).not.toBeNull();
    expect(story!.topic).toBe("A king's tale");
    expect(story!.blocks).toEqual(sampleBlocks);
    expect(story!.created_at).toBeTruthy();
  });

  it("returns null for missing id", async () => {
    const { getStoryById } = await import("@/lib/stories");
    expect(getStoryById(99999)).toBeNull();
  });

  it("returns null for invalid id", async () => {
    const { getStoryById } = await import("@/lib/stories");
    expect(getStoryById(0)).toBeNull();
  });
});

describe("listStories", () => {
  it("returns newest first with preview and total", async () => {
    const { saveStory, listStories } = await import("@/lib/stories");
    saveStory("Older story", [sampleBlocks[0]]);
    saveStory("Newer story", sampleBlocks);

    const { stories, total } = listStories();
    expect(total).toBe(2);
    expect(stories).toHaveLength(2);
    expect(stories[0].topic).toBe("Newer story");
    expect(stories[1].topic).toBe("Older story");
    expect(stories[0].preview).toContain("There is a king");
  });

  it("respects limit and offset", async () => {
    const { saveStory, listStories } = await import("@/lib/stories");
    for (let i = 0; i < 3; i++) saveStory(`Story ${i}`, [sampleBlocks[0]]);

    const page = listStories(1, 1);
    expect(page.total).toBe(3);
    expect(page.stories).toHaveLength(1);
  });
});
