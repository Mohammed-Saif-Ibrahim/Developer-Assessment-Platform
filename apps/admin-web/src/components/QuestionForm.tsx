"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { AdminQuestion, Difficulty, QuestionType } from "@dap/types";
import { adminApi, type AdminSubject, type AdminTopic } from "@/lib/api";
import { CodeBlock } from "./CodeBlock";

interface OptionDraft {
  id?: string;
  optionText: string;
  isCorrect: boolean;
  explanation: string;
}

const TYPES: { value: QuestionType; label: string }[] = [
  { value: "theory", label: "Theory" },
  { value: "code_output", label: "Code output" },
  { value: "debugging", label: "Debugging" },
  { value: "multiple_correct", label: "Multiple correct" },
];

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard", "advanced"];

const LANGUAGES = ["javascript", "typescript", "html", "css", "jsx", "sql", "json", ""];

function emptyOption(): OptionDraft {
  return { optionText: "", isCorrect: false, explanation: "" };
}

export default function QuestionForm({ existing }: { existing?: AdminQuestion }) {
  const router = useRouter();
  const [subjects, setSubjects] = useState<AdminSubject[]>([]);
  const [topics, setTopics] = useState<AdminTopic[]>([]);

  const [subjectId, setSubjectId] = useState(existing?.subjectId ?? "");
  const [topicId, setTopicId] = useState(existing?.topicId ?? "");
  const [type, setType] = useState<QuestionType>(existing?.type ?? "theory");
  const [difficulty, setDifficulty] = useState<Difficulty>(existing?.difficulty ?? "medium");
  const [questionText, setQuestionText] = useState(existing?.questionText ?? "");
  const [codeSnippet, setCodeSnippet] = useState(existing?.codeSnippet ?? "");
  const [codeLanguage, setCodeLanguage] = useState(existing?.codeLanguage ?? "");
  const [explanation, setExplanation] = useState(existing?.explanation ?? "");
  const [isPublished, setIsPublished] = useState(existing?.isPublished ?? false);
  const [options, setOptions] = useState<OptionDraft[]>(
    existing?.options?.length
      ? existing.options
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((o) => ({ id: o.id, optionText: o.optionText, isCorrect: o.isCorrect, explanation: o.explanation ?? "" }))
      : [emptyOption(), emptyOption()]
  );
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi.getSubjects().then(setSubjects);
  }, []);

  useEffect(() => {
    if (subjectId) adminApi.getTopics(subjectId).then(setTopics);
    else setTopics([]);
  }, [subjectId]);

  function updateOption(index: number, patch: Partial<OptionDraft>) {
    setOptions((prev) => prev.map((o, i) => (i === index ? { ...o, ...patch } : o)));
  }

  function setCorrect(index: number) {
    setOptions((prev) =>
      prev.map((o, i) =>
        type === "multiple_correct" ? o : { ...o, isCorrect: i === index }
      )
    );
    if (type === "multiple_correct") {
      setOptions((prev) => prev.map((o, i) => (i === index ? { ...o, isCorrect: !o.isCorrect } : o)));
    }
  }

  function addOption() {
    setOptions((prev) => [...prev, emptyOption()]);
  }

  function removeOption(index: number) {
    setOptions((prev) => prev.filter((_, i) => i !== index));
  }

  function moveOption(index: number, dir: -1 | 1) {
    setOptions((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function save() {
    setError(null);
    if (!subjectId || !topicId) {
      setError("Choose a subject and topic.");
      return;
    }
    if (options.filter((o) => o.optionText.trim()).length < 2) {
      setError("Add at least two options.");
      return;
    }
    if (!options.some((o) => o.isCorrect)) {
      setError("Mark at least one option as correct.");
      return;
    }

    setSaving(true);
    const payload = {
      subjectId,
      topicId,
      type,
      difficulty,
      questionText,
      codeSnippet: codeSnippet || null,
      codeLanguage: codeLanguage || null,
      explanation: explanation || null,
      isPublished,
      options: options
        .filter((o) => o.optionText.trim())
        .map((o, idx) => ({
          id: o.id,
          optionText: o.optionText,
          isCorrect: o.isCorrect,
          explanation: o.explanation || null,
          sortOrder: idx,
        })),
    };

    try {
      if (existing) {
        await adminApi.updateQuestion(existing.id, payload);
      } else {
        await adminApi.createQuestion(payload);
      }
      router.push("/admin/questions");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save question.");
    } finally {
      setSaving(false);
    }
  }

  if (preview) {
    return (
      <div className="mx-auto max-w-3xl px-8 py-10">
        <button
          onClick={() => setPreview(false)}
          className="mono-tag text-[11px] uppercase tracking-widest text-[var(--muted)] hover:text-[var(--fg)]"
        >
          &larr; Back to editor
        </button>

        <div className="mt-6 border border-[var(--border)] p-6">
          <div className="mb-4 flex gap-2">
            <span className="mono-tag border border-[var(--border)] px-2 py-0.5 text-[10px] uppercase text-[var(--muted)]">
              {difficulty}
            </span>
            <span className="mono-tag border border-[var(--border)] px-2 py-0.5 text-[10px] uppercase text-[var(--muted)]">
              {type.replace("_", " ")}
            </span>
          </div>
          <h2 className="font-display text-xl font-medium">{questionText || "Untitled question"}</h2>
          {codeSnippet && (
            <div className="mt-4">
              <CodeBlock code={codeSnippet} language={codeLanguage} />
            </div>
          )}
          <div className="mt-6 space-y-2">
            {options
              .filter((o) => o.optionText.trim())
              .map((o, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 border px-4 py-3 text-[14px] ${
                    o.isCorrect ? "border-[var(--fg)]" : "border-[var(--border)]"
                  }`}
                >
                  <span className="mono-tag flex h-5 w-5 items-center justify-center border border-[var(--border)] text-[10px]">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span>{o.optionText}</span>
                  {o.isCorrect && (
                    <span className="mono-tag ml-auto text-[10px] uppercase text-[var(--muted)]">correct</span>
                  )}
                </div>
              ))}
          </div>
          {explanation && (
            <p className="mt-5 text-[13px] leading-relaxed text-[var(--muted)]">{explanation}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-8 py-10">
      <h1 className="font-display text-2xl font-medium tracking-tight">
        {existing ? "Edit question" : "New question"}
      </h1>

      <div className="mt-8 space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mono-tag mb-1.5 block text-[11px] uppercase tracking-widest text-[var(--muted)]">
              Subject
            </label>
            <select
              value={subjectId}
              onChange={(e) => {
                setSubjectId(e.target.value);
                setTopicId("");
              }}
              className="h-10 w-full border border-[var(--border)] bg-[var(--bg)] px-3 text-[14px]"
            >
              <option value="">Select subject</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mono-tag mb-1.5 block text-[11px] uppercase tracking-widest text-[var(--muted)]">
              Topic
            </label>
            <select
              value={topicId}
              onChange={(e) => setTopicId(e.target.value)}
              disabled={!subjectId}
              className="h-10 w-full border border-[var(--border)] bg-[var(--bg)] px-3 text-[14px] disabled:opacity-50"
            >
              <option value="">Select topic</option>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mono-tag mb-1.5 block text-[11px] uppercase tracking-widest text-[var(--muted)]">
              Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as QuestionType)}
              className="h-10 w-full border border-[var(--border)] bg-[var(--bg)] px-3 text-[14px]"
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mono-tag mb-1.5 block text-[11px] uppercase tracking-widest text-[var(--muted)]">
              Difficulty
            </label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as Difficulty)}
              className="h-10 w-full border border-[var(--border)] bg-[var(--bg)] px-3 text-[14px]"
            >
              {DIFFICULTIES.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="mono-tag mb-1.5 block text-[11px] uppercase tracking-widest text-[var(--muted)]">
            Question
          </label>
          <textarea
            required
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            rows={3}
            className="w-full border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[14px]"
            placeholder="What does this code output?"
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="mono-tag mb-1.5 block text-[11px] uppercase tracking-widest text-[var(--muted)]">
              Code snippet (optional)
            </label>
            <select
              value={codeLanguage ?? ""}
              onChange={(e) => setCodeLanguage(e.target.value)}
              className="h-8 border border-[var(--border)] bg-[var(--bg)] px-2 text-[12px]"
            >
              {LANGUAGES.map((l) => (
                <option key={l} value={l}>
                  {l || "none"}
                </option>
              ))}
            </select>
          </div>
          <textarea
            value={codeSnippet ?? ""}
            onChange={(e) => setCodeSnippet(e.target.value)}
            rows={5}
            className="w-full border border-[var(--border)] bg-[var(--bg)] px-3 py-2 font-mono text-[13px]"
            placeholder={"const x = 5;\nconsole.log(x);"}
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="mono-tag block text-[11px] uppercase tracking-widest text-[var(--muted)]">
              Options
            </label>
            <button
              onClick={addOption}
              type="button"
              className="mono-tag text-[11px] uppercase tracking-widest text-[var(--muted)] hover:text-[var(--fg)]"
            >
              + Add option
            </button>
          </div>
          <div className="space-y-2">
            {options.map((o, i) => (
              <div key={i} className="flex items-start gap-2 border border-[var(--border)] p-3">
                <button
                  type="button"
                  onClick={() => setCorrect(i)}
                  aria-label={o.isCorrect ? "Marked correct" : "Mark correct"}
                  className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center border text-[11px] ${
                    o.isCorrect ? "border-[var(--fg)] bg-[var(--fg)] text-[var(--bg)]" : "border-[var(--border)]"
                  }`}
                >
                  {String.fromCharCode(65 + i)}
                </button>
                <div className="flex-1 space-y-1.5">
                  <input
                    value={o.optionText}
                    onChange={(e) => updateOption(i, { optionText: e.target.value })}
                    placeholder="Option text"
                    className="h-9 w-full border border-[var(--border)] bg-[var(--bg)] px-2.5 text-[13px]"
                  />
                  <input
                    value={o.explanation}
                    onChange={(e) => updateOption(i, { explanation: e.target.value })}
                    placeholder="Per-option note (optional)"
                    className="h-8 w-full border border-[var(--border)] bg-[var(--bg)] px-2.5 text-[12px] text-[var(--muted)]"
                  />
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                  <button type="button" onClick={() => moveOption(i, -1)} className="text-[11px] text-[var(--muted)] hover:text-[var(--fg)]">
                    &uarr;
                  </button>
                  <button type="button" onClick={() => moveOption(i, 1)} className="text-[11px] text-[var(--muted)] hover:text-[var(--fg)]">
                    &darr;
                  </button>
                  <button
                    type="button"
                    onClick={() => removeOption(i)}
                    className="text-[11px] text-[var(--muted)] hover:text-[var(--fg)]"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-[var(--muted)]">
            {type === "multiple_correct"
              ? "Tap a letter to toggle correctness — multiple options may be correct."
              : "Tap a letter to mark it as the single correct answer."}
          </p>
        </div>

        <div>
          <label className="mono-tag mb-1.5 block text-[11px] uppercase tracking-widest text-[var(--muted)]">
            Explanation
          </label>
          <textarea
            value={explanation ?? ""}
            onChange={(e) => setExplanation(e.target.value)}
            rows={3}
            className="w-full border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[14px]"
            placeholder="Shown to candidates after they submit."
          />
        </div>

        <label className="flex items-center gap-2 text-[13px]">
          <input
            type="checkbox"
            checked={isPublished}
            onChange={(e) => setIsPublished(e.target.checked)}
            className="h-4 w-4"
          />
          Published (visible to candidates)
        </label>

        {error && (
          <p className="border border-[var(--border)] px-3 py-2 text-[13px] text-[var(--muted)]">{error}</p>
        )}

        <div className="flex gap-3 border-t border-[var(--border)] pt-6">
          <button
            onClick={save}
            disabled={saving}
            className="h-10 border border-[var(--fg)] bg-[var(--fg)] px-6 font-mono text-[12px] uppercase tracking-widest text-[var(--bg)] disabled:opacity-50"
          >
            {saving ? "Saving..." : existing ? "Save changes" : "Create question"}
          </button>
          <button
            type="button"
            onClick={() => setPreview(true)}
            className="h-10 border border-[var(--border)] px-6 font-mono text-[12px] uppercase tracking-widest hover:border-[var(--fg)]"
          >
            Preview
          </button>
        </div>
      </div>
    </div>
  );
}
