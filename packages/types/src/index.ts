// Shared domain types used by the API and both frontends.
// Keeping these in one package prevents drift between the backend
// contract and what each UI expects.

export type Difficulty = "easy" | "medium" | "hard" | "advanced";

export type QuestionType = "theory" | "code_output" | "debugging" | "multiple_correct";

export interface Subject {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SubjectWithStats extends Subject {
  topicCount: number;
  questionCount: number;
  publishedQuestionCount: number;
}

export interface Topic {
  id: string;
  subjectId: string;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface TopicWithStats extends Topic {
  questionCount: number;
}

// Option shape returned by the PUBLIC user API. Grading now happens
// entirely client-side (assessments/attempts are never persisted server
// side), so isCorrect + explanation are included here -- there's no
// server-held attempt left to protect by hiding them.
export interface PublicQuestionOption {
  id: string;
  optionText: string;
  isCorrect: boolean;
  explanation: string | null;
  sortOrder: number;
}

// Option shape used by the ADMIN API and internally by the backend.
export interface QuestionOption {
  id: string;
  questionId: string;
  optionText: string;
  isCorrect: boolean;
  explanation: string | null;
  sortOrder: number;
}

export interface PublicQuestion {
  id: string;
  subjectId: string;
  topicId: string;
  topicName: string;
  subjectName: string;
  type: QuestionType;
  difficulty: Difficulty;
  questionText: string;
  codeSnippet: string | null;
  codeLanguage: string | null;
  explanation: string | null;
  options: PublicQuestionOption[];
}

export interface AdminQuestion {
  id: string;
  subjectId: string;
  topicId: string;
  type: QuestionType;
  difficulty: Difficulty;
  questionText: string;
  codeSnippet: string | null;
  codeLanguage: string | null;
  explanation: string | null;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  options: QuestionOption[];
}

export type AssessmentMode = "practice" | "timed" | "mixed" | "topic" | "weak_areas";

export interface GenerateAssessmentRequest {
  mode: AssessmentMode;
  subjectId?: string;
  topicId?: string;
  difficulty?: Difficulty | "mixed";
  questionCount?: number;
  durationSeconds?: number;
}

// Everything below this point used to be server-persisted (assessments,
// attempts, progress, bookmarks). It's all assembled and stored entirely
// in the browser's localStorage now -- these types describe that local
// shape, not an API response. `id`/`attemptId` values are client-generated
// (crypto.randomUUID()), not database ids.

export interface GeneratedAssessment {
  id: string;
  mode: AssessmentMode;
  subjectId: string | null;
  durationSeconds: number | null;
  questions: PublicQuestion[];
}

export interface SubmitAttemptAnswer {
  questionId: string;
  selectedOptionIds: string[];
  timeSpentSeconds?: number;
}

export interface AttemptAnswerResult {
  questionId: string;
  selectedOptionIds: string[];
  correctOptionIds: string[];
  isCorrect: boolean;
  explanation: string | null;
  topicId: string;
  topicName: string;
  subjectId: string;
  subjectName: string;
  difficulty: Difficulty;
  questionText: string;
  codeSnippet: string | null;
  options: PublicQuestionOption[];
}

export interface TopicPerformance {
  topicId: string;
  topicName: string;
  attempted: number;
  correct: number;
  accuracy: number;
}

export interface AttemptResult {
  attemptId: string;
  assessmentId: string;
  score: number;
  totalQuestions: number;
  correct: number;
  incorrect: number;
  unanswered: number;
  accuracy: number;
  totalTimeSeconds: number;
  topicPerformance: TopicPerformance[];
  strongAreas: string[];
  weakAreas: string[];
  answers: AttemptAnswerResult[];
  createdAt: string;
}

export interface ProgressTopicSummary {
  topicId: string;
  topicName: string;
  subjectId: string;
  subjectName: string;
  attempts: number;
  correct: number;
  accuracy: number;
  isWeak: boolean;
}

export interface ProgressOverview {
  totalAttempts: number;
  totalQuestionsAnswered: number;
  overallAccuracy: number;
  bySubject: {
    subjectId: string;
    subjectName: string;
    attempts: number;
    accuracy: number;
  }[];
  byTopic: ProgressTopicSummary[];
  weakAreas: ProgressTopicSummary[];
  recentAttempts: {
    attemptId: string;
    assessmentId: string;
    subjectName: string | null;
    score: number;
    totalQuestions: number;
    accuracy: number;
    createdAt: string;
  }[];
}

export interface Bookmark {
  questionId: string;
  questionText: string;
  type: QuestionType;
  difficulty: Difficulty;
  topicName: string;
  subjectName: string;
  createdAt: string;
}

export interface DashboardStats {
  totalSubjects: number;
  totalTopics: number;
  totalQuestions: number;
  publishedQuestions: number;
  draftQuestions: number;
  byDifficulty: Record<Difficulty, number>;
  bySubject: { subjectId: string; subjectName: string; count: number }[];
}

export interface ApiError {
  error: string;
  message: string;
  details?: unknown;
}
