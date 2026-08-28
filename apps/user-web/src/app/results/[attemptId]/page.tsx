"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { AttemptResult } from "@dap/types";
import Header from "@/components/Header";
import { getAttempt } from "@/lib/localState";
import ResultsView from "./ResultsView";

export default function ResultsPage() {
  const params = useParams<{ attemptId: string }>();
  const [result, setResult] = useState<AttemptResult | null | undefined>(undefined);

  useEffect(() => {
    setResult(getAttempt(params.attemptId));
  }, [params.attemptId]);

  return (
    <div className="min-h-screen">
      <Header />
      {result === undefined && (
        <main className="mx-auto max-w-4xl px-6 py-14">
          <p className="mono-tag text-[12px] text-[var(--muted)]">Loading...</p>
        </main>
      )}
      {result === null && (
        <main className="mx-auto max-w-4xl px-6 py-14 text-center">
          <p className="text-[var(--muted)]">
            This result couldn't be found on this device. It may have been submitted
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
      {result && <ResultsView result={result} />}
    </div>
  );
}
