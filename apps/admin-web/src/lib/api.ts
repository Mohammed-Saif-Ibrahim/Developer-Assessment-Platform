"use client";

import type {
  AdminQuestion,
  DashboardStats,
  Difficulty,
  QuestionType,
  SubjectWithStats,
  TopicWithStats,
} from "@dap/types";

const API_URL = process.env.NEXT_PUBLIC_ADMIN_API_URL ?? "http://localhost:4000/api/v1";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
  ...(init?.body ? { "Content-Type": "application/json" } : {}),
  ...(init?.headers ?? {}),
},
    // The admin session lives in an HttpOnly cookie set by the API, so
    // every request needs to include credentials for it to be sent.
    credentials: "include",
    cache: "no-store",
  });

  if (res.status === 401) {
  const body = await res.json().catch(() => ({}));

  if (path === "/admin/auth/login") {
    throw new ApiError(
      401,
      body.message ?? "Invalid email or password."
    );
  }

  if (
    typeof window !== "undefined" &&
    !window.location.pathname.startsWith("/admin/login")
  ) {
    window.location.href = "/admin/login";
  }

  throw new ApiError(401, "Session expired. Please log in again.");
}

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new ApiError(res.status, body.message ?? `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export interface AdminSubject extends SubjectWithStats {
  questionCount: number;
}

export interface AdminTopic extends TopicWithStats {
  subject?: { id: string; name: string; slug: string };
}

export const adminApi = {
  login: (email: string, password: string) =>
    request<{ admin: { id: string; email: string; name: string | null; role: string } }>(
      "/admin/auth/login",
      { method: "POST", body: JSON.stringify({ email, password }) }
    ),
  me: () => request<{ admin: { sub: string; email: string; role: string } }>("/admin/auth/me"),
  logout: () => request<void>("/admin/auth/logout", { method: "POST" }),

  getDashboard: () => request<DashboardStats>("/admin/dashboard"),

  getSubjects: () => request<AdminSubject[]>("/admin/subjects"),
  createSubject: (input: { name: string; description?: string; icon?: string; isPublished?: boolean }) =>
    request<AdminSubject>("/admin/subjects", { method: "POST", body: JSON.stringify(input) }),
  updateSubject: (id: string, input: Partial<{ name: string; description: string; icon: string; isPublished: boolean }>) =>
    request<AdminSubject>(`/admin/subjects/${id}`, { method: "PUT", body: JSON.stringify(input) }),
  deleteSubject: (id: string) => request<void>(`/admin/subjects/${id}`, { method: "DELETE" }),
  publishSubject: (id: string) => request<AdminSubject>(`/admin/subjects/${id}/publish`, { method: "POST" }),
  unpublishSubject: (id: string) => request<AdminSubject>(`/admin/subjects/${id}/unpublish`, { method: "POST" }),

  getTopics: (subjectId?: string) =>
    request<AdminTopic[]>(`/admin/topics${subjectId ? `?subjectId=${subjectId}` : ""}`),
  createTopic: (input: { subjectId: string; name: string; description?: string; sortOrder?: number }) =>
    request<AdminTopic>("/admin/topics", { method: "POST", body: JSON.stringify(input) }),
  updateTopic: (id: string, input: Partial<{ name: string; description: string; sortOrder: number; subjectId: string }>) =>
    request<AdminTopic>(`/admin/topics/${id}`, { method: "PUT", body: JSON.stringify(input) }),
  deleteTopic: (id: string) => request<void>(`/admin/topics/${id}`, { method: "DELETE" }),

  getQuestions: (filters?: { subjectId?: string; topicId?: string; isPublished?: boolean; difficulty?: Difficulty; type?: QuestionType }) => {
    const params = new URLSearchParams();
    if (filters?.subjectId) params.set("subjectId", filters.subjectId);
    if (filters?.topicId) params.set("topicId", filters.topicId);
    if (filters?.isPublished !== undefined) params.set("isPublished", String(filters.isPublished));
    if (filters?.difficulty) params.set("difficulty", filters.difficulty);
    if (filters?.type) params.set("type", filters.type);
    const qs = params.toString();
    return request<AdminQuestion[]>(`/admin/questions${qs ? `?${qs}` : ""}`);
  },
  getQuestion: (id: string) => request<AdminQuestion>(`/admin/questions/${id}`),
  createQuestion: (input: Record<string, unknown>) =>
    request<AdminQuestion>("/admin/questions", { method: "POST", body: JSON.stringify(input) }),
  updateQuestion: (id: string, input: Record<string, unknown>) =>
    request<AdminQuestion>(`/admin/questions/${id}`, { method: "PUT", body: JSON.stringify(input) }),
  deleteQuestion: (id: string) => request<void>(`/admin/questions/${id}`, { method: "DELETE" }),
  publishQuestion: (id: string) => request<AdminQuestion>(`/admin/questions/${id}/publish`, { method: "POST" }),
  unpublishQuestion: (id: string) => request<AdminQuestion>(`/admin/questions/${id}/unpublish`, { method: "POST" }),

  getSettings: () => request<{ weakAreaAccuracyThreshold: number; weakAreaMinAttempts: number }>("/admin/settings"),
  updateSettings: (input: { weakAreaAccuracyThreshold?: number; weakAreaMinAttempts?: number }) =>
    request<{ weakAreaAccuracyThreshold: number; weakAreaMinAttempts: number }>("/admin/settings", {
      method: "PUT",
      body: JSON.stringify(input),
    }),
};
