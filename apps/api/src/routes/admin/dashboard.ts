import type { FastifyInstance } from "fastify";
import { count, eq } from "drizzle-orm";
import { getDb, schema } from "@dap/database";
import type { DashboardStats, Difficulty } from "@dap/types";
import { DIFFICULTIES } from "@dap/shared";

export default async function adminDashboardRoutes(app: FastifyInstance) {
  const db = getDb();
  app.addHook("preHandler", app.requireAdmin);

  app.get("/dashboard", async (_request, reply) => {
    const [totalSubjectsRow] = await db.select({ value: count() }).from(schema.subjects);
    const [totalTopicsRow] = await db.select({ value: count() }).from(schema.topics);
    const [totalQuestionsRow] = await db.select({ value: count() }).from(schema.questions);
    const [publishedRow] = await db
      .select({ value: count() })
      .from(schema.questions)
      .where(eq(schema.questions.isPublished, true));
    const [draftRow] = await db
      .select({ value: count() })
      .from(schema.questions)
      .where(eq(schema.questions.isPublished, false));

    const byDifficulty: Record<Difficulty, number> = {
      easy: 0,
      medium: 0,
      hard: 0,
      advanced: 0,
    };
    for (const difficulty of DIFFICULTIES) {
      const [row] = await db
        .select({ value: count() })
        .from(schema.questions)
        .where(eq(schema.questions.difficulty, difficulty));
      byDifficulty[difficulty] = row?.value ?? 0;
    }

    const subjects = await db.query.subjects.findMany();
    const bySubject = await Promise.all(
      subjects.map(async (s) => {
        const [row] = await db
          .select({ value: count() })
          .from(schema.questions)
          .where(eq(schema.questions.subjectId, s.id));
        return { subjectId: s.id, subjectName: s.name, count: row?.value ?? 0 };
      })
    );

    const stats: DashboardStats = {
      totalSubjects: totalSubjectsRow?.value ?? 0,
      totalTopics: totalTopicsRow?.value ?? 0,
      totalQuestions: totalQuestionsRow?.value ?? 0,
      publishedQuestions: publishedRow?.value ?? 0,
      draftQuestions: draftRow?.value ?? 0,
      byDifficulty,
      bySubject: bySubject.sort((a, b) => b.count - a.count),
    };

    return reply.send(stats);
  });
}
