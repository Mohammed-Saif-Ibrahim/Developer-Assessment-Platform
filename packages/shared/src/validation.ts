import { z } from "zod";
import { ASSESSMENT_MODES, DIFFICULTIES, QUESTION_TYPES } from "./constants";

export const difficultySchema = z.enum(DIFFICULTIES);
export const questionTypeSchema = z.enum(QUESTION_TYPES);
export const assessmentModeSchema = z.enum(ASSESSMENT_MODES);

export const createSubjectSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z.string().min(2).max(140).optional(),
  description: z.string().max(2000).optional().nullable(),
  icon: z.string().max(60).optional().nullable(),
  isPublished: z.boolean().optional(),
});

export const updateSubjectSchema = createSubjectSchema.partial();

export const createTopicSchema = z.object({
  subjectId: z.string().uuid(),
  name: z.string().min(2).max(120),
  slug: z.string().min(2).max(140).optional(),
  description: z.string().max(2000).optional().nullable(),
  sortOrder: z.number().int().optional(),
});

export const updateTopicSchema = createTopicSchema.partial().omit({ subjectId: true }).extend({
  subjectId: z.string().uuid().optional(),
});

export const questionOptionInputSchema = z.object({
  id: z.string().uuid().optional(), // present when editing an existing option
  optionText: z.string().min(1).max(2000),
  isCorrect: z.boolean().default(false),
  explanation: z.string().max(2000).optional().nullable(),
  sortOrder: z.number().int().min(0).max(100).default(0),
});

export const createQuestionSchema = z.object({
  subjectId: z.string().uuid(),
  topicId: z.string().uuid(),
  type: questionTypeSchema,
  difficulty: difficultySchema,
  questionText: z.string().min(3).max(4000),
  codeSnippet: z.string().max(20000).optional().nullable(),
  codeLanguage: z.string().max(30).optional().nullable(),
  explanation: z.string().max(8000).optional().nullable(),
  isPublished: z.boolean().optional(),
  options: z.array(questionOptionInputSchema).min(2, "At least two options are required").max(12),
});

export const updateQuestionSchema = createQuestionSchema.partial().extend({
  options: z.array(questionOptionInputSchema).min(2).optional(),
});

// NOTE: assessment generation, attempt submission/grading, and bookmarks are
// all client-side now (localStorage), so there are no server-side schemas
// for them anymore. The remaining schemas below cover content CRUD
// (subjects/topics/questions), admin login, and global app settings --
// the only things the server persists.

// Client-side equivalent of the old generateAssessmentSchema, kept here so
// both frontends validate the same shape before building a quiz locally.
export const generateAssessmentSchema = z.object({
  mode: assessmentModeSchema,
  subjectId: z.string().uuid().optional(),
  topicId: z.string().uuid().optional(),
  difficulty: z.union([difficultySchema, z.literal("mixed")]).optional(),
  questionCount: z.number().int().min(1).max(100).optional(),
  durationSeconds: z.number().int().min(30).max(60 * 60 * 4).optional(),
});

export const adminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const updateSettingsSchema = z.object({
  weakAreaAccuracyThreshold: z.number().min(0).max(100).optional(),
  weakAreaMinAttempts: z.number().int().min(1).optional(),
});
