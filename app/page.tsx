"use client";

import { useState, useEffect, useCallback } from "react";
import ChatView from "@/components/ChatView";
import SettingsMenu from "@/components/SettingsMenu";

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

export default function Home() {
  const [newWordsPerConversation, setNewWordsPerConversation] = useState(DEFAULT_NEW_WORDS);
  const [debugMode, setDebugMode] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    setNewWordsPerConversation(getStoredNewWords());
    setDebugMode(getStoredDebugMode());
  }, []);

  const handleNewWordsChange = useCallback((n: number) => {
    setNewWordsPerConversation(n);
    if (typeof window !== "undefined") localStorage.setItem(NEW_WORDS_KEY, String(n));
  }, []);

  const handleDebugChange = useCallback((on: boolean) => {
    setDebugMode(on);
    if (typeof window !== "undefined") localStorage.setItem(DEBUG_MODE_KEY, on ? "true" : "false");
  }, []);

  return (
    <main className="bg-gray-50 flex flex-col max-h-[85vh] min-h-0">
      <header className="flex justify-between items-center px-4 py-2 border-b bg-white">
        <h1 className="text-lg font-semibold text-gray-900">Chinese vocabulary chat</h1>
        <div className="relative">
          <button
            type="button"
            onClick={() => setSettingsOpen((o) => !o)}
            className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded"
          >
            Settings
          </button>
          <SettingsMenu
            newWordsPerConversation={newWordsPerConversation}
            onNewWordsChange={handleNewWordsChange}
            debugMode={debugMode}
            onDebugChange={handleDebugChange}
            open={settingsOpen}
            onClose={() => setSettingsOpen(false)}
          />
        </div>
      </header>
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <ChatView
          initialMessages={[]}
          conversationId={null}
          newWordsPerConversation={newWordsPerConversation}
          debugMode={debugMode}
        />
      </div>
    </main>
  );
}
