import { describe, expect, it } from "vitest";
import { isJiebaFriendlySentence, isPrimarilyHanzi, mergeDialogueFragments } from "../lib/storyValidation";

describe("isPrimarilyHanzi", () => {
  it("rejects Pinyin-only story fragments", () => {
    const pinyin = "nǐ kàn le mei mí hái shì shén me le? wǒ gào su nǐ yī gè guān cháng de gù shi.";
    expect(isPrimarilyHanzi(pinyin)).toBe(false);
  });

  it("accepts typical Chinese prose", () => {
    const han = "小女孩走进森林。她看见一只兔子。兔子说：你好！她们一起去找朋友。";
    expect(isPrimarilyHanzi(han)).toBe(true);
  });

  it("rejects empty or too short", () => {
    expect(isPrimarilyHanzi("")).toBe(false);
    expect(isPrimarilyHanzi("你好")).toBe(false);
  });
});

describe("isJiebaFriendlySentence", () => {
  it("rejects Pinyin-heavy line", () => {
    expect(isJiebaFriendlySentence("nǐ hǎo wǒ shì")).toBe(false);
  });

  it("accepts Chinese sentence", () => {
    expect(isJiebaFriendlySentence("小女孩走进森林。")).toBe(true);
  });
});

describe("mergeDialogueFragments", () => {
  it("merges standalone closing quote line onto previous segment", () => {
    const parts = ["他说：“你好，你是谁？", "”", "她说：“我是小林。"];
    expect(mergeDialogueFragments(parts)).toEqual(['他说：“你好，你是谁？”', "她说：“我是小林。"]);
  });

  it("does not merge lines that contain 汉字", () => {
    const parts = ["第一句。", "第二句。"];
    expect(mergeDialogueFragments(parts)).toEqual(["第一句。", "第二句。"]);
  });
});
