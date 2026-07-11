"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useWakeLockWhilePlaying } from "@/hooks/useWakeLockWhilePlaying";
import ChatView from "@/components/ChatView";
import StoryArticle from "@/components/StoryArticle";
import { getChineseVoice } from "@/lib/speech";
import {
  STORY_STORAGE_KEY,
  parseStoryStorage,
  type StoryBlock,
} from "@/lib/storyStorage";

const NEW_WORDS_KEY = "chinese-vocab-newWordsPerConversation";
const DEBUG_MODE_KEY = "chinese-vocab-debugMode";
const DEFAULT_NEW_WORDS = 10;

function getStoredNewWords(): number {
  if (typeof window === "undefined") return DEFAULT_NEW_WORDS;
  const v = localStorage.getItem(NEW_WORDS_KEY);
  const n = parseInt(v ?? "", 10);
  return Number.isNaN(n) ? DEFAULT_NEW_WORDS : Math.max(1, Math.min(50, n));
}

function getStoredDebugMode(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(DEBUG_MODE_KEY) === "true";
}

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

function StoryPageContent() {
  const searchParams = useSearchParams();
  const storyIdParam = searchParams.get("id");
  const [blocks, setBlocks] = useState<StoryBlock[] | null>(null);
  const [storyTopic, setStoryTopic] = useState<string | undefined>(undefined);
  const [newWordsPerConversation, setNewWordsPerConversation] = useState(DEFAULT_NEW_WORDS);
  const [debugMode, setDebugMode] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(!!storyIdParam);
  const [loadError, setLoadError] = useState<string | null>(null);
  useWakeLockWhilePlaying(isPlaying);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setNewWordsPerConversation(getStoredNewWords());
    setDebugMode(getStoredDebugMode());

    const id = storyIdParam ? parseInt(storyIdParam, 10) : NaN;
    if (storyIdParam && !Number.isNaN(id) && id > 0) {
      setLoading(true);
      setLoadError(null);
      fetch(`/api/stories/${id}`)
        .then(async (res) => {
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || "Story not found");
          }
          return res.json();
        })
        .then((data: { blocks: StoryBlock[]; topic?: string | null }) => {
          setBlocks(data.blocks);
          setStoryTopic(typeof data.topic === "string" ? data.topic : undefined);
        })
        .catch((err) => {
          setBlocks(null);
          setLoadError(err instanceof Error ? err.message : "Failed to load story");
        })
        .finally(() => setLoading(false));
      return;
    }

    const data = parseStoryStorage(window.sessionStorage.getItem(STORY_STORAGE_KEY));
    if (!data) {
      setBlocks(null);
      return;
    }
    setBlocks(data.blocks);
    setStoryTopic(data.topic);
    setLoading(false);
  }, [storyIdParam]);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex flex-col items-center justify-center">
        <p className="text-gray-600">Loading story…</p>
      </div>
    );
  }

  if (blocks === null) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex flex-col items-center justify-center">
        <p className="text-gray-600 mb-4">{loadError || "No story loaded."}</p>
        <div className="flex gap-4 text-sm">
          <Link href="/stories" className="text-blue-600 hover:underline">
            All stories
          </Link>
          <Link href="/" className="text-blue-600 hover:underline">
            Back to chat
          </Link>
        </div>
      </div>
    );
  }

  const storyContext = blocks.map((b) => b.chinese).join("\n");

  return (
    <main className="bg-gray-50 text-gray-900 flex flex-col h-[100dvh] min-h-0">
      <header className="flex flex-wrap items-center gap-3 px-4 py-2 border-b bg-white shrink-0 max-w-3xl mx-auto w-full">
        <Link href="/" className="text-blue-600 hover:underline text-sm">
          Back to chat
        </Link>
        <Link href="/stories" className="text-blue-600 hover:underline text-sm">
          All stories
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
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <ChatView
          initialMessages={[]}
          conversationId={null}
          newWordsPerConversation={newWordsPerConversation}
          topic={storyTopic}
          debugMode={debugMode}
          storyContext={storyContext}
          variant="story"
          headerContent={({ onWordClick }) => <StoryArticle blocks={blocks} onWordClick={onWordClick} />}
        />
      </div>
    </main>
  );
}

export default function StoryPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 p-6 text-gray-600">Loading…</div>}>
      <StoryPageContent />
    </Suspense>
  );
}
