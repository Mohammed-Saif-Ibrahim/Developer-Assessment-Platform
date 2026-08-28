import Link from "next/link";
import Header from "@/components/Header";
import { api } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const subjects = await api.getSubjects().catch(() => []);

  return (
    <div className="min-h-screen">
      <Header />

      <main>
        <section className="mx-auto max-w-6xl px-6 pb-20 pt-24 md:pt-32">
          <p className="mono-tag mb-6 text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">
            {String(subjects.length).padStart(2, "0")} technologies &middot; practice mode &middot; no signup
          </p>
          <h1 className="font-display max-w-3xl text-balance text-[44px] font-medium leading-[1.05] tracking-tightest md:text-[64px]">
            Test your knowledge.
            <br />
            Practice real programming concepts.
          </h1>
          <p className="mt-6 max-w-lg text-[15px] leading-relaxed text-[var(--muted)]">
            Theory, code output, and debugging questions across the languages and
            frameworks you actually use. Every attempt sharpens a live map of what
            you know and what still needs work.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Link
              href="/subjects"
              className="inline-flex h-11 items-center border border-[var(--fg)] bg-[var(--fg)] px-6 font-mono text-[13px] uppercase tracking-widest text-[var(--bg)] transition-opacity hover:opacity-80"
            >
              Start practicing
            </Link>
            <Link
              href="/progress"
              className="inline-flex h-11 items-center border border-[var(--border)] px-6 font-mono text-[13px] uppercase tracking-widest transition-colors hover:border-[var(--fg)]"
            >
              View progress
            </Link>
          </div>
        </section>

        {/* Stats strip */}
        <section className="border-t border-[var(--border)]">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px overflow-hidden border-b border-[var(--border)] bg-[var(--border)] sm:grid-cols-4">
            {[
              { label: "Questions", value: "250+" },
              { label: "Subjects", value: String(subjects.length).padStart(2, "0") },
              { label: "Avg. session", value: "8 min" },
              { label: "Cost to use", value: "$0" },
            ].map((stat) => (
              <div key={stat.label} className="bg-[var(--bg)] px-6 py-8">
                <div className="font-display text-2xl font-medium md:text-3xl">
                  {stat.value}
                </div>
                <div className="mono-tag mt-2 text-[11px] uppercase tracking-widest text-[var(--muted)]">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-[var(--border)]">
          <div className="mx-auto max-w-6xl px-6 py-14">
            <div className="mb-8 flex items-baseline justify-between">
              <h2 className="font-display text-xl font-medium">Choose a subject</h2>
              <span className="mono-tag text-[11px] text-[var(--muted)]">
                {subjects.length} available
              </span>
            </div>

            {subjects.length === 0 ? (
              <div className="border border-dashed border-[var(--border)] px-6 py-16 text-center">
                <p className="text-[var(--muted)]">
                  No subjects are published yet. Check back soon, or ask an admin to
                  publish one.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-px overflow-hidden border border-[var(--border)] bg-[var(--border)] sm:grid-cols-2 lg:grid-cols-3">
                {subjects.map((s) => (
                  <Link
                    key={s.id}
                    href={`/subjects/${s.slug}`}
                    className="group relative flex flex-col justify-between bg-[var(--bg)] p-6 transition-colors hover:bg-[var(--panel)]"
                  >
                    <div>
                      <div className="mb-4 flex items-center justify-between">
                        <span className="font-mono text-[11px] uppercase tracking-widest text-[var(--muted)]">
                          {s.icon ?? s.slug}
                        </span>
                        <span className="font-mono text-[11px] text-[var(--muted)] transition-transform group-hover:translate-x-0.5">
                          &rarr;
                        </span>
                      </div>
                      <h3 className="font-display text-lg font-medium">{s.name}</h3>
                      {s.description && (
                        <p className="mt-2 text-[13px] leading-relaxed text-[var(--muted)]">
                          {s.description}
                        </p>
                      )}
                    </div>
                    <div className="mt-6 flex gap-4 border-t border-[var(--border)] pt-4">
                      <span className="mono-tag text-[11px] text-[var(--muted)]">
                        {s.topicCount} topics
                      </span>
                      <span className="mono-tag text-[11px] text-[var(--muted)]">
                        {s.publishedQuestionCount} questions
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* How it works */}
        <section className="border-t border-[var(--border)]">
          <div className="mx-auto max-w-6xl px-6 py-14">
            <div className="mb-8 flex items-baseline justify-between">
              <h2 className="font-display text-xl font-medium">How it works</h2>
              <span className="mono-tag text-[11px] text-[var(--muted)]">
                3 steps
              </span>
            </div>

            <div className="grid grid-cols-1 gap-px overflow-hidden border border-[var(--border)] bg-[var(--border)] sm:grid-cols-3">
              {[
                {
                  step: "01",
                  title: "Pick a subject",
                  copy: "Choose from languages, frameworks, and tools. Filter by topic to focus your session.",
                },
                {
                  step: "02",
                  title: "Answer questions",
                  copy: "Theory, code-output, and debugging formats. No timers, no pressure — go at your own pace.",
                },
                {
                  step: "03",
                  title: "Track your map",
                  copy: "Every attempt updates a live picture of your strengths and the topics worth revisiting.",
                },
              ].map((item) => (
                <div key={item.step} className="bg-[var(--bg)] p-6">
                  <span className="mono-tag text-[11px] text-[var(--muted)]">
                    {item.step}
                  </span>
                  <h3 className="font-display mt-4 text-lg font-medium">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-[var(--muted)]">
                    {item.copy}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="border-t border-[var(--border)]">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-6 py-16 md:flex-row md:items-center">
            <div>
              <p className="mono-tag mb-3 text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">
                Ready when you are
              </p>
              <h2 className="font-display max-w-md text-balance text-2xl font-medium leading-tight md:text-3xl">
                Start closing the gaps in what you know.
              </h2>
            </div>
            <Link
              href="/subjects"
              className="inline-flex h-11 shrink-0 items-center border border-[var(--fg)] bg-[var(--fg)] px-6 font-mono text-[13px] uppercase tracking-widest text-[var(--bg)] transition-opacity hover:opacity-80"
            >
              Start practicing
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--border)] py-8">
  <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-6 text-center font-mono text-[11px] text-[var(--muted)] sm:flex-row sm:justify-between sm:gap-0 sm:text-left">
    <span>Developer Assessment Platform</span>
    <span>Built by Mohammed Saif Ibrahim &middot; Anonymous by default</span>
  </div>
</footer>
    </div>
  );
}