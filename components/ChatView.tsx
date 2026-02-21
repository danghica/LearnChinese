"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import MessageBlock from "./MessageBlock";
import WordLookupNote from "./WordLookupNote";

export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  segments?: string[];
};

export type TrafficLogEntry = {
  id: string;
  request: { url: string; method: string; body: unknown };
  response: { status: number; body: unknown };
  timestamp: string;
};

const MAX_TRAFFIC_LOG = 20;

type Props = {
  initialMessages: Message[];
  conversationId: string | null;
  newWordsPerConversation: number;
  topic?: string;
  debugMode?: boolean;
};

export default function ChatView({
  initialMessages,
  conversationId,
  newWordsPerConversation,
  topic,
  debugMode = false,
}: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [convId, setConvId] = useState<string | null>(conversationId);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wordLookup, setWordLookup] = useState<Record<string, { pinyin: string; english_translation: string }>>({});
  const [lookupNote, setLookupNote] = useState<{ word: string; pinyin: string; english_translation: string } | null>(null);
  const [trafficLog, setTrafficLog] = useState<TrafficLogEntry[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const debugPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Only sync from props when parent is passing loaded conversation data (e.g. "Continue").
    // When parent passes [] and null (default), do not overwrite local state—avoids reset on re-render (e.g. opening/closing Settings).
    const hasLoadedConversation = initialMessages.length > 0 || conversationId !== null;
    if (!hasLoadedConversation) return;
    setMessages(initialMessages);
    setConvId(conversationId);
    setLookupNote(null);
  }, [initialMessages, conversationId]);

  const appendTraffic = useCallback((request: { url: string; method: string; body: unknown }, response: { status: number; body: unknown }) => {
    setTrafficLog((prev) => {
      const next = [{ id: crypto.randomUUID(), request, response, timestamp: new Date().toISOString() }, ...prev];
      return next.slice(0, MAX_TRAFFIC_LOG);
    });
  }, []);

  const sendRequest = useCallback(
    async (requestBody: { messages: { role: string; content: string }[]; conversationId: string | null; newWordsPerConversation: number; topic?: string }) => {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      const data = await res.json();
      if (debugMode) appendTraffic({ url: "/api/chat", method: "POST", body: requestBody }, { status: res.status, body: data });
      if (!res.ok) throw new Error(data.error || "Request failed");
      return data;
    },
    [debugMode, appendTraffic]
  );

  const handleNextChat = useCallback(async () => {
    const text = input.trim();
    if (loading) return;
    setLookupNote(null);
    setConvId(null);
    setMessages([]);
    setError(null);
    setLoading(true);
    const body = {
      messages: [{ role: "user", content: text || "Start" }],
      conversationId: null,
      newWordsPerConversation,
      topic: text ? text : undefined,
    };
    try {
      const data = await sendRequest(body);
      setConvId(data.conversationId ?? null);
      const userContent = text || "Start";
      const assistantMsg: Message = {
        id: data.messageId,
        role: "assistant",
        content: data.content,
        segments: data.segments?.map((s: { word: string }) => s.word) ?? undefined,
      };
      setMessages([
        { id: crypto.randomUUID(), role: "user", content: userContent },
        assistantMsg,
      ]);
      setInput("");
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [input, loading, newWordsPerConversation, sendRequest]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const text = input.trim();
      if (!text || loading) return;
      setInput("");
      setLookupNote(null);
      setLoading(true);
      setError(null);
      const body = {
        messages: [...messages.map((m) => ({ role: m.role, content: m.content })), { role: "user", content: text }],
        conversationId: convId,
        newWordsPerConversation,
        topic,
      };
      try {
        const data = await sendRequest(body);
        if (data.conversationId) setConvId(data.conversationId);
        const assistantMsg: Message = {
          id: data.messageId,
          role: "assistant",
          content: data.content,
          segments: data.segments?.map((s: { word: string }) => s.word) ?? undefined,
        };
        setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", content: text }, assistantMsg]);
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    },
    [input, loading, messages, convId, newWordsPerConversation, topic, sendRequest]
  );

  const handleWordClick = useCallback(async (word: string) => {
    const cached = wordLookup[word];
    if (cached) {
      setLookupNote({ word, ...cached });
      return;
    }
    try {
      let res = await fetch(`/api/words?word=${encodeURIComponent(word)}`);
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
            // use default
          }
          setLookupNote({ word, pinyin: "", english_translation: errorText });
          return;
        }
        res = addRes;
      }
      const data = await res.json();
      const info = { pinyin: data.pinyin, english_translation: data.english_translation };
      setWordLookup((prev) => ({ ...prev, [word]: info }));
      setLookupNote({ word, ...info });
      await fetch("/api/usage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wordId: data.id, correct: false }),
      });
    } catch {
      setLookupNote({ word, pinyin: "", english_translation: "Lookup failed" });
    }
  }, [wordLookup]);

  return (
    <div className="flex flex-col flex-1 min-h-0 max-w-3xl mx-auto w-full">
      {/* Output text box: read-only area showing assistant (and optionally thread) output */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-1 min-h-0">
        {messages.map((m) => (
          <div key={m.id}>
            <MessageBlock
              role={m.role}
              content={m.content}
              segments={m.segments}
              wordLookup={wordLookup}
              onWordClick={m.role === "assistant" ? handleWordClick : undefined}
            />
          </div>
        ))}
        {lookupNote && (
          <WordLookupNote
            word={lookupNote.word}
            pinyin={lookupNote.pinyin}
            english_translation={lookupNote.english_translation}
          />
        )}
        {loading && (
          <div className="flex justify-start my-2">
            <div className="bg-gray-100 rounded-lg px-4 py-2 text-gray-500">...</div>
          </div>
        )}
      </div>
      {error && <p className="text-red-600 text-sm px-4 shrink-0">{error}</p>}
      {/* Input area + Send + Next chat */}
      <form onSubmit={handleSubmit} className="p-4 border-t bg-white shrink-0">
        <div className="flex flex-wrap gap-2 items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (input.trim() && !loading) {
                  const form = e.currentTarget.form;
                  if (form) form.requestSubmit();
                }
              }
            }}
            placeholder="Type your message..."
            rows={2}
            className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 rounded-md focus:ring focus:ring-blue-200 focus:border-blue-500 resize-none"
            disabled={loading}
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
            <button
              type="button"
              onClick={handleNextChat}
              disabled={loading}
              className="py-2 px-4 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next chat
            </button>
          </div>
        </div>
      </form>
      {debugMode && (
        <div
          ref={debugPanelRef}
          className="border-t border-gray-300 bg-gray-900 text-gray-100 flex flex-col min-h-0 max-h-[220px] shrink-0"
        >
          <div className="px-3 py-1.5 text-xs font-medium text-gray-400 border-b border-gray-700 shrink-0">
            LLM traffic (POST /api/chat)
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2 text-xs font-mono">
            {trafficLog.length === 0 && (
              <p className="text-gray-500">No requests yet. Send a message or click Next chat.</p>
            )}
            {trafficLog.map((entry) => (
              <details key={entry.id} className="bg-gray-800 rounded p-2">
                <summary className="cursor-pointer text-gray-300">
                  {entry.timestamp} — {entry.request.method} {entry.request.url} → {entry.response.status}
                </summary>
                <div className="mt-2 space-y-2 text-gray-400">
                  <div>
                    <span className="text-amber-400">Request body:</span>
                    <pre className="mt-0.5 whitespace-pre-wrap break-all overflow-x-auto">
                      {JSON.stringify(entry.request.body, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <span className="text-amber-400">Response ({entry.response.status}):</span>
                    <pre className="mt-0.5 whitespace-pre-wrap break-all overflow-x-auto">
                      {JSON.stringify(entry.response.body, null, 2)}
                    </pre>
                  </div>
                  {entry.response.status === 200 &&
                    Array.isArray((entry.response.body as { usage_recorded?: unknown })?.usage_recorded) && (
                      <div>
                        <span className="text-amber-400">Word DB updates:</span>
                        <p className="mt-0.5 text-gray-300">
                          {(entry.response.body as { usage_recorded: { word: string; correct: boolean }[] })
                            .usage_recorded.length === 0
                            ? "No usage recorded this turn."
                            : `${(entry.response.body as { usage_recorded: { word: string; correct: boolean }[] }).usage_recorded.length} usage record(s): ${(entry.response.body as { usage_recorded: { word: string; correct: boolean }[] })
                                .usage_recorded.map((u) => `${u.word} (${u.correct ? "correct" : "incorrect"})`)
                                .join(", ")}`}
                        </p>
                      </div>
                    )}
                </div>
              </details>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
