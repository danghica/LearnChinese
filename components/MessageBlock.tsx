"use client";

import React, { useCallback, useRef } from "react";
import ReactMarkdown from "react-markdown";

type Props = {
  role: "user" | "assistant";
  content: string;
  segments?: string[];
  wordLookup?: Record<string, { pinyin: string; english_translation: string }>;
  onWordClick?: (word: string) => void;
};

/** Get character offset from the start of container to the position (node, offset). */
function getOffsetInContainer(container: Node, targetNode: Node, targetOffset: number): number {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
  let offset = 0;
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const len = (node.textContent ?? "").length;
    if (node === targetNode) return offset + Math.min(targetOffset, len);
    offset += len;
  }
  return offset;
}

/** Find which segment contains the given character offset. Plain text = concatenation of segments. */
function segmentAtOffset(segments: string[], offset: number): string | null {
  let i = 0;
  for (const seg of segments) {
    const end = i + seg.length;
    if (offset >= i && offset < end) return seg;
    i = end;
  }
  return null;
}

export default function MessageBlock({ role, content, segments, wordLookup, onWordClick }: Props) {
  const isUser = role === "user";
  const containerRef = useRef<HTMLDivElement>(null);

  const handleAssistantClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!onWordClick || !segments?.length || !containerRef.current) return;
      const doc = containerRef.current.ownerDocument;
      const x = e.clientX;
      const y = e.clientY;
      let node: Node | null = null;
      let offset = 0;
      if (doc.caretPositionFromPoint) {
        const pos = doc.caretPositionFromPoint(x, y);
        if (pos) {
          node = pos.offsetNode;
          offset = pos.offset;
        }
      } else if ((doc as Document & { caretRangeFromPoint?(x: number, y: number): Range | null }).caretRangeFromPoint) {
        const range = (doc as Document & { caretRangeFromPoint(x: number, y: number): Range | null }).caretRangeFromPoint(x, y);
        if (range) {
          node = range.startContainer;
          offset = range.startOffset;
        }
      }
      if (node == null) return;
      const charOffset = getOffsetInContainer(containerRef.current, node, offset);
      const word = segmentAtOffset(segments, charOffset);
      if (word?.trim()) onWordClick(word);
    },
    [onWordClick, segments]
  );

  const displayContent = (() => {
    if (isUser) {
      return <span className="whitespace-pre-wrap break-words">{content}</span>;
    }
    // Assistant: render markdown with typography, optional word-click overlay
    const markdown = (
      <ReactMarkdown
        components={{
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-0.5">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-0.5">{children}</ol>,
          li: ({ children }) => <li className="ml-2">{children}</li>,
          code: ({ children }) => (
            <code className="bg-gray-200 px-1 py-0.5 rounded text-sm font-mono">{children}</code>
          ),
          h1: ({ children }) => <h1 className="text-lg font-bold mt-2 mb-1">{children}</h1>,
          h2: ({ children }) => <h2 className="text-base font-bold mt-2 mb-1">{children}</h2>,
          h3: ({ children }) => <h3 className="text-sm font-bold mt-1 mb-0.5">{children}</h3>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-gray-300 pl-3 my-2 text-gray-700">{children}</blockquote>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    );
    return (
      <div
        ref={containerRef}
        className={`break-words ${segments?.length && onWordClick ? "cursor-pointer" : ""}`}
        onClick={segments?.length && onWordClick ? handleAssistantClick : undefined}
        role={segments?.length && onWordClick ? "button" : undefined}
      >
        {markdown}
      </div>
    );
  })();

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} my-2`}>
      <div
        className={`max-w-[85%] rounded-lg px-4 py-2 ${
          isUser ? "bg-blue-100 text-blue-900" : "bg-gray-100 text-gray-900"
        }`}
      >
        <div className="text-inherit [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1">
          {displayContent}
        </div>
      </div>
    </div>
  );
}
