import type { Difficulty, PublicQuestion, SubjectWithStats, TopicWithStats } from "@dap/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    // No anonymous session cookie exists anymore -- every route the
    // user-web app calls is public, unauthenticated content. `credentials`
    // is left at its default (omit) since there's nothing to send.
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(body.message ?? `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export interface QuestionPoolFilter {
  subjectId?: string;
  topicId?: string;
  topicIds?: string[];
  difficulty?: Difficulty | "mixed";
}

// The API surface here is intentionally small: read-only content
// (subjects, topics, questions) plus the global weak-area thresholds.
// Assessment generation, grading, progress, and bookmarks all happen in
// the browser now -- see lib/quizEngine.ts and lib/localState.ts.
export const api = {
  getSubjects: () => request<SubjectWithStats[]>("/subjects"),
  getSubject: (slug: string) => request<SubjectWithStats>(`/subjects/${slug}`),
  getTopics: (subjectId: string) => request<TopicWithStats[]>(`/subjects/${subjectId}/topics`),

  getQuestion: (id: string) => request<PublicQuestion>(`/questions/${id}`),

  getQuestions: (filter: QuestionPoolFilter = {}) => {
    const params = new URLSearchParams();
    if (filter.subjectId) params.set("subjectId", filter.subjectId);
    if (filter.topicId) params.set("topicId", filter.topicId);
    if (filter.topicIds && filter.topicIds.length > 0) {
      params.set("topicIds", filter.topicIds.join(","));
    }
    if (filter.difficulty && filter.difficulty !== "mixed") {
      params.set("difficulty", filter.difficulty);
    }
    const qs = params.toString();
    return request<PublicQuestion[]>(`/questions${qs ? `?${qs}` : ""}`);
  },

  getWeakAreaThresholds: () =>
    request<{ accuracyThreshold: number; minAttempts: number }>("/settings/weak-area"),
};
