import { describe, it, expect } from "vitest";
import { parseMisusedWords, stripMisusedJson } from "@/lib/llm";

describe("parseMisusedWords", () => {
  it("extracts misused_words from JSON at end", () => {
    const content = "Some text.\n{\"misused_words\": [\"词1\", \"词2\"]}";
    expect(parseMisusedWords(content)).toEqual(["词1", "词2"]);
  });

  it("returns empty array when no JSON block", () => {
    expect(parseMisusedWords("No json here")).toEqual([]);
  });

  it("returns empty array for empty misused_words", () => {
    const content = "Text\n{\"misused_words\": []}";
    expect(parseMisusedWords(content)).toEqual([]);
  });
});

describe("stripMisusedJson", () => {
  it("removes trailing JSON block", () => {
    const content = "Hello world.\n{\"misused_words\": [\"x\"]}";
    expect(stripMisusedJson(content)).toBe("Hello world.");
  });

  it("leaves content without JSON unchanged", () => {
    const content = "Just text";
    expect(stripMisusedJson(content)).toBe("Just text");
  });
});
