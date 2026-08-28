"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminShell from "@/components/AdminShell";
import { adminApi, type AdminSubject } from "@/lib/api";

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<AdminSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    setLoading(true);
    adminApi
      .getSubjects()
      .then(setSubjects)
      .finally(() => setLoading(false));
  }

  useEffect(refresh, []);

  async function createSubject(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await adminApi.createSubject({ name, description: description || undefined, icon: icon || undefined });
      setName("");
      setDescription("");
      setIcon("");
      setShowForm(false);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create subject.");
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish(subject: AdminSubject) {
    setSubjects((prev) =>
      prev.map((s) => (s.id === subject.id ? { ...s, isPublished: !s.isPublished } : s))
    );
    try {
      if (subject.isPublished) await adminApi.unpublishSubject(subject.id);
      else await adminApi.publishSubject(subject.id);
    } catch {
      refresh();
    }
  }

  async function remove(subject: AdminSubject) {
    if (!confirm(`Delete "${subject.name}"? This removes its topics and questions too.`)) return;
    setSubjects((prev) => prev.filter((s) => s.id !== subject.id));
    try {
      await adminApi.deleteSubject(subject.id);
    } catch {
      refresh();
    }
  }

  return (
    <AdminShell>
      <div className="mx-auto max-w-5xl px-8 py-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-medium tracking-tight">Subjects</h1>
            <p className="mt-1.5 text-[13px] text-[var(--muted)]">
              Technical subjects candidates can practice.
            </p>
          </div>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="h-10 border border-[var(--fg)] bg-[var(--fg)] px-5 font-mono text-[12px] uppercase tracking-widest text-[var(--bg)]"
          >
            {showForm ? "Cancel" : "New subject"}
          </button>
        </div>

        {showForm && (
          <form onSubmit={createSubject} className="mt-6 space-y-4 border border-[var(--border)] p-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mono-tag mb-1.5 block text-[11px] uppercase tracking-widest text-[var(--muted)]">
                  Name
                </label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-10 w-full border border-[var(--border)] bg-[var(--bg)] px-3 text-[14px]"
                  placeholder="JavaScript"
                />
              </div>
              <div>
                <label className="mono-tag mb-1.5 block text-[11px] uppercase tracking-widest text-[var(--muted)]">
                  Icon label (optional)
                </label>
                <input
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  className="h-10 w-full border border-[var(--border)] bg-[var(--bg)] px-3 text-[14px]"
                  placeholder="js"
                />
              </div>
            </div>
            <div>
              <label className="mono-tag mb-1.5 block text-[11px] uppercase tracking-widest text-[var(--muted)]">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[14px]"
              />
            </div>
            {error && <p className="text-[13px] text-[var(--muted)]">{error}</p>}
            <button
              type="submit"
              disabled={saving}
              className="h-10 border border-[var(--fg)] bg-[var(--fg)] px-5 font-mono text-[12px] uppercase tracking-widest text-[var(--bg)] disabled:opacity-50"
            >
              {saving ? "Creating..." : "Create subject"}
            </button>
          </form>
        )}

        <div className="mt-8 divide-y divide-[var(--border)] border border-[var(--border)]">
          {loading && <div className="p-5 text-[13px] text-[var(--muted)]">Loading...</div>}
          {!loading && subjects.length === 0 && (
            <div className="p-8 text-center text-[13px] text-[var(--muted)]">
              No subjects yet. Create one to get started.
            </div>
          )}
          {subjects.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-4 px-5 py-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Link href={`/admin/subjects/${s.id}`} className="font-medium hover:underline">
                    {s.name}
                  </Link>
                  <span
                    className={`mono-tag border px-1.5 py-0.5 text-[10px] uppercase ${
                      s.isPublished ? "border-[var(--fg)]" : "border-[var(--border)] text-[var(--muted)]"
                    }`}
                  >
                    {s.isPublished ? "published" : "draft"}
                  </span>
                </div>
                <p className="mt-1 truncate text-[12px] text-[var(--muted)]">
                  {s.topicCount} topics &middot; {s.questionCount} questions &middot; {s.publishedQuestionCount} published
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <button
                  onClick={() => togglePublish(s)}
                  className="font-mono text-[11px] uppercase tracking-widest text-[var(--muted)] hover:text-[var(--fg)]"
                >
                  {s.isPublished ? "Unpublish" : "Publish"}
                </button>
                <button
                  onClick={() => remove(s)}
                  className="font-mono text-[11px] uppercase tracking-widest text-[var(--muted)] hover:text-[var(--fg)]"
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
