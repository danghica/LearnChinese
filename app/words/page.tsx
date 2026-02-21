"use client";

import React, { useState, useEffect, useCallback, useRef, Suspense } from "react";

const PAGE_SIZE = 100;

type WordRow = {
  id: number;
  word: string;
  frequency: number;
  pinyin: string;
  english_translation: string;
  score: number;
};

type UsageHistory = { timestamp: string; correct: boolean }[];

function WordsContent() {
  const [words, setWords] = useState<WordRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [offset, setOffset] = useState(0);
  const [expandedWord, setExpandedWord] = useState<string | null>(null);
  const [usageCache, setUsageCache] = useState<Record<string, UsageHistory>>({});
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchWords = useCallback(async (off: number, searchTerm: string) => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      limit: String(PAGE_SIZE),
      offset: String(off),
    });
    if (searchTerm.trim()) params.set("search", searchTerm.trim());
    try {
      const res = await fetch(`/api/words?${params}`);
      if (!res.ok) throw new Error(res.statusText);
      const data = await res.json();
      setWords(data.words ?? []);
      setTotal(data.total ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(searchInput);
      setOffset(0);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput]);

  useEffect(() => {
    fetchWords(offset, search);
  }, [offset, search, fetchWords]);

  const fetchUsage = useCallback(async (word: string) => {
    if (usageCache[word]) {
      setExpandedWord((w) => (w === word ? null : word));
      return;
    }
    setExpandedWord(word);
    try {
      const res = await fetch(`/api/words?word=${encodeURIComponent(word)}`);
      if (!res.ok) return;
      const data = await res.json();
      const history: UsageHistory = (data.usage_history ?? []).map(
        (u: { timestamp: string; correct: boolean }) => ({ timestamp: u.timestamp, correct: u.correct })
      );
      setUsageCache((prev) => ({ ...prev, [word]: history }));
    } catch {
      setExpandedWord(null);
    }
  }, [usageCache]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-6">
      <header className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Word database</h1>
        <p className="text-sm text-gray-600 mt-1">
          Full list sorted by spaced repetition score (higher = more due). Not the same as current working vocabulary.
        </p>
      </header>

      <div className="mb-4 flex flex-wrap gap-4 items-center">
        <label className="flex items-center gap-2 text-sm text-gray-700">
          Search (word, pinyin, English):
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Filter..."
            className="px-2 py-1 border border-gray-300 rounded w-48"
          />
        </label>
      </div>

      {loading ? (
        <p className="text-gray-600">Loading…</p>
      ) : (
        <>
          <div className="overflow-x-auto border border-gray-200 rounded-lg bg-white shadow-sm">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100 border-b border-gray-200">
                <tr>
                  <th className="text-left py-2 px-3 font-medium text-gray-700">score</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700">word</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700">frequency</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700">pinyin</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700">english_translation</th>
                  <th className="w-20" />
                </tr>
              </thead>
              <tbody>
                {words.map((row) => (
                  <React.Fragment key={row.id}>
                    <tr className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-3">{row.score}</td>
                      <td className="py-2 px-3 font-medium">{row.word}</td>
                      <td className="py-2 px-3">{row.frequency}</td>
                      <td className="py-2 px-3">{row.pinyin}</td>
                      <td className="py-2 px-3">{row.english_translation}</td>
                      <td className="py-2 px-3">
                        <button
                          type="button"
                          onClick={() => fetchUsage(row.word)}
                          className="text-blue-600 hover:underline text-xs"
                        >
                          {expandedWord === row.word ? "Hide usage" : "View usage"}
                        </button>
                      </td>
                    </tr>
                    {expandedWord === row.word && (
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <td colSpan={6} className="py-3 px-3">
                          <div className="text-sm">
                            <span className="font-medium text-gray-700">Usage history: {row.word}</span>
                            {usageCache[row.word] === undefined ? (
                              <p className="text-gray-500 mt-1">Loading…</p>
                            ) : usageCache[row.word].length === 0 ? (
                              <p className="text-gray-500 mt-1">(none)</p>
                            ) : (
                              <ul className="mt-1 space-y-0.5">
                                {usageCache[row.word].map((u, i) => (
                                  <li key={i}>
                                    {u.timestamp} — correct: {u.correct ? "yes" : "no"}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center gap-4 text-sm text-gray-600">
            <span>
              Page {currentPage} of {totalPages} ({total} words)
            </span>
            <button
              type="button"
              onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
              disabled={offset === 0 || loading}
              className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setOffset((o) => o + PAGE_SIZE)}
              disabled={offset + PAGE_SIZE >= total || loading}
              className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function WordsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-600">Loading…</div>}>
      <WordsContent />
    </Suspense>
  );
}
