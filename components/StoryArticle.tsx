"use client";

import React from "react";
import type { StoryBlock } from "@/lib/storyStorage";

type Props = {
  blocks: StoryBlock[];
  onWordClick: (word: string) => void;
};

export default function StoryArticle({ blocks, onWordClick }: Props) {
  return (
    <article className="space-y-6 mb-6">
      {blocks.map((block, idx) => (
        <div key={idx} className="space-y-2">
          <p className="text-gray-600 italic">{block.english}</p>
          <p className="text-gray-700 text-sm">
            {block.chineseComma
              .split(",")
              .map((w) => w.trim())
              .filter(Boolean)
              .map((token, i, arr) => (
                <span key={i}>
                  <button
                    type="button"
                    onClick={() => onWordClick(token)}
                    className="border-b border-dotted border-gray-400 hover:bg-gray-200 cursor-pointer mx-0.5 px-0.5"
                  >
                    {token}
                  </button>
                  {i < arr.length - 1 ? ", " : null}
                </span>
              ))}
          </p>
          <p className="text-lg text-gray-900">{block.chinese}</p>
        </div>
      ))}
    </article>
  );
}
