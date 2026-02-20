"use client";

import React from "react";

type Props = {
  role: "user" | "assistant";
  content: string;
  segments?: string[];
  wordLookup?: Record<string, { pinyin: string; english_translation: string }>;
  onWordClick?: (word: string) => void;
};

export default function MessageBlock({ role, content, segments, wordLookup, onWordClick }: Props) {
  const isUser = role === "user";
  const displayContent = segments && segments.length > 0 ? (
    <span className="inline">
      {segments.map((word, i) => {
        const lookup = wordLookup?.[word];
        const clickable = onWordClick && (lookup || true);
        return (
          <span key={i}>
            {clickable ? (
              <button
                type="button"
                onClick={() => onWordClick(word)}
                className="border-b border-dotted border-gray-400 hover:bg-gray-100 cursor-pointer mx-0.5"
              >
                {word}
              </button>
            ) : (
              <span className="mx-0.5">{word}</span>
            )}
          </span>
        );
      })}
    </span>
  ) : (
    content
  );

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} my-2`}>
      <div
        className={`max-w-[85%] rounded-lg px-4 py-2 ${
          isUser ? "bg-blue-100 text-blue-900" : "bg-gray-100 text-gray-900"
        }`}
      >
        <div className="whitespace-pre-wrap break-words">{displayContent}</div>
      </div>
    </div>
  );
}
