import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  integer,
  pgEnum,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const difficultyEnum = pgEnum("difficulty", ["easy", "medium", "hard", "advanced"]);

export const questionTypeEnum = pgEnum("question_type", [
  "theory",
  "code_output",
  "debugging",
  "multiple_correct",
]);

// ---------------------------------------------------------------------------
// Subjects
// ---------------------------------------------------------------------------

export const subjects = pgTable(
  "subjects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 120 }).notNull(),
    slug: varchar("slug", { length: 140 }).notNull(),
    description: text("description"),
    icon: varchar("icon", { length: 60 }),
    isPublished: boolean("is_published").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    slugIdx: uniqueIndex("subjects_slug_idx").on(table.slug),
  })
);

// ---------------------------------------------------------------------------
// Topics
// ---------------------------------------------------------------------------

export const topics = pgTable(
  "topics",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 120 }).notNull(),
    slug: varchar("slug", { length: 140 }).notNull(),
    description: text("description"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    subjectSlugIdx: uniqueIndex("topics_subject_slug_idx").on(table.subjectId, table.slug),
    subjectIdx: index("topics_subject_idx").on(table.subjectId),
  })
);

// ---------------------------------------------------------------------------
// Questions
// ---------------------------------------------------------------------------

export const questions = pgTable(
  "questions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    topicId: uuid("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
    type: questionTypeEnum("type").notNull().default("theory"),
    difficulty: difficultyEnum("difficulty").notNull().default("medium"),
    questionText: text("question_text").notNull(),
    codeSnippet: text("code_snippet"),
    codeLanguage: varchar("code_language", { length: 30 }),
    explanation: text("explanation"),
    isPublished: boolean("is_published").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    subjectIdx: index("questions_subject_idx").on(table.subjectId),
    topicIdx: index("questions_topic_idx").on(table.topicId),
    publishedIdx: index("questions_published_idx").on(table.isPublished),
    difficultyIdx: index("questions_difficulty_idx").on(table.difficulty),
  })
);

// ---------------------------------------------------------------------------
// Question options
// ---------------------------------------------------------------------------

export const questionOptions = pgTable(
  "question_options",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    optionText: text("option_text").notNull(),
    isCorrect: boolean("is_correct").notNull().default(false),
    explanation: text("explanation"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => ({
    questionIdx: index("question_options_question_idx").on(table.questionId),
  })
);

// ---------------------------------------------------------------------------
// Admin users
// ---------------------------------------------------------------------------

export const adminUsers = pgTable(
  "admin_users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 200 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    name: varchar("name", { length: 120 }),
    role: varchar("role", { length: 30 }).notNull().default("admin"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    emailIdx: uniqueIndex("admin_users_email_idx").on(table.email),
  })
);

// ---------------------------------------------------------------------------
// App settings (e.g. weak-area threshold), key/value, admin-editable
// ---------------------------------------------------------------------------

export const settings = pgTable("settings", {
  key: varchar("key", { length: 80 }).primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const subjectsRelations = relations(subjects, ({ many }) => ({
  topics: many(topics),
  questions: many(questions),
}));

export const topicsRelations = relations(topics, ({ one, many }) => ({
  subject: one(subjects, { fields: [topics.subjectId], references: [subjects.id] }),
  questions: many(questions),
}));

export const questionsRelations = relations(questions, ({ one, many }) => ({
  subject: one(subjects, { fields: [questions.subjectId], references: [subjects.id] }),
  topic: one(topics, { fields: [questions.topicId], references: [topics.id] }),
  options: many(questionOptions),
}));

export const questionOptionsRelations = relations(questionOptions, ({ one }) => ({
  question: one(questions, { fields: [questionOptions.questionId], references: [questions.id] }),
}));
