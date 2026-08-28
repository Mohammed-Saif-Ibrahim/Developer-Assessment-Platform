import Link from "next/link";
import Header from "@/components/Header";
import { api } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function SubjectsPage() {
  const subjects = await api.getSubjects().catch(() => []);

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-6xl px-6 py-14">
        <h1 className="font-display text-3xl font-medium tracking-tight">Subjects</h1>
        <p className="mt-2 text-[15px] text-[var(--muted)]">
          Pick a technology to start a practice session or timed assessment.
        </p>

        <div className="mt-10 grid grid-cols-1 gap-px overflow-hidden border border-[var(--border)] bg-[var(--border)] sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map((s) => (
            <Link
              key={s.id}
              href={`/subjects/${s.slug}`}
              className="group flex flex-col justify-between bg-[var(--bg)] p-6 transition-colors hover:bg-[var(--panel)]"
            >
              <div>
                <span className="font-mono text-[11px] uppercase tracking-widest text-[var(--muted)]">
                  {s.icon ?? s.slug}
                </span>
                <h3 className="mt-3 font-display text-lg font-medium">{s.name}</h3>
                {s.description && (
                  <p className="mt-2 text-[13px] leading-relaxed text-[var(--muted)]">
                    {s.description}
                  </p>
                )}
              </div>
              <div className="mt-6 flex gap-4 border-t border-[var(--border)] pt-4">
                <span className="mono-tag text-[11px] text-[var(--muted)]">{s.topicCount} topics</span>
                <span className="mono-tag text-[11px] text-[var(--muted)]">
                  {s.publishedQuestionCount} questions
                </span>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
