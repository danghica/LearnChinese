"use client";

import { useState, useEffect, useCallback } from "react";
import EntryScreen from "@/components/EntryScreen";
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
  const [view, setView] = useState<"entry" | "chat">("entry");
  const [topic, setTopic] = useState<string>("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [initialMessages, setInitialMessages] = useState<{ id: string; role: "user" | "assistant"; content: string }[]>([]);
  const [newWordsPerConversation, setNewWordsPerConversation] = useState(DEFAULT_NEW_WORDS);
  const [debugMode, setDebugMode] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    setNewWordsPerConversation(getStoredNewWords());
    setDebugMode(getStoredDebugMode());
  }, []);

  const handleNew = useCallback((t: string) => {
    setTopic(t);
    setConversationId(null);
    setInitialMessages([]);
    setView("chat");
  }, []);

  const handleContinue = useCallback(async () => {
    try {
      const res = await fetch("/api/conversations/current");
      const data = await res.json();
      setConversationId(data.id ?? null);
      setInitialMessages(
        (data.messages ?? []).map((m: { id: string; role: string; content: string }) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          content: m.content,
        }))
      );
      setTopic(data.topic ?? "");
      setView("chat");
    } catch {
      setConversationId(null);
      setInitialMessages([]);
      setView("chat");
    }
  }, []);

  const handleNewWordsChange = useCallback((n: number) => {
    setNewWordsPerConversation(n);
    if (typeof window !== "undefined") localStorage.setItem(NEW_WORDS_KEY, String(n));
  }, []);

  const handleDebugChange = useCallback((on: boolean) => {
    setDebugMode(on);
    if (typeof window !== "undefined") localStorage.setItem(DEBUG_MODE_KEY, on ? "true" : "false");
  }, []);

  if (view === "entry") {
    return (
      <main className="min-h-0 bg-gray-50 max-h-[85vh]">
        <EntryScreen onNew={handleNew} onContinue={handleContinue} />
      </main>
    );
  }

  return (
    <main className="bg-gray-50 flex flex-col max-h-[85vh] min-h-0">
      <header className="flex justify-between items-center px-4 py-2 border-b bg-white">
        <h1 className="text-lg font-semibold text-gray-900">Chinese vocabulary chat</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleNew("")}
            className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded"
          >
            New conversation
          </button>
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
        </div>
      </header>
      <ChatView
        initialMessages={initialMessages}
        conversationId={conversationId}
        newWordsPerConversation={newWordsPerConversation}
        topic={topic || undefined}
        debugMode={debugMode}
      />
    </main>
  );
}
