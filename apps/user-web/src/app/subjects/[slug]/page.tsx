import { notFound } from "next/navigation";
import Header from "@/components/Header";
import { api } from "@/lib/api";
import AssessmentStarter from "./AssessmentStarter";

export const dynamic = "force-dynamic";

export default async function SubjectPage({ params }: { params: { slug: string } }) {
  const subject = await api.getSubject(params.slug).catch(() => null);
  if (!subject) notFound();

  const topics = await api.getTopics(subject.id).catch(() => []);

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-4xl px-6 py-14">
        <span className="mono-tag text-[11px] uppercase tracking-widest text-[var(--muted)]">
          {subject.icon ?? subject.slug}
        </span>
        <h1 className="mt-3 font-display text-3xl font-medium tracking-tight">{subject.name}</h1>
        {subject.description && (
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-[var(--muted)]">
            {subject.description}
          </p>
        )}

        <div className="mt-6 flex gap-6 border-y border-[var(--border)] py-4">
          <span className="mono-tag text-[11px] text-[var(--muted)]">
            {topics.length} topics
          </span>
          <span className="mono-tag text-[11px] text-[var(--muted)]">
            {subject.publishedQuestionCount} questions
          </span>
        </div>

        <AssessmentStarter subject={subject} topics={topics} />
      </main>
    </div>
  );
}
