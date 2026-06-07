export const STORY_STORAGE_KEY = "story-content";

export type StoryBlock = {
  chinese: string;
  english: string;
  chineseComma: string;
  chineseWords: string[];
};

export type StoryStoragePayload = {
  blocks: StoryBlock[];
  topic?: string;
};

export function parseStoryStorage(raw: string | null): StoryStoragePayload | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as { blocks?: StoryBlock[]; topic?: string };
    if (!Array.isArray(data?.blocks) || data.blocks.length === 0) return null;
    return {
      blocks: data.blocks,
      topic: typeof data.topic === "string" ? data.topic : undefined,
    };
  } catch {
    return null;
  }
}
