"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AssessmentMode, Difficulty, SubjectWithStats, TopicWithStats } from "@dap/types";
import { generateAssessment } from "@/lib/quizEngine";
import { saveCurrentAssessment } from "@/lib/localState";
import { DEFAULT_PRACTICE_QUESTION_COUNT, DEFAULT_TIMED_QUESTION_COUNT } from "@dap/shared";

const MODES: { value: AssessmentMode; label: string; description: string }[] = [
  { value: "practice", label: "Practice", description: "Untimed, work at your own pace." },
  { value: "timed", label: "Timed", description: "Fixed question count, 1 minute per question." },
  { value: "mixed", label: "Mixed", description: "A blend of theory and code questions." },
  { value: "topic", label: "Topic practice", description: "Focus on one topic below." },
  { value: "weak_areas", label: "Weak areas", description: "Auto-selected from past performance." },
];

const DIFFICULTIES: { value: Difficulty | "mixed"; label: string }[] = [
  { value: "mixed", label: "Mixed" },
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
  { value: "advanced", label: "Advanced" },
];

export default function AssessmentStarter({
  subject,
  topics,
}: {
  subject: SubjectWithStats;
  topics: TopicWithStats[];
}) {
  const router = useRouter();
  const [mode, setMode] = useState<AssessmentMode>("practice");
  const [difficulty, setDifficulty] = useState<Difficulty | "mixed">("mixed");
  const [topicId, setTopicId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setLoading(true);
    setError(null);
    try {
      const generated = await generateAssessment({
        mode,
        subjectId: subject.id,
        topicId: mode === "topic" && topicId ? topicId : undefined,
        difficulty,
        questionCount: mode === "timed" ? DEFAULT_TIMED_QUESTION_COUNT : DEFAULT_PRACTICE_QUESTION_COUNT,
        // durationSeconds intentionally omitted for timed mode: generateAssessment
        // derives it from the actual selected question count (1 minute/question).
      });

      if (!generated.id || generated.questions.length === 0) {
        setError(
          mode === "weak_areas"
            ? "No weak areas detected yet. Complete a few assessments first, then check back here."
            : "No published questions match this selection yet."
        );
        setLoading(false);
        return;
      }

      saveCurrentAssessment({
        assessment: generated,
        answers: {},
        startedAt: Date.now(),
      });

      router.push(`/quiz/${generated.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong starting this assessment.");
      setLoading(false);
    }
  }

  return (
    <div className="mt-10">
      <h2 className="font-display text-lg font-medium">Choose a mode</h2>
      <div className="mt-4 grid grid-cols-1 gap-px overflow-hidden border border-[var(--border)] bg-[var(--border)] sm:grid-cols-2">
        {MODES.map((m) => (
          <button
            key={m.value}
            onClick={() => setMode(m.value)}
            className={`flex flex-col items-start gap-1 bg-[var(--bg)] p-4 text-left transition-colors ${
              mode === m.value ? "bg-[var(--fg)] text-[var(--bg)]" : "hover:bg-[var(--panel)]"
            }`}
          >
            <span className="font-mono text-[12px] uppercase tracking-widest">{m.label}</span>
            <span
              className={`text-[12px] leading-snug ${
                mode === m.value ? "text-[var(--bg)]/70" : "text-[var(--muted)]"
              }`}
            >
              {m.description}
            </span>
          </button>
        ))}
      </div>

      {mode === "topic" && (
        <div className="mt-6">
          <label className="mono-tag mb-2 block text-[11px] uppercase tracking-widest text-[var(--muted)]">
            Topic
          </label>
          <select
            value={topicId}
            onChange={(e) => setTopicId(e.target.value)}
            className="h-10 w-full max-w-xs border border-[var(--border)] bg-[var(--bg)] px-3 text-[14px]"
          >
            <option value="">All topics</option>
            {topics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.questionCount})
              </option>
            ))}
          </select>
        </div>
      )}

      {mode !== "weak_areas" && (
        <div className="mt-6">
          <label className="mono-tag mb-2 block text-[11px] uppercase tracking-widest text-[var(--muted)]">
            Difficulty
          </label>
          <div className="flex flex-wrap gap-2">
            {DIFFICULTIES.map((d) => (
              <button
                key={d.value}
                onClick={() => setDifficulty(d.value)}
                className={`h-9 border px-4 font-mono text-[12px] uppercase tracking-widest transition-colors ${
                  difficulty === d.value
                    ? "border-[var(--fg)] bg-[var(--fg)] text-[var(--bg)]"
                    : "border-[var(--border)] hover:border-[var(--fg)]"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <p className="mt-6 border border-[var(--border)] px-4 py-3 text-[13px] text-[var(--muted)]">
          {error}
        </p>
      )}

      <button
        onClick={start}
        disabled={loading}
        className="mt-8 inline-flex h-11 items-center border border-[var(--fg)] bg-[var(--fg)] px-7 font-mono text-[13px] uppercase tracking-widest text-[var(--bg)] transition-opacity hover:opacity-80 disabled:opacity-50"
      >
        {loading ? "Starting..." : "Start assessment"}
      </button>
    </div>
  );
}
