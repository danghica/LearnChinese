"use client";

type Props = {
  word: string;
  pinyin: string;
  english_translation: string;
};

export default function WordLookupNote({ word, pinyin, english_translation }: Props) {
  return (
    <div className="my-1 px-3 py-2 bg-amber-50 border border-amber-200 rounded text-sm text-gray-800">
      <span className="font-medium">{word}</span> — {pinyin}: {english_translation}
    </div>
  );
}
