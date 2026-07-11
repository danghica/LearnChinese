"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type StoryListItem = {
  id: number;
  topic: string | null;
  created_at: string;
  preview: string;
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function StoriesPage() {
  const router = useRouter();
  const [stories, setStories] = useState<StoryListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/stories")
      .then(async (res) => {
        if (!res.ok) throw new Error(res.statusText);
        return res.json();
      })
      .then((data: { stories?: StoryListItem[]; total?: number }) => {
        setStories(data.stories ?? []);
        setTotal(data.total ?? 0);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load stories");
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/" className="text-blue-600 hover:underline text-sm">
            Back to chat
          </Link>
        </div>

        <h1 className="text-2xl font-semibold text-gray-900 mb-2">All stories</h1>
        {!loading && !error && total > 0 && (
          <p className="text-sm text-gray-600 mb-6">{total} saved {total === 1 ? "story" : "stories"}</p>
        )}

        {loading && <p className="text-gray-600">Loading…</p>}
        {error && <p className="text-red-600">{error}</p>}

        {!loading && !error && stories.length === 0 && (
          <p className="text-gray-600">No stories yet. Generate one from the home page.</p>
        )}

        {!loading && !error && stories.length > 0 && (
          <ul className="space-y-3">
            {stories.map((story) => (
              <li key={story.id}>
                <button
                  type="button"
                  onClick={() => router.push(`/story?id=${story.id}`)}
                  className="w-full text-left p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50/30 transition-colors"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
                    <span className="font-medium text-gray-900">
                      {story.topic?.trim() || "Untitled story"}
                    </span>
                    <span className="text-xs text-gray-500 shrink-0">{formatDate(story.created_at)}</span>
                  </div>
                  {story.preview && (
                    <p className="text-sm text-gray-600 italic line-clamp-2">{story.preview}</p>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
