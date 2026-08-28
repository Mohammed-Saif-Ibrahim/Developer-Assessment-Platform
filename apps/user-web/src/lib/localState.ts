"use client";

// Everything a visitor does -- assessments, attempts, progress, bookmarks --
// lives here, in the browser's localStorage, and nowhere else. Nothing in
// this file ever leaves the device. The server only ever sees read-only
// GET requests for published content (subjects/topics/questions).

import type { AttemptResult, Bookmark, GeneratedAssessment } from "@dap/types";

const ATTEMPTS_KEY = "dap:attempts";
const CURRENT_ASSESSMENT_KEY = "dap:currentAssessment";
const BOOKMARKS_KEY = "dap:bookmarks";
const MAX_STORED_ATTEMPTS = 50;

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage can throw if full or disabled (private browsing, etc).
    // Best-effort only -- nothing here is critical enough to surface an error.
  }
}

// ---------------------------------------------------------------------------
// Attempts (a completed, graded quiz run) -- this replaces the old
// server-side `attempts` / `attempt_answers` tables entirely.
// ---------------------------------------------------------------------------

export function saveAttempt(result: AttemptResult) {
  const existing = getAttempts();
  const next = [result, ...existing].slice(0, MAX_STORED_ATTEMPTS);
  writeJSON(ATTEMPTS_KEY, next);
}

export function getAttempts(): AttemptResult[] {
  return readJSON<AttemptResult[]>(ATTEMPTS_KEY, []);
}

export function getAttempt(attemptId: string): AttemptResult | null {
  return getAttempts().find((a) => a.attemptId === attemptId) ?? null;
}

// ---------------------------------------------------------------------------
// In-progress quiz -- lets a page refresh mid-quiz resume cleanly. Stores
// the *whole* generated assessment (not just its id), since there's no
// server to re-fetch it from.
// ---------------------------------------------------------------------------

export interface CurrentAssessmentState {
  assessment: GeneratedAssessment;
  answers: Record<string, string[]>;
  startedAt: number;
}

export function saveCurrentAssessment(state: CurrentAssessmentState) {
  writeJSON(CURRENT_ASSESSMENT_KEY, state);
}

export function loadCurrentAssessment(assessmentId: string): CurrentAssessmentState | null {
  const parsed = readJSON<CurrentAssessmentState | null>(CURRENT_ASSESSMENT_KEY, null);
  if (!parsed || parsed.assessment.id !== assessmentId) return null;
  return parsed;
}

export function clearCurrentAssessment() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(CURRENT_ASSESSMENT_KEY);
}

// ---------------------------------------------------------------------------
// Bookmarks
// ---------------------------------------------------------------------------

export function getBookmarks(): Bookmark[] {
  return readJSON<Bookmark[]>(BOOKMARKS_KEY, []);
}

export function isBookmarked(questionId: string): boolean {
  return getBookmarks().some((b) => b.questionId === questionId);
}

export function addBookmark(entry: Bookmark) {
  const existing = getBookmarks();
  if (existing.some((b) => b.questionId === entry.questionId)) return;
  writeJSON(BOOKMARKS_KEY, [entry, ...existing]);
}

export function removeBookmark(questionId: string) {
  writeJSON(
    BOOKMARKS_KEY,
    getBookmarks().filter((b) => b.questionId !== questionId)
  );
}
