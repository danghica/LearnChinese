"use client";

import React, { useState, useCallback } from "react";

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

const SoundIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden>
    <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.78 4.78a6.75 6.75 0 0 1-4.5 1.97H2.25A1.5 1.5 0 0 0 .75 9.5v6a1.5 1.5 0 0 0 1.5 1.5h1.41a6.75 6.75 0 0 1 4.5 1.97l4.78 4.78c.945.945 2.561.276 2.561-1.06V4.06ZM18.584 5.106a.75.75 0 0 1 1.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 0 1-1.06-1.06 8.25 8.25 0 0 0 0-11.668.75.75 0 0 1 0-1.06Z" />
    <path d="M15.932 7.757a.75.75 0 0 1 1.061 0 6 6 0 0 1 0 8.486.75.75 0 0 1-1.06-1.061 4.5 4.5 0 0 0 0-6.364.75.75 0 0 1 0-1.06Z" />
  </svg>
);

const StopIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden>
    <path d="M5.25 7.5A2.25 2.25 0 0 1 7.5 5.25h9a2.25 2.25 0 0 1 2.25 2.25v9a2.25 2.25 0 0 1-2.25 2.25h-9a2.25 2.25 0 0 1-2.25-2.25v-9Z" />
  </svg>
);

export default function MessageBlock({ role, content, segments, wordLookup, onWordClick }: Props) {
  const [isPlaying, setIsPlaying] = useState(false);
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

  const handleSpeakClick = useCallback(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }
    const text = content.trim();
    if (!text) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "zh-CN";
    const voices = window.speechSynthesis.getVoices();
    const zhVoice = voices.find((v) => v.lang.startsWith("zh"));
    if (zhVoice) utterance.voice = zhVoice;
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);
    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);
  }, [content]);

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} my-2 items-start gap-2`}>
      {!isUser && (
        <button
          type="button"
          onClick={handleSpeakClick}
          aria-label={isPlaying ? "Stop playback" : "Read aloud"}
          className="shrink-0 p-1.5 rounded-md text-gray-500 hover:bg-gray-200 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-1"
          title={isPlaying ? "Stop playback" : "Read aloud"}
        >
          {isPlaying ? <StopIcon /> : <SoundIcon />}
        </button>
      )}
      <div
        className={`max-w-[85%] rounded-lg px-4 py-2 ${
          isUser ? "bg-blue-100 text-blue-900" : "bg-gray-100 text-gray-900"
        }`}
      >
        <div className="whitespace-pre-wrap break-words">{displayContent}</div>
      </div>
      {isUser && (
        <button
          type="button"
          onClick={handleSpeakClick}
          aria-label={isPlaying ? "Stop playback" : "Read aloud"}
          className="shrink-0 p-1.5 rounded-md text-gray-500 hover:bg-gray-200 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-1"
          title={isPlaying ? "Stop playback" : "Read aloud"}
        >
          {isPlaying ? <StopIcon /> : <SoundIcon />}
        </button>
      )}
    </div>
  );
}
