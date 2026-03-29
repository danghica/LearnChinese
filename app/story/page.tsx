"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import WordLookupNote from "@/components/WordLookupNote";
import { parseWordsApiErrorResponse } from "@/lib/parseWordsApiError";
import { getChineseVoice } from "@/lib/speech";

const STORY_STORAGE_KEY = "story-content";

type StoryBlock = {
  chinese: string;
  english: string;
  chineseComma: string;
  chineseWords: string[];
};

function SoundIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5" aria-hidden>
      <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.78 4.78a6.75 6.75 0 0 1-4.5 1.97H2.25A1.5 1.5 0 0 0 .75 9.5v6a1.5 1.5 0 0 0 1.5 1.5h1.41a6.75 6.75 0 0 1 4.5 1.97l4.78 4.78c.945.945 2.561.276 2.561-1.06V4.06Z" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5" aria-hidden>
      <path d="M5.25 7.5A2.25 2.25 0 0 1 7.5 5.25h9a2.25 2.25 0 0 1 2.25 2.25v9a2.25 2.25 0 0 1-2.25 2.25h-9a2.25 2.25 0 0 1-2.25-2.25v-9Z" />
    </svg>
  );
}

export default function StoryPage() {
  const [blocks, setBlocks] = useState<StoryBlock[] | null>(null);
  const [wordLookup, setWordLookup] = useState<Record<string, { pinyin: string; english_translation: string }>>({});
  const [lookupNote, setLookupNote] = useState<{ word: string; pinyin: string; english_translation: string } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.sessionStorage.getItem(STORY_STORAGE_KEY);
      if (!raw) {
        setBlocks(null);
        return;
      }
      const data = JSON.parse(raw) as { blocks?: StoryBlock[] };
      if (!Array.isArray(data?.blocks) || data.blocks.length === 0) {
        setBlocks(null);
        return;
      }
      setBlocks(data.blocks);
    } catch {
      setBlocks(null);
    }
  }, []);

  const handleWordClick = useCallback(async (word: string) => {
    const cached = wordLookup[word];
    if (cached) {
      setLookupNote({ word, ...cached });
      return;
    }
    try {
      let res = await fetch(`/api/words?word=${encodeURIComponent(word)}`);
      if (res.status !== 404 && !res.ok) {
        const errMsg = await parseWordsApiErrorResponse(res);
        setLookupNote({ word, pinyin: "", english_translation: errMsg });
        return;
      }
      if (res.status === 404) {
        setLookupNote({ word, pinyin: "", english_translation: "Looking up…" });
        const addRes = await fetch("/api/words", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ word }),
        });
        if (addRes.status !== 200 && addRes.status !== 201) {
          let errorText = "Not in vocabulary";
          try {
            const errBody = await addRes.clone().json();
            if (errBody?.details) errorText = errBody.details;
            else if (errBody?.error) errorText = errBody.error;
          } catch {
            // ignore
          }
          setLookupNote({ word, pinyin: "", english_translation: errorText });
          return;
        }
        res = addRes;
      }
      const data = (await res.json()) as {
        id?: number;
        pinyin?: string;
        english_translation?: string;
        words?: unknown;
      };
      if (Array.isArray(data.words) || typeof data.pinyin !== "string" || typeof data.english_translation !== "string") {
        setLookupNote({
          word,
          pinyin: "",
          english_translation: "Word lookup returned an unexpected response.",
        });
        return;
      }
      const info = { pinyin: data.pinyin, english_translation: data.english_translation };
      setWordLookup((prev) => ({ ...prev, [word]: info }));
      setLookupNote({ word, ...info });
      if (typeof data.id === "number") {
        await fetch("/api/usage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wordId: data.id, correct: false }),
        });
      }
    } catch {
      setLookupNote({ word, pinyin: "", english_translation: "Lookup failed" });
    }
  }, [wordLookup]);

  const handleReadClick = useCallback(async () => {
    if (typeof window === "undefined" || !window.speechSynthesis || !blocks?.length) return;
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }
    const zhVoice = await getChineseVoice();
    const utterances: SpeechSynthesisUtterance[] = [];
    for (const b of blocks) {
      if (b.english?.trim()) {
        const uEn = new SpeechSynthesisUtterance(b.english.trim());
        uEn.lang = "en";
        utterances.push(uEn);
      }
      // Same string as on-screen segmented row: "token1, token2, …"
      const segmented =
        b.chineseComma
          ?.split(",")
          .map((w) => w.trim())
          .filter(Boolean)
          .join(", ") ?? "";
      if (segmented) {
        const uSeg = new SpeechSynthesisUtterance(segmented);
        uSeg.lang = "zh-CN";
        if (zhVoice) uSeg.voice = zhVoice;
        utterances.push(uSeg);
      }
      if (b.chinese?.trim()) {
        const uZh = new SpeechSynthesisUtterance(b.chinese.trim());
        uZh.lang = "zh-CN";
        if (zhVoice) uZh.voice = zhVoice;
        utterances.push(uZh);
      }
    }
    if (utterances.length === 0) return;
    const last = utterances[utterances.length - 1];
    last.onend = () => setIsPlaying(false);
    last.onerror = () => setIsPlaying(false);
    utterances.forEach((u) => window.speechSynthesis.speak(u));
    setIsPlaying(true);
  }, [blocks]);

  if (blocks === null) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex flex-col items-center justify-center">
        <p className="text-gray-600 mb-4">No story loaded.</p>
        <Link href="/" className="text-blue-600 hover:underline">
          Back to chat
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-6 max-w-2xl mx-auto">
      <header className="flex flex-wrap items-center gap-3 mb-6">
        <Link href="/" className="text-blue-600 hover:underline text-sm">
          Back to chat
        </Link>
        <button
          type="button"
          onClick={handleReadClick}
          aria-label={isPlaying ? "Stop playback" : "Read aloud"}
          className="ml-auto flex items-center gap-2 py-2 px-4 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          title={isPlaying ? "Stop playback" : "Read aloud"}
        >
          {isPlaying ? <StopIcon /> : <SoundIcon />}
          <span>{isPlaying ? "Stop" : "Read"}</span>
        </button>
      </header>

      {lookupNote && (
        <WordLookupNote
          word={lookupNote.word}
          pinyin={lookupNote.pinyin}
          english_translation={lookupNote.english_translation}
        />
      )}

      <article className="space-y-6">
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
                      onClick={() => handleWordClick(token)}
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
    </div>
  );
}
