"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { AdminQuestion, Difficulty } from "@dap/types";
import AdminShell from "@/components/AdminShell";
import { adminApi, type AdminSubject } from "@/lib/api";

export default function QuestionsPage() {
  const [subjects, setSubjects] = useState<AdminSubject[]>([]);
  const [questions, setQuestions] = useState<AdminQuestion[]>([]);
  const [subjectId, setSubjectId] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty | "">("");
  const [publishedFilter, setPublishedFilter] = useState<"" | "true" | "false">("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getSubjects().then(setSubjects);
  }, []);

  function refresh() {
    setLoading(true);
    adminApi
      .getQuestions({
        subjectId: subjectId || undefined,
        difficulty: (difficulty || undefined) as Difficulty | undefined,
        isPublished: publishedFilter === "" ? undefined : publishedFilter === "true",
      })
      .then(setQuestions)
      .finally(() => setLoading(false));
  }

  useEffect(refresh, [subjectId, difficulty, publishedFilter]);

  async function togglePublish(q: AdminQuestion) {
    setQuestions((prev) => prev.map((p) => (p.id === q.id ? { ...p, isPublished: !p.isPublished } : p)));
    try {
      if (q.isPublished) await adminApi.unpublishQuestion(q.id);
      else await adminApi.publishQuestion(q.id);
    } catch {
      refresh();
    }
  }

  async function remove(q: AdminQuestion) {
    if (!confirm("Delete this question?")) return;
    setQuestions((prev) => prev.filter((p) => p.id !== q.id));
    try {
      await adminApi.deleteQuestion(q.id);
    } catch {
      refresh();
    }
  }

  return (
    <AdminShell>
      <div className="mx-auto max-w-6xl px-8 py-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-medium tracking-tight">Questions</h1>
            <p className="mt-1.5 text-[13px] text-[var(--muted)]">{questions.length} matching questions</p>
          </div>
          <Link
            href="/admin/questions/new"
            className="h-10 shrink-0 border border-[var(--fg)] bg-[var(--fg)] px-5 py-2.5 font-mono text-[12px] uppercase tracking-widest text-[var(--bg)]"
          >
            New question
          </Link>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <select
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            className="h-9 border border-[var(--border)] bg-[var(--bg)] px-3 text-[13px]"
          >
            <option value="">All subjects</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as Difficulty | "")}
            className="h-9 border border-[var(--border)] bg-[var(--bg)] px-3 text-[13px]"
          >
            <option value="">All difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
            <option value="advanced">Advanced</option>
          </select>
          <select
            value={publishedFilter}
            onChange={(e) => setPublishedFilter(e.target.value as "" | "true" | "false")}
            className="h-9 border border-[var(--border)] bg-[var(--bg)] px-3 text-[13px]"
          >
            <option value="">All statuses</option>
            <option value="true">Published</option>
            <option value="false">Draft</option>
          </select>
        </div>

        <div className="mt-6 divide-y divide-[var(--border)] border border-[var(--border)]">
          {loading && <div className="p-5 text-[13px] text-[var(--muted)]">Loading...</div>}
          {!loading && questions.length === 0 && (
            <div className="p-8 text-center text-[13px] text-[var(--muted)]">No questions match these filters.</div>
          )}
          {questions.map((q) => (
            <div key={q.id} className="flex items-center justify-between gap-4 px-5 py-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Link href={`/admin/questions/${q.id}/edit`} className="truncate font-medium hover:underline">
                    {q.questionText}
                  </Link>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="mono-tag text-[11px] uppercase text-[var(--muted)]">{q.difficulty}</span>
                  <span className="mono-tag text-[11px] uppercase text-[var(--muted)]">{q.type.replace("_", " ")}</span>
                  <span
                    className={`mono-tag border px-1.5 py-0.5 text-[10px] uppercase ${
                      q.isPublished ? "border-[var(--fg)]" : "border-[var(--border)] text-[var(--muted)]"
                    }`}
                  >
                    {q.isPublished ? "published" : "draft"}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <button
                  onClick={() => togglePublish(q)}
                  className="mono-tag text-[11px] uppercase tracking-widest text-[var(--muted)] hover:text-[var(--fg)]"
                >
                  {q.isPublished ? "Unpublish" : "Publish"}
                </button>
                <Link
                  href={`/admin/questions/${q.id}/edit`}
                  className="mono-tag text-[11px] uppercase tracking-widest text-[var(--muted)] hover:text-[var(--fg)]"
                >
                  Edit
                </Link>
                <button
                  onClick={() => remove(q)}
                  className="mono-tag text-[11px] uppercase tracking-widest text-[var(--muted)] hover:text-[var(--fg)]"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminShell>
  );
}
