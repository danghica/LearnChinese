import type { StoryBlock } from "./storyStorage";

export type StoryDownloadLang = "english" | "chinese" | "vocabulary";

export function buildStoryDownloadText(blocks: StoryBlock[], lang: StoryDownloadLang): string {
  const key = lang === "english" ? "english" : "chinese";
  return blocks
    .map((block) => block[key].trim())
    .filter(Boolean)
    .join("\n\n");
}

function slugifyTopic(topic: string | undefined): string {
  const trimmed = topic?.trim();
  if (!trimmed) return "untitled-story";
  const slug = trimmed
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug || "untitled-story";
}

export function buildStoryDownloadFilename(
  topic: string | undefined,
  lang: StoryDownloadLang,
  id?: number
): string {
  const slug = slugifyTopic(topic);
  const langSuffix =
    lang === "english" ? "english" : lang === "chinese" ? "chinese" : "vocabulary";
  const prefix = typeof id === "number" && Number.isFinite(id) && id > 0 ? `${id}-` : "";
  return `${prefix}${slug}-${langSuffix}.txt`;
}

export function downloadStoryText(text: string, filename: string): void {
  if (typeof document === "undefined") return;
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
