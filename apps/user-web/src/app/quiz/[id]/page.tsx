"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { GeneratedAssessment } from "@dap/types";
import Header from "@/components/Header";
import { loadCurrentAssessment } from "@/lib/localState";
import QuizRunner from "./QuizRunner";

// There's no server to fetch an assessment from anymore -- it was
// generated and stored client-side (see AssessmentStarter.tsx +
// lib/quizEngine.ts), so this page just reads it back out of
// localStorage. If it's missing (e.g. a stale link, or localStorage was
// cleared), there's nothing to resume.
export default function QuizPage() {
  const params = useParams<{ id: string }>();
  const [assessment, setAssessment] = useState<GeneratedAssessment | null | undefined>(undefined);

  useEffect(() => {
    const restored = loadCurrentAssessment(params.id);
    setAssessment(restored?.assessment ?? null);
  }, [params.id]);

  return (
    <div className="min-h-screen">
      <Header />
      {assessment === undefined && (
        <main className="mx-auto max-w-4xl px-6 py-14">
          <p className="mono-tag text-[12px] text-[var(--muted)]">Loading...</p>
        </main>
      )}
      {assessment === null && (
        <main className="mx-auto max-w-4xl px-6 py-14 text-center">
          <p className="text-[var(--muted)]">
            This assessment couldn't be found on this device. It may have been started
            elsewhere, or your browser storage was cleared.
          </p>
          <Link
            href="/subjects"
            className="mt-6 inline-flex h-10 items-center border border-[var(--fg)] bg-[var(--fg)] px-5 font-mono text-[12px] uppercase tracking-widest text-[var(--bg)]"
          >
            Start a new assessment
          </Link>
        </main>
      )}
      {assessment && assessment.questions.length > 0 && <QuizRunner assessment={assessment} />}
    </div>
  );
}
