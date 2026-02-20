let jiebaInstance: { cut: (s: string) => string[] } | null = null;

function getJieba(): { cut: (s: string) => string[] } {
  if (!jiebaInstance) {
    const { Jieba } = require("@node-rs/jieba");
    const { dict } = require("@node-rs/jieba/dict");
    jiebaInstance = Jieba.withDict(dict);
  }
  return jiebaInstance!;
}

export function segment(text: string): string[] {
  const result = getJieba().cut(text);
  return Array.isArray(result) ? result : [text];
}
