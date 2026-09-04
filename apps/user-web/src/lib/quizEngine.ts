"use client";

// This is the client-side replacement for what used to be three server
// routes and two backend services (routes/public/{assessments,attempts,
// progress}.ts, services/{scoring,weakArea}.ts). Nothing here talks to a
// database -- it works entirely off the question pool fetched from the
// public content API plus whatever's already sitting in localStorage.

import {
  DEFAULT_PRACTICE_QUESTION_COUNT,
  DEFAULT_TIMED_QUESTION_COUNT,
  DEFAULT_WEAK_AREA_ACCURACY_THRESHOLD,
  DEFAULT_WEAK_AREA_MIN_ATTEMPTS,
} from "@dap/shared";
import type {
  AttemptAnswerResult,
  AttemptResult,
  GenerateAssessmentRequest,
  GeneratedAssessment,
  ProgressOverview,
  ProgressTopicSummary,
  PublicQuestion,
  TopicPerformance,
} from "@dap/types";
import { api } from "./api";
import { getAttempts } from "./localState";

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function computeAccuracy(correct: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((correct / total) * 1000) / 10; // one decimal place
}

function isWeakTopic(
  accuracy: number,
  attempts: number,
  thresholds: { accuracyThreshold: number; minAttempts: number }
): boolean {
  return attempts >= thresholds.minAttempts && accuracy < thresholds.accuracyThreshold;
}

async function getWeakAreaThresholds(): Promise<{ accuracyThreshold: number; minAttempts: number }> {
  try {
    return await api.getWeakAreaThresholds();
  } catch {
    // Server unreachable or the settings route failed -- fall back to the
    // same defaults the backend used to ship with.
    return {
      accuracyThreshold: DEFAULT_WEAK_AREA_ACCURACY_THRESHOLD,
      minAttempts: DEFAULT_WEAK_AREA_MIN_ATTEMPTS,
    };
  }
}

/** Per-topic attempted/correct counts, derived from every attempt saved locally. */
function aggregateTopicStats(): Map<string, { topicName: string; subjectId: string; subjectName: string; attempted: number; correct: number }> {
  const map = new Map<
    string,
    { topicName: string; subjectId: string; subjectName: string; attempted: number; correct: number }
  >();
  for (const attempt of getAttempts()) {
    for (const answer of attempt.answers) {
      const entry = map.get(answer.topicId) ?? {
        topicName: answer.topicName,
        subjectId: answer.subjectId,
        subjectName: answer.subjectName,
        attempted: 0,
        correct: 0,
      };
      entry.attempted += 1;
      if (answer.isCorrect) entry.correct += 1;
      map.set(answer.topicId, entry);
    }
  }
  return map;
}

/** Topic ids whose local accuracy is below threshold, for "weak areas" mode. */
async function getWeakTopicIds(): Promise<string[]> {
  const thresholds = await getWeakAreaThresholds();
  const stats = aggregateTopicStats();
  const weak: string[] = [];
  for (const [topicId, s] of stats) {
    const accuracy = computeAccuracy(s.correct, s.attempted);
    if (isWeakTopic(accuracy, s.attempted, thresholds)) weak.push(topicId);
  }
  return weak;
}

/**
 * Builds a quiz from the published question pool. This is the client-side
 * equivalent of the old `POST /assessments` route -- same mode logic
 * (shuffle, mixed-type balancing, weak-area topic filtering), just running
 * in the browser instead of on the server, and generating its own id
 * instead of an inserted row's id.
 */
export async function generateAssessment(
  input: GenerateAssessmentRequest
): Promise<GeneratedAssessment> {
  let topicIds: string[] | undefined;

  if (input.mode === "weak_areas") {
    topicIds = await getWeakTopicIds();
    if (topicIds.length === 0) {
      return { id: "", mode: input.mode, subjectId: input.subjectId ?? null, durationSeconds: null, questions: [] };
    }
  }

  const pool = await api.getQuestions({
    subjectId: input.subjectId,
    topicId: input.mode === "topic" ? input.topicId : undefined,
    topicIds,
    difficulty: input.difficulty,
  });

  if (pool.length === 0) {
    return { id: "", mode: input.mode, subjectId: input.subjectId ?? null, durationSeconds: null, questions: [] };
  }

  let selected = shuffle(pool);

  const defaultCount =
    input.mode === "timed" ? DEFAULT_TIMED_QUESTION_COUNT : DEFAULT_PRACTICE_QUESTION_COUNT;
  const questionCount = input.questionCount ?? defaultCount;

  if (input.mode === "mixed") {
    // Guarantee a spread of theory + code-based question types where possible.
    const theory = selected.filter((q) => q.type === "theory");
    const code = selected.filter((q) => q.type !== "theory");
    const half = Math.ceil(questionCount / 2);
    selected = shuffle([...theory.slice(0, half), ...code.slice(0, half)]);
  }

  selected = selected.slice(0, questionCount);

  // Timed mode gives each question a fixed 1 minute (60s) on the clock.
  const SECONDS_PER_QUESTION = 60;

  const durationSeconds =
    input.mode === "timed"
      ? input.durationSeconds ?? selected.length * SECONDS_PER_QUESTION
      : null;

  return {
    id: crypto.randomUUID(),
    mode: input.mode,
    subjectId: input.subjectId ?? null,
    durationSeconds,
    questions: selected,
  };
}

/**
 * Grades a completed assessment against the submitted answers. This is the
 * client-side equivalent of the old `POST /attempts` route + scoring
 * service -- pure and synchronous, since every option's `isCorrect` is
 * already embedded in the questions the assessment was built from.
 */
export function gradeAssessment(
  assessment: GeneratedAssessment,
  answers: Record<string, string[]>,
  totalTimeSeconds: number
): AttemptResult {
  let correctCount = 0;
  let incorrectCount = 0;
  let unansweredCount = 0;

  const answerResults: AttemptAnswerResult[] = assessment.questions.map((question) => {
    const selectedOptionIds = answers[question.id] ?? [];
    const correctOptionIds = question.options.filter((o) => o.isCorrect).map((o) => o.id);

    let isCorrect = false;
    if (selectedOptionIds.length === 0) {
      unansweredCount += 1;
    } else {
      const correctSet = new Set(correctOptionIds);
      const selectedSet = new Set(selectedOptionIds);
      isCorrect =
        correctSet.size === selectedSet.size && [...correctSet].every((id) => selectedSet.has(id));
      if (isCorrect) correctCount += 1;
      else incorrectCount += 1;
    }

    return {
      questionId: question.id,
      selectedOptionIds,
      correctOptionIds,
      isCorrect,
      explanation: question.explanation,
      topicId: question.topicId,
      topicName: question.topicName,
      subjectId: question.subjectId,
      subjectName: question.subjectName,
      difficulty: question.difficulty,
      questionText: question.questionText,
      codeSnippet: question.codeSnippet,
      options: question.options,
    };
  });

  const topicMap = new Map<string, { topicName: string; attempted: number; correct: number }>();
  for (const a of answerResults) {
    const entry = topicMap.get(a.topicId) ?? { topicName: a.topicName, attempted: 0, correct: 0 };
    entry.attempted += 1;
    if (a.isCorrect) entry.correct += 1;
    topicMap.set(a.topicId, entry);
  }

  const topicPerformance: TopicPerformance[] = [...topicMap.entries()].map(([topicId, v]) => ({
    topicId,
    topicName: v.topicName,
    attempted: v.attempted,
    correct: v.correct,
    accuracy: computeAccuracy(v.correct, v.attempted),
  }));

  const sorted = [...topicPerformance].sort((a, b) => b.accuracy - a.accuracy);
  const strongAreas = sorted.filter((t) => t.accuracy >= 70).slice(0, 3).map((t) => t.topicName);
  const weakAreas = sorted
    .filter((t) => t.accuracy < 70)
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 3)
    .map((t) => t.topicName);

  const totalQuestions = assessment.questions.length;

  return {
    attemptId: crypto.randomUUID(),
    assessmentId: assessment.id,
    score: correctCount,
    totalQuestions,
    correct: correctCount,
    incorrect: incorrectCount,
    unanswered: unansweredCount,
    accuracy: computeAccuracy(correctCount, totalQuestions),
    totalTimeSeconds,
    topicPerformance,
    strongAreas,
    weakAreas,
    answers: answerResults,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Aggregates every attempt saved in this browser into an overview, the
 * client-side equivalent of the old `GET /progress` route.
 */
export async function computeProgress(): Promise<ProgressOverview> {
  const attempts = getAttempts();
  const thresholds = await getWeakAreaThresholds();

  const totalAttempts = attempts.length;
  const totalQuestionsAnswered = attempts.reduce((sum, a) => sum + a.totalQuestions, 0);
  const totalCorrect = attempts.reduce((sum, a) => sum + a.correct, 0);
  const overallAccuracy = computeAccuracy(totalCorrect, totalQuestionsAnswered);

  const topicStats = aggregateTopicStats();
  const byTopic: ProgressTopicSummary[] = [...topicStats.entries()].map(([topicId, s]) => {
    const accuracy = computeAccuracy(s.correct, s.attempted);
    return {
      topicId,
      topicName: s.topicName,
      subjectId: s.subjectId,
      subjectName: s.subjectName,
      attempts: s.attempted,
      correct: s.correct,
      accuracy,
      isWeak: isWeakTopic(accuracy, s.attempted, thresholds),
    };
  });

  const bySubjectMap = new Map<string, { subjectName: string; attempts: number; correct: number; total: number }>();
  for (const t of byTopic) {
    const entry = bySubjectMap.get(t.subjectId) ?? {
      subjectName: t.subjectName,
      attempts: 0,
      correct: 0,
      total: 0,
    };
    entry.attempts += t.attempts;
    entry.correct += t.correct;
    entry.total += t.attempts;
    bySubjectMap.set(t.subjectId, entry);
  }

  const bySubject = [...bySubjectMap.entries()].map(([subjectId, v]) => ({
    subjectId,
    subjectName: v.subjectName,
    attempts: v.attempts,
    accuracy: computeAccuracy(v.correct, v.total),
  }));

  const weakAreas = byTopic.filter((t) => t.isWeak).sort((a, b) => a.accuracy - b.accuracy);

  const recentAttempts = attempts.slice(0, 10).map((a) => {
    const subjectNames = new Set(a.answers.map((ans) => ans.subjectName));
    return {
      attemptId: a.attemptId,
      assessmentId: a.assessmentId,
      subjectName: subjectNames.size === 1 ? [...subjectNames][0] : null,
      score: a.score,
      totalQuestions: a.totalQuestions,
      accuracy: a.accuracy,
      createdAt: a.createdAt,
    };
  });

  return {
    totalAttempts,
    totalQuestionsAnswered,
    overallAccuracy,
    bySubject,
    byTopic,
    weakAreas,
    recentAttempts,
  };
}

export function bookmarkFromQuestion(question: PublicQuestion) {
  return {
    questionId: question.id,
    questionText: question.questionText,
    type: question.type,
    difficulty: question.difficulty,
    topicName: question.topicName,
    subjectName: question.subjectName,
    createdAt: new Date().toISOString(),
  };
}
