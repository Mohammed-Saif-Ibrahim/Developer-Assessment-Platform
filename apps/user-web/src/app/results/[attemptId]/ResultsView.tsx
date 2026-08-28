"use client";

import Link from "next/link";
import { useState } from "react";
import type { AttemptResult } from "@dap/types";
import { CodeBlock, DifficultyBadge } from "@/components/ui";

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function ResultsView({ result }: { result: AttemptResult }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const stats = [
    { label: "Score", value: `${result.score} / ${result.totalQuestions}` },
    { label: "Accuracy", value: `${result.accuracy}%` },
    { label: "Time", value: formatTime(result.totalTimeSeconds) },
    { label: "Correct", value: result.correct },
    { label: "Incorrect", value: result.incorrect },
    { label: "Unanswered", value: result.unanswered },
  ];

  return (
    <main className="mx-auto max-w-4xl px-6 py-14">
      <p className="mono-tag text-[11px] uppercase tracking-widest text-[var(--muted)]">
        Assessment complete
      </p>
      <h1 className="mt-2 font-display text-3xl font-medium tracking-tight">
        {result.accuracy >= 70 ? "Solid work." : "Good rep — here's where to focus next."}
      </h1>

      <div className="mt-8 grid grid-cols-2 gap-px overflow-hidden border border-[var(--border)] bg-[var(--border)] sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((s) => (
          <div key={s.label} className="bg-[var(--bg)] p-4">
            <p className="mono-tag text-[10px] uppercase tracking-widest text-[var(--muted)]">
              {s.label}
            </p>
            <p className="mt-2 font-display text-2xl font-medium">{s.value}</p>
          </div>
        ))}
      </div>

      {result.topicPerformance.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-lg font-medium">Topic performance</h2>
          <div className="mt-4 space-y-2">
            {result.topicPerformance.map((t) => (
              <div key={t.topicId} className="flex items-center gap-4">
                <span className="w-32 shrink-0 truncate text-[13px]">{t.topicName}</span>
                <div className="h-2 flex-1 bg-[var(--border)]">
                  <div
                    className="h-2 bg-[var(--fg)]"
                    style={{ width: `${t.accuracy}%` }}
                  />
                </div>
                <span className="mono-tag w-12 shrink-0 text-right text-[12px] text-[var(--muted)]">
                  {t.accuracy}%
                </span>
              </div>
            ))}
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="border border-[var(--border)] p-4">
              <p className="mono-tag text-[11px] uppercase tracking-widest text-[var(--muted)]">
                Strong areas
              </p>
              <ul className="mt-3 space-y-1.5 text-[14px]">
                {result.strongAreas.length === 0 && (
                  <li className="text-[var(--muted)]">None yet — keep practicing.</li>
                )}
                {result.strongAreas.map((a) => (
                  <li key={a}>&rarr; {a}</li>
                ))}
              </ul>
            </div>
            <div className="border border-[var(--border)] p-4">
              <p className="mono-tag text-[11px] uppercase tracking-widest text-[var(--muted)]">
                Weak areas
              </p>
              <ul className="mt-3 space-y-1.5 text-[14px]">
                {result.weakAreas.length === 0 && (
                  <li className="text-[var(--muted)]">None — nice, balanced run.</li>
                )}
                {result.weakAreas.map((a) => (
                  <li key={a}>&rarr; {a}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      <section className="mt-12">
        <h2 className="font-display text-lg font-medium">Review answers</h2>
        <div className="mt-4 divide-y divide-[var(--border)] border border-[var(--border)]">
          {result.answers.map((a, i) => {
            const isOpen = expanded === a.questionId;
            return (
              <div key={a.questionId}>
                <button
                  onClick={() => setExpanded(isOpen ? null : a.questionId)}
                  className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={`mono-tag flex h-6 w-6 shrink-0 items-center justify-center border text-[10px] ${
                        a.isCorrect
                          ? "border-[var(--fg)]"
                          : "border-[var(--border)] text-[var(--muted)]"
                      }`}
                    >
                      {a.isCorrect ? "✓" : "✕"}
                    </span>
                    <span className="truncate text-[14px]">{a.questionText}</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <DifficultyBadge difficulty={a.difficulty} />
                    <span className="mono-tag text-[11px] text-[var(--muted)]">
                      {isOpen ? "−" : "+"}
                    </span>
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-[var(--border)] bg-[var(--panel)] px-4 py-4">
                    {a.codeSnippet && (
                      <div className="mb-4">
                        <CodeBlock code={a.codeSnippet} language={null} />
                      </div>
                    )}
                    <div className="space-y-1.5">
                      {a.options.map((o, oi) => {
                        const wasSelected = a.selectedOptionIds.includes(o.id);
                        const isCorrectOption = a.correctOptionIds.includes(o.id);
                        return (
                          <div
                            key={o.id}
                            className={`flex items-center gap-3 border px-3 py-2 text-[13px] ${
                              isCorrectOption
                                ? "border-[var(--fg)]"
                                : wasSelected
                                  ? "border-[var(--border)] line-through opacity-60"
                                  : "border-[var(--border)]"
                            }`}
                          >
                            <span className="mono-tag flex h-5 w-5 shrink-0 items-center justify-center border border-[var(--border)] text-[10px]">
                              {String.fromCharCode(65 + oi)}
                            </span>
                            <span className="flex-1">{o.optionText}</span>
                            {isCorrectOption && (
                              <span className="mono-tag text-[10px] uppercase text-[var(--muted)]">
                                Correct
                              </span>
                            )}
                            {wasSelected && !isCorrectOption && (
                              <span className="mono-tag text-[10px] uppercase text-[var(--muted)]">
                                Your pick
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {a.explanation && (
                      <p className="mt-4 text-[13px] leading-relaxed text-[var(--muted)]">
                        {a.explanation}
                      </p>
                    )}
                    <p className="mt-3 mono-tag text-[11px] text-[var(--muted)]">
                      Topic: {a.topicName}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <div className="mt-10 flex gap-4">
        <Link
          href="/subjects"
          className="inline-flex h-11 items-center border border-[var(--fg)] bg-[var(--fg)] px-6 font-mono text-[13px] uppercase tracking-widest text-[var(--bg)]"
        >
          Practice again
        </Link>
        <Link
          href="/progress"
          className="inline-flex h-11 items-center border border-[var(--border)] px-6 font-mono text-[13px] uppercase tracking-widest"
        >
          View progress
        </Link>
      </div>
    </main>
  );
}
