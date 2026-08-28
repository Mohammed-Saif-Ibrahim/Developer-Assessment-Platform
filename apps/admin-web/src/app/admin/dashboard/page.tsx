"use client";

import { useEffect, useState } from "react";
import type { DashboardStats } from "@dap/types";
import AdminShell from "@/components/AdminShell";
import { adminApi } from "@/lib/api";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    adminApi.getDashboard().then(setStats).catch(() => {});
  }, []);

  const cards = stats
    ? [
        { label: "Total subjects", value: stats.totalSubjects },
        { label: "Total topics", value: stats.totalTopics },
        { label: "Total questions", value: stats.totalQuestions },
        { label: "Published questions", value: stats.publishedQuestions },
        { label: "Draft questions", value: stats.draftQuestions },
      ]
    : [];

  return (
    <AdminShell>
      <div className="mx-auto max-w-5xl px-8 py-10">
        <h1 className="font-display text-2xl font-medium tracking-tight">Dashboard</h1>
        <p className="mt-1.5 text-[13px] text-[var(--muted)]">
          A live snapshot of the content library.
        </p>

        {!stats ? (
          <div className="mt-8 grid grid-cols-5 gap-px overflow-hidden border border-[var(--border)] bg-[var(--border)]">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 animate-pulse bg-[var(--bg)]" />
            ))}
          </div>
        ) : (
          <>
            <div className="mt-8 grid grid-cols-2 gap-px overflow-hidden border border-[var(--border)] bg-[var(--border)] sm:grid-cols-3 lg:grid-cols-5">
              {cards.map((c) => (
                <div key={c.label} className="bg-[var(--bg)] p-5">
                  <p className="mono-tag text-[10px] uppercase tracking-widest text-[var(--muted)]">
                    {c.label}
                  </p>
                  <p className="mt-2 font-display text-3xl font-medium">{c.value}</p>
                </div>
              ))}
            </div>

            <section className="mt-10">
              <h2 className="font-display text-lg font-medium">Questions by difficulty</h2>
              <div className="mt-4 space-y-2">
                {Object.entries(stats.byDifficulty).map(([difficulty, count]) => {
                  const max = Math.max(...Object.values(stats.byDifficulty), 1);
                  return (
                    <div key={difficulty} className="flex items-center gap-4">
                      <span className="mono-tag w-20 shrink-0 text-[11px] uppercase text-[var(--muted)]">
                        {difficulty}
                      </span>
                      <div className="h-2 flex-1 bg-[var(--border)]">
                        <div
                          className="h-2 bg-[var(--fg)]"
                          style={{ width: `${(count / max) * 100}%` }}
                        />
                      </div>
                      <span className="mono-tag w-8 shrink-0 text-right text-[12px] text-[var(--muted)]">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="mt-10">
              <h2 className="font-display text-lg font-medium">Questions by subject</h2>
              <div className="mt-4 divide-y divide-[var(--border)] border border-[var(--border)]">
                {stats.bySubject.map((s) => (
                  <div key={s.subjectId} className="flex items-center justify-between px-4 py-3 text-[13px]">
                    <span>{s.subjectName}</span>
                    <span className="mono-tag text-[var(--muted)]">{s.count}</span>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </AdminShell>
  );
}
