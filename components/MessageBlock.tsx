"use client";

import React from "react";

type SegmentInput = { word: string; inVocabulary?: boolean } | string;

type Props = {
  role: "user" | "assistant";
  content: string;
  segments?: SegmentInput[] | string[];
  wordLookup?: Record<string, { pinyin: string; english_translation: string }>;
  onWordClick?: (word: string) => void;
};

function normalizeSegment(seg: SegmentInput): { word: string; inVocabulary?: boolean } {
  return typeof seg === "string" ? { word: seg } : { word: seg.word, inVocabulary: seg.inVocabulary };
}

export default function MessageBlock({ role, content, segments, wordLookup, onWordClick }: Props) {
  const isUser = role === "user";
  const normalizedSegments =
    segments?.map((s) => normalizeSegment(s as SegmentInput)) ?? [];
  const hasSegments = !isUser && normalizedSegments.length > 0;
  const displayContent =
    hasSegments ? (
      <span className="inline">
        {normalizedSegments.map(({ word, inVocabulary }, i) => {
          const lookup = wordLookup?.[word];
          const clickable = onWordClick && (lookup !== undefined || true);
          const colorClass = inVocabulary === false ? "text-red-900" : "text-gray-900";
          return (
            <span key={i}>
              {clickable ? (
                <button
                  type="button"
                  onClick={() => onWordClick(word)}
                  className={`border-b border-dotted border-gray-400 hover:bg-gray-100 cursor-pointer mx-0.5 ${colorClass}`}
                >
                  {word}
                </button>
              ) : (
                <span className={`mx-0.5 ${colorClass}`}>{word}</span>
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
