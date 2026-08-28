"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { Tag, DifficultyBadge } from "@/components/ui";
import { getBookmarks, removeBookmark as removeStoredBookmark } from "@/lib/localState";
import type { Bookmark } from "@dap/types";

export default function BookmarksPage() {
  const [items, setItems] = useState<Bookmark[]>([]);
  const [status, setStatus] = useState<"loading" | "ready">("loading");

  useEffect(() => {
    setItems(getBookmarks());
    setStatus("ready");
  }, []);

  function remove(questionId: string) {
    setItems((prev) => prev.filter((i) => i.questionId !== questionId));
    removeStoredBookmark(questionId);
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-4xl px-6 py-14">
        <h1 className="font-display text-3xl font-medium tracking-tight">Bookmarks</h1>
        <p className="mt-2 text-[15px] text-[var(--muted)]">
          Questions you saved while practicing, for quick review later.
        </p>

        {status === "loading" && (
          <div className="mt-10 space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 animate-pulse border border-[var(--border)] bg-[var(--panel)]" />
            ))}
          </div>
        )}

        {status === "ready" && items.length === 0 && (
          <div className="mt-10 border border-dashed border-[var(--border)] px-6 py-16 text-center">
            <p className="text-[var(--muted)]">
              No bookmarks yet. Tap "Bookmark" on any question during a quiz to save it
              here.
            </p>
            <Link
              href="/subjects"
              className="mt-6 inline-flex h-10 items-center border border-[var(--fg)] bg-[var(--fg)] px-5 font-mono text-[12px] uppercase tracking-widest text-[var(--bg)]"
            >
              Browse subjects
            </Link>
          </div>
        )}

        {status === "ready" && items.length > 0 && (
          <div className="mt-10 divide-y divide-[var(--border)] border border-[var(--border)]">
            {items.map((item) => (
              <div key={item.questionId} className="flex items-start justify-between gap-4 px-4 py-4">
                <div className="min-w-0">
                  <div className="mb-2 flex items-center gap-2">
                    <DifficultyBadge difficulty={item.difficulty} />
                    <Tag>{item.subjectName}</Tag>
                    <Tag>{item.topicName}</Tag>
                  </div>
                  <p className="text-[14px] leading-relaxed">{item.questionText}</p>
                </div>
                <button
                  onClick={() => remove(item.questionId)}
                  className="mono-tag shrink-0 text-[11px] uppercase tracking-widest text-[var(--muted)] hover:text-[var(--fg)]"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
