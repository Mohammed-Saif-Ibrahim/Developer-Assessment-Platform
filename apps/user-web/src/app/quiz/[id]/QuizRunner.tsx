"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { GeneratedAssessment } from "@dap/types";
import { gradeAssessment, bookmarkFromQuestion } from "@/lib/quizEngine";
import {
  addBookmark,
  clearCurrentAssessment,
  isBookmarked,
  loadCurrentAssessment,
  removeBookmark,
  saveAttempt,
  saveCurrentAssessment,
} from "@/lib/localState";
import { CodeBlock, DifficultyBadge, Tag } from "@/components/ui";

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function QuizRunner({ assessment }: { assessment: GeneratedAssessment }) {
  const router = useRouter();
  const { questions } = assessment;
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [bookmarked, setBookmarked] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const startedAtRef = useRef<number>(Date.now());
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const restored = loadCurrentAssessment(assessment.id);
    if (restored) {
      setAnswers(restored.answers);
      startedAtRef.current = restored.startedAt;
    }
    const initialBookmarks: Record<string, boolean> = {};
    for (const q of questions) {
      initialBookmarks[q.id] = isBookmarked(q.id);
    }
    setBookmarked(initialBookmarks);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assessment.id]);

  const remaining = assessment.durationSeconds ? assessment.durationSeconds - elapsed : null;

  const submit = useCallback(async () => {
    setSubmitting(true);
    try {
      const totalTimeSeconds = Math.floor((Date.now() - startedAtRef.current) / 1000);
      const result = gradeAssessment(assessment, answers, totalTimeSeconds);
      saveAttempt(result);
      clearCurrentAssessment();
      router.push(`/results/${result.attemptId}`);
    } catch {
      setSubmitting(false);
    }
  }, [answers, assessment, router]);

  useEffect(() => {
    if (!assessment.durationSeconds) return;
    const interval = setInterval(() => {
      const secs = Math.floor((Date.now() - startedAtRef.current) / 1000);
      setElapsed(secs);
      if (assessment.durationSeconds && secs >= assessment.durationSeconds) {
        clearInterval(interval);
        submit();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [assessment.durationSeconds, submit]);

  useEffect(() => {
    saveCurrentAssessment({
      assessment,
      answers,
      startedAt: startedAtRef.current,
    });
  }, [answers, assessment]);

  // Keyboard navigation: left/right arrows move between questions.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") setIndex((i) => Math.min(i + 1, questions.length - 1));
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(i - 1, 0));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [questions.length]);

  const current = questions[index];
  const isMulti = current.type === "multiple_correct";
  const selected = answers[current.id] ?? [];

  const answeredCount = useMemo(
    () => questions.filter((q) => (answers[q.id]?.length ?? 0) > 0).length,
    [answers, questions]
  );

  function toggleOption(optionId: string) {
    setAnswers((prev) => {
      const currentSelection = prev[current.id] ?? [];
      let next: string[];
      if (isMulti) {
        next = currentSelection.includes(optionId)
          ? currentSelection.filter((id) => id !== optionId)
          : [...currentSelection, optionId];
      } else {
        next = [optionId];
      }
      return { ...prev, [current.id]: next };
    });
  }

  function toggleBookmark() {
    const isCurrentlyBookmarked = bookmarked[current.id];
    setBookmarked((prev) => ({ ...prev, [current.id]: !isCurrentlyBookmarked }));
    if (isCurrentlyBookmarked) {
      removeBookmark(current.id);
    } else {
      addBookmark(bookmarkFromQuestion(current));
    }
  }

  return (
    <main className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-6 py-10 lg:grid-cols-[1fr_240px]">
      <section>
        <div className="mb-6 flex items-center justify-between border-b border-[var(--border)] pb-4">
          <div className="flex items-center gap-3">
            <span className="mono-tag text-[12px] text-[var(--muted)]">
              Question {index + 1} / {questions.length}
            </span>
            <DifficultyBadge difficulty={current.difficulty} />
            <Tag>{current.type.replace("_", " ")}</Tag>
          </div>
          {remaining !== null && (
            <span
              className={`mono-tag text-[13px] ${
                remaining < 60 ? "text-[var(--fg)] font-bold" : "text-[var(--muted)]"
              }`}
            >
              {formatTime(Math.max(remaining, 0))}
            </span>
          )}
        </div>

        <h1 className="font-display text-xl font-medium leading-snug md:text-2xl">
          {current.questionText}
        </h1>

        {current.codeSnippet && (
          <div className="mt-5">
            <CodeBlock code={current.codeSnippet} language={current.codeLanguage} />
          </div>
        )}

        <fieldset className="mt-7 space-y-2">
          <legend className="sr-only">Answer options</legend>
          {current.options.map((option, i) => {
            const isSelected = selected.includes(option.id);
            return (
              <label
                key={option.id}
                className={`flex cursor-pointer items-center gap-3 border px-4 py-3 text-[14px] transition-colors ${
                  isSelected
                    ? "border-[var(--fg)] bg-[var(--fg)] text-[var(--bg)]"
                    : "border-[var(--border)] hover:border-[var(--fg)]"
                }`}
              >
                <input
                  type={isMulti ? "checkbox" : "radio"}
                  name={`question-${current.id}`}
                  checked={isSelected}
                  onChange={() => toggleOption(option.id)}
                  className="sr-only"
                />
                <span
                  className={`mono-tag flex h-5 w-5 shrink-0 items-center justify-center border text-[10px] ${
                    isSelected ? "border-[var(--bg)]" : "border-[var(--border)]"
                  }`}
                >
                  {String.fromCharCode(65 + i)}
                </span>
                <span>{option.optionText}</span>
              </label>
            );
          })}
        </fieldset>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--border)] pt-6">
          <div className="flex gap-3">
            <button
              onClick={() => setIndex((i) => Math.max(i - 1, 0))}
              disabled={index === 0}
              className="h-10 border border-[var(--border)] px-4 font-mono text-[12px] uppercase tracking-widest disabled:opacity-30"
            >
              Previous
            </button>
            <button
              onClick={() => setIndex((i) => Math.min(i + 1, questions.length - 1))}
              disabled={index === questions.length - 1}
              className="h-10 border border-[var(--border)] px-4 font-mono text-[12px] uppercase tracking-widest disabled:opacity-30"
            >
              Next
            </button>
            <button
              onClick={toggleBookmark}
              className={`h-10 border px-4 font-mono text-[12px] uppercase tracking-widest transition-colors ${
                bookmarked[current.id]
                  ? "border-[var(--fg)] bg-[var(--fg)] text-[var(--bg)]"
                  : "border-[var(--border)]"
              }`}
            >
              {bookmarked[current.id] ? "Bookmarked" : "Bookmark"}
            </button>
          </div>

          <button
            onClick={submit}
            disabled={submitting}
            className="h-10 border border-[var(--fg)] bg-[var(--fg)] px-6 font-mono text-[12px] uppercase tracking-widest text-[var(--bg)] transition-opacity hover:opacity-80 disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Submit assessment"}
          </button>
        </div>
      </section>

      <aside className="lg:sticky lg:top-24 lg:h-fit">
        <div className="border border-[var(--border)] p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="mono-tag text-[11px] uppercase tracking-widest text-[var(--muted)]">
              Progress
            </span>
            <span className="mono-tag text-[11px] text-[var(--muted)]">
              {answeredCount}/{questions.length}
            </span>
          </div>
          <div className="mb-4 h-1 w-full bg-[var(--border)]">
            <div
              className="h-1 bg-[var(--fg)] transition-all"
              style={{ width: `${(answeredCount / questions.length) * 100}%` }}
            />
          </div>
          <div className="grid grid-cols-6 gap-1.5 lg:grid-cols-5">
            {questions.map((q, i) => {
              const isAnswered = (answers[q.id]?.length ?? 0) > 0;
              const isCurrent = i === index;
              return (
                <button
                  key={q.id}
                  onClick={() => setIndex(i)}
                  aria-label={`Go to question ${i + 1}`}
                  className={`flex h-8 w-8 items-center justify-center border font-mono text-[11px] transition-colors ${
                    isCurrent
                      ? "border-[var(--fg)] bg-[var(--fg)] text-[var(--bg)]"
                      : isAnswered
                        ? "border-[var(--fg)] text-[var(--fg)]"
                        : "border-[var(--border)] text-[var(--muted)]"
                  }`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
        </div>
      </aside>
    </main>
  );
}
