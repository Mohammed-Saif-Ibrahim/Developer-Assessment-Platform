"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import AdminShell from "@/components/AdminShell";
import { adminApi, type AdminSubject, type AdminTopic } from "@/lib/api";

export default function TopicsPage() {
  return (
    <Suspense fallback={null}>
      <TopicsPageInner />
    </Suspense>
  );
}

function TopicsPageInner() {
  const searchParams = useSearchParams();
  const initialSubjectId = searchParams.get("subjectId") ?? "";

  const [subjects, setSubjects] = useState<AdminSubject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState(initialSubjectId);
  const [topics, setTopics] = useState<AdminTopic[]>([]);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi.getSubjects().then((rows) => {
      setSubjects(rows);
      if (!selectedSubjectId && rows.length > 0) setSelectedSubjectId(rows[0].id);
    });
  }, [selectedSubjectId]);

  function refresh(subjectId: string) {
    if (!subjectId) return;
    adminApi.getTopics(subjectId).then(setTopics);
  }

  useEffect(() => {
    refresh(selectedSubjectId);
  }, [selectedSubjectId]);

  async function createTopic(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSubjectId) return;
    setSaving(true);
    setError(null);
    try {
      await adminApi.createTopic({ subjectId: selectedSubjectId, name, sortOrder: topics.length });
      setName("");
      refresh(selectedSubjectId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create topic.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(topic: AdminTopic) {
    if (!confirm(`Delete "${topic.name}"? This removes its questions too.`)) return;
    setTopics((prev) => prev.filter((t) => t.id !== topic.id));
    try {
      await adminApi.deleteTopic(topic.id);
    } catch {
      refresh(selectedSubjectId);
    }
  }

  return (
    <AdminShell>
      <div className="mx-auto max-w-4xl px-8 py-10">
        <h1 className="font-display text-2xl font-medium tracking-tight">Topics</h1>
        <p className="mt-1.5 text-[13px] text-[var(--muted)]">
          Group questions within a subject, e.g. Closures, Hooks, Joins.
        </p>

        <div className="mt-6">
          <label className="mono-tag mb-1.5 block text-[11px] uppercase tracking-widest text-[var(--muted)]">
            Subject
          </label>
          <select
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            className="h-10 w-full max-w-xs border border-[var(--border)] bg-[var(--bg)] px-3 text-[14px]"
          >
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <form onSubmit={createTopic} className="mt-6 flex gap-3">
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Topic name"
            className="h-10 flex-1 border border-[var(--border)] bg-[var(--bg)] px-3 text-[14px]"
          />
          <button
            type="submit"
            disabled={saving || !selectedSubjectId}
            className="h-10 border border-[var(--fg)] bg-[var(--fg)] px-5 font-mono text-[12px] uppercase tracking-widest text-[var(--bg)] disabled:opacity-50"
          >
            Add topic
          </button>
        </form>
        {error && <p className="mt-2 text-[13px] text-[var(--muted)]">{error}</p>}

        <div className="mt-8 divide-y divide-[var(--border)] border border-[var(--border)]">
          {topics.length === 0 && (
            <div className="p-5 text-[13px] text-[var(--muted)]">No topics for this subject yet.</div>
          )}
          {topics.map((t) => (
            <div key={t.id} className="flex items-center justify-between px-4 py-3 text-[13px]">
              <span>{t.name}</span>
              <div className="flex items-center gap-4">
                <span className="mono-tag text-[var(--muted)]">{t.questionCount} questions</span>
                <button
                  onClick={() => remove(t)}
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
