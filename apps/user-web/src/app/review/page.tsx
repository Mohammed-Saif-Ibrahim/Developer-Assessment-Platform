"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { getAttempts } from "@/lib/localState";
import type { AttemptResult } from "@dap/types";

export default function ReviewPage() {
  const [history, setHistory] = useState<AttemptResult[]>([]);

  useEffect(() => {
    setHistory(getAttempts());
  }, []);

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-4xl px-6 py-14">
        <h1 className="font-display text-3xl font-medium tracking-tight">Review</h1>
        <p className="mt-2 text-[15px] text-[var(--muted)]">
          Jump back into any past assessment to see every question, your answer, and
          the explanation.
        </p>

        {history.length === 0 ? (
          <div className="mt-10 border border-dashed border-[var(--border)] px-6 py-16 text-center">
            <p className="text-[var(--muted)]">
              Nothing to review yet. This list fills up as you complete assessments on
              this device.
            </p>
            <Link
              href="/subjects"
              className="mt-6 inline-flex h-10 items-center border border-[var(--fg)] bg-[var(--fg)] px-5 font-mono text-[12px] uppercase tracking-widest text-[var(--bg)]"
            >
              Start an assessment
            </Link>
          </div>
        ) : (
          <div className="mt-10 divide-y divide-[var(--border)] border border-[var(--border)]">
            {history.map((h) => (
              <Link
                key={h.attemptId}
                href={`/results/${h.attemptId}`}
                className="flex items-center justify-between px-4 py-4 transition-colors hover:bg-[var(--panel)]"
              >
                <span className="text-[13px]">{new Date(h.createdAt).toLocaleString()}</span>
                <span className="mono-tag text-[12px] text-[var(--muted)]">
                  {h.score}/{h.totalQuestions} &middot; {h.accuracy}%
                </span>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
