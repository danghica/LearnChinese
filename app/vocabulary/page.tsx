"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { pinyinToDiacritic } from "@/lib/pinyin";

type WordDetail = {
  id: number;
  word: string;
  frequency: number;
  pinyin: string;
  english_translation: string;
  created_at: string | null;
  usage: { timestamp: string; correct: number }[];
};

function VocabularyContent() {
  const searchParams = useSearchParams();
  const newWordsParam = searchParams.get("newWordsPerConversation");
  const debugParam = searchParams.get("debug");
  const newWordsPerConversation = newWordsParam
    ? Math.max(1, Math.min(50, parseInt(newWordsParam, 10) || 10))
    : 10;
  const debug = debugParam === "true" || debugParam === "1" || debugParam === "yes";

  const [vocabulary, setVocabulary] = useState<string[] | WordDetail[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const url = `/api/vocabulary?newWordsPerConversation=${newWordsPerConversation}&debug=${debug}`;
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(res.statusText);
        return res.json();
      })
      .then((data) => {
        setVocabulary(data.vocabulary ?? []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [newWordsPerConversation, debug]);

  if (loading) {
    return (
      <div className="p-6 text-gray-600">
        Loading vocabulary…
      </div>
    );
  }
  if (error) {
    return (
      <div className="p-6 text-red-600">
        {error}
      </div>
    );
  }
  if (!vocabulary || vocabulary.length === 0) {
    return (
      <div className="p-6 text-gray-600">
        No vocabulary data.
      </div>
    );
  }

  const count = vocabulary.length;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-6">
      <header className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Current working vocabulary</h1>
        <p className="text-sm text-gray-600 mt-1">{count} words</p>
      </header>

      {!debug ? (
        <p className="text-gray-800 leading-relaxed">
          {Array.isArray(vocabulary)
            ? (vocabulary as string[]).join(", ")
            : (vocabulary as WordDetail[]).map((x) => x.word).join(", ")}
        </p>
      ) : (
        <div className="space-y-4">
          {(vocabulary as WordDetail[]).map((item) => (
            <div
              key={item.id || item.word}
              className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <div><span className="font-medium text-gray-500">word:</span> {item.word}</div>
                <div><span className="font-medium text-gray-500">frequency:</span> {item.frequency}</div>
                <div><span className="font-medium text-gray-500">pinyin:</span> {pinyinToDiacritic(item.pinyin)}</div>
                <div><span className="font-medium text-gray-500">english_translation:</span> {item.english_translation}</div>
                {item.created_at != null && (
                  <div className="sm:col-span-2"><span className="font-medium text-gray-500">created_at:</span> {item.created_at}</div>
                )}
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100">
                <span className="font-medium text-gray-500 text-sm">usage history:</span>
                {item.usage.length === 0 ? (
                  <p className="text-gray-500 text-sm mt-1">(none)</p>
                ) : (
                  <ul className="mt-1 text-sm space-y-0.5">
                    {item.usage.map((u, i) => (
                      <li key={i}>
                        {u.timestamp} — correct: {u.correct}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function VocabularyPage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-600">Loading…</div>}>
      <VocabularyContent />
    </Suspense>
  );
}
