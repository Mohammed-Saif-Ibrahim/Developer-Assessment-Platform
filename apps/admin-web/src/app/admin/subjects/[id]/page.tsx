"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import AdminShell from "@/components/AdminShell";
import { adminApi, type AdminSubject, type AdminTopic } from "@/lib/api";

export default function SubjectDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [subject, setSubject] = useState<AdminSubject | null>(null);
  const [topics, setTopics] = useState<AdminTopic[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminApi.getSubjects().then((all) => {
      const found = all.find((s) => s.id === params.id) ?? null;
      setSubject(found);
      if (found) {
        setName(found.name);
        setDescription(found.description ?? "");
        setIcon(found.icon ?? "");
      }
    });
    adminApi.getTopics(params.id).then(setTopics);
  }, [params.id]);

  async function save() {
    setSaving(true);
    try {
      const updated = await adminApi.updateSubject(params.id, { name, description, icon });
      setSubject((prev) => (prev ? { ...prev, ...updated } : prev));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!subject) return;
    if (!confirm(`Delete "${subject.name}"? This removes its topics and questions too.`)) return;
    await adminApi.deleteSubject(subject.id);
    router.push("/admin/subjects");
  }

  if (!subject) {
    return (
      <AdminShell>
        <div className="mx-auto max-w-4xl px-8 py-10 text-[13px] text-[var(--muted)]">Loading...</div>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <div className="mx-auto max-w-4xl px-8 py-10">
        <Link href="/admin/subjects" className="mono-tag text-[11px] uppercase tracking-widest text-[var(--muted)] hover:text-[var(--fg)]">
          &larr; Subjects
        </Link>

        <h1 className="mt-3 font-display text-2xl font-medium tracking-tight">{subject.name}</h1>

        <div className="mt-8 grid grid-cols-1 gap-4 border border-[var(--border)] p-5 sm:grid-cols-2">
          <div>
            <label className="mono-tag mb-1.5 block text-[11px] uppercase tracking-widest text-[var(--muted)]">
              Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10 w-full border border-[var(--border)] bg-[var(--bg)] px-3 text-[14px]"
            />
          </div>
          <div>
            <label className="mono-tag mb-1.5 block text-[11px] uppercase tracking-widest text-[var(--muted)]">
              Icon label
            </label>
            <input
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              className="h-10 w-full border border-[var(--border)] bg-[var(--bg)] px-3 text-[14px]"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mono-tag mb-1.5 block text-[11px] uppercase tracking-widest text-[var(--muted)]">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[14px]"
            />
          </div>
          <div className="flex gap-3 sm:col-span-2">
            <button
              onClick={save}
              disabled={saving}
              className="h-10 border border-[var(--fg)] bg-[var(--fg)] px-5 font-mono text-[12px] uppercase tracking-widest text-[var(--bg)] disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save changes"}
            </button>
            <button
              onClick={remove}
              className="h-10 border border-[var(--border)] px-5 font-mono text-[12px] uppercase tracking-widest hover:border-[var(--fg)]"
            >
              Delete subject
            </button>
          </div>
        </div>

        <section className="mt-10">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-medium">Topics</h2>
            <Link
              href={`/admin/topics?subjectId=${subject.id}`}
              className="mono-tag text-[11px] uppercase tracking-widest text-[var(--muted)] hover:text-[var(--fg)]"
            >
              Manage topics &rarr;
            </Link>
          </div>
          <div className="mt-4 divide-y divide-[var(--border)] border border-[var(--border)]">
            {topics.length === 0 && (
              <div className="p-5 text-[13px] text-[var(--muted)]">No topics yet.</div>
            )}
            {topics.map((t) => (
              <div key={t.id} className="flex items-center justify-between px-4 py-3 text-[13px]">
                <span>{t.name}</span>
                <span className="mono-tag text-[var(--muted)]">{t.questionCount} questions</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
