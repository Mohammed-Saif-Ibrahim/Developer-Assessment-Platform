"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ProgressOverview } from "@dap/types";
import Header from "@/components/Header";
import { computeProgress } from "@/lib/quizEngine";

export default function ProgressPage() {
  const [progress, setProgress] = useState<ProgressOverview | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    computeProgress()
      .then((data) => {
        setProgress(data);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, []);

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-4xl px-6 py-14">
        <h1 className="font-display text-3xl font-medium tracking-tight">Your progress</h1>
        <p className="mt-2 text-[15px] text-[var(--muted)]">
          Calculated from every assessment you've submitted on this device.
        </p>

        {status === "loading" && (
          <div className="mt-10 space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 animate-pulse border border-[var(--border)] bg-[var(--panel)]" />
            ))}
          </div>
        )}

        {status === "error" && (
          <p className="mt-10 border border-[var(--border)] px-4 py-6 text-[14px] text-[var(--muted)]">
            Couldn't load progress right now. Try again shortly.
          </p>
        )}

        {status === "ready" && progress && progress.totalAttempts === 0 && (
          <div className="mt-10 border border-dashed border-[var(--border)] px-6 py-16 text-center">
            <p className="text-[var(--muted)]">
              No attempts yet. Complete an assessment to start building your progress
              picture.
            </p>
            <Link
              href="/subjects"
              className="mt-6 inline-flex h-10 items-center border border-[var(--fg)] bg-[var(--fg)] px-5 font-mono text-[12px] uppercase tracking-widest text-[var(--bg)]"
            >
              Start practicing
            </Link>
          </div>
        )}

        {status === "ready" && progress && progress.totalAttempts > 0 && (
          <>
            <div className="mt-10 grid grid-cols-3 gap-px overflow-hidden border border-[var(--border)] bg-[var(--border)]">
              <div className="bg-[var(--bg)] p-4">
                <p className="mono-tag text-[10px] uppercase tracking-widest text-[var(--muted)]">
                  Attempts
                </p>
                <p className="mt-2 font-display text-2xl font-medium">{progress.totalAttempts}</p>
              </div>
              <div className="bg-[var(--bg)] p-4">
                <p className="mono-tag text-[10px] uppercase tracking-widest text-[var(--muted)]">
                  Questions answered
                </p>
                <p className="mt-2 font-display text-2xl font-medium">
                  {progress.totalQuestionsAnswered}
                </p>
              </div>
              <div className="bg-[var(--bg)] p-4">
                <p className="mono-tag text-[10px] uppercase tracking-widest text-[var(--muted)]">
                  Overall accuracy
                </p>
                <p className="mt-2 font-display text-2xl font-medium">
                  {progress.overallAccuracy}%
                </p>
              </div>
            </div>

            {progress.weakAreas.length > 0 && (
              <section className="mt-10 border border-[var(--border)] p-5">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-lg font-medium">Weak areas</h2>
                  <Link
                    href="/subjects"
                    className="mono-tag text-[11px] uppercase tracking-widest text-[var(--muted)] hover:text-[var(--fg)]"
                  >
                    Practice these &rarr;
                  </Link>
                </div>
                <p className="mt-1 text-[13px] text-[var(--muted)]">
                  Topics below your accuracy threshold across at least a handful of attempts.
                </p>
                <div className="mt-4 space-y-2">
                  {progress.weakAreas.map((w) => (
                    <div key={w.topicId} className="flex items-center justify-between text-[13px]">
                      <span>
                        {w.topicName} <span className="text-[var(--muted)]">&middot; {w.subjectName}</span>
                      </span>
                      <span className="mono-tag text-[var(--muted)]">
                        {w.accuracy}% &middot; {w.attempts} attempts
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="mt-10">
              <h2 className="font-display text-lg font-medium">By subject</h2>
              <div className="mt-4 space-y-2">
                {progress.bySubject.map((s) => (
                  <div key={s.subjectId} className="flex items-center gap-4">
                    <span className="w-28 shrink-0 truncate text-[13px]">{s.subjectName}</span>
                    <div className="h-2 flex-1 bg-[var(--border)]">
                      <div className="h-2 bg-[var(--fg)]" style={{ width: `${s.accuracy}%` }} />
                    </div>
                    <span className="mono-tag w-24 shrink-0 text-right text-[12px] text-[var(--muted)]">
                      {s.accuracy}% &middot; {s.attempts}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-10">
              <h2 className="font-display text-lg font-medium">By topic</h2>
              <div className="mt-4 divide-y divide-[var(--border)] border border-[var(--border)]">
                {progress.byTopic
                  .sort((a, b) => a.accuracy - b.accuracy)
                  .map((t) => (
                    <div key={t.topicId} className="flex items-center justify-between px-4 py-3 text-[13px]">
                      <span className="flex items-center gap-2">
                        {t.topicName}
                        {t.isWeak && (
                          <span className="mono-tag border border-[var(--border)] px-1.5 py-0.5 text-[10px] uppercase text-[var(--muted)]">
                            weak
                          </span>
                        )}
                      </span>
                      <span className="mono-tag text-[var(--muted)]">
                        {t.accuracy}% &middot; {t.attempts} attempts
                      </span>
                    </div>
                  ))}
              </div>
            </section>

            <section className="mt-10">
              <h2 className="font-display text-lg font-medium">Recent attempts</h2>
              <div className="mt-4 divide-y divide-[var(--border)] border border-[var(--border)]">
                {progress.recentAttempts.map((a) => (
                  <Link
                    key={a.attemptId}
                    href={`/results/${a.attemptId}`}
                    className="flex items-center justify-between px-4 py-3 text-[13px] transition-colors hover:bg-[var(--panel)]"
                  >
                    <span>{new Date(a.createdAt).toLocaleString()}</span>
                    <span className="mono-tag text-[var(--muted)]">
                      {a.score}/{a.totalQuestions} &middot; {a.accuracy}%
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
