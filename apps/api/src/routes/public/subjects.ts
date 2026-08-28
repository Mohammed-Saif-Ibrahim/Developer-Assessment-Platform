import type { FastifyInstance } from "fastify";
import { and, count, eq } from "drizzle-orm";
import { getDb, schema } from "@dap/database";

export default async function subjectsRoutes(app: FastifyInstance) {
  const db = getDb();

  // GET /api/v1/subjects - published subjects with lightweight stats
  app.get("/subjects", async (_request, reply) => {
    const rows = await db.query.subjects.findMany({
      where: eq(schema.subjects.isPublished, true),
      orderBy: (s, { asc }) => [asc(s.name)],
    });

    const withStats = await Promise.all(
      rows.map(async (subject) => {
        const [topicCountRow] = await db
          .select({ value: count() })
          .from(schema.topics)
          .where(eq(schema.topics.subjectId, subject.id));

        const [questionCountRow] = await db
          .select({ value: count() })
          .from(schema.questions)
          .where(
            and(eq(schema.questions.subjectId, subject.id), eq(schema.questions.isPublished, true))
          );

        return {
          ...subject,
          topicCount: topicCountRow?.value ?? 0,
          publishedQuestionCount: questionCountRow?.value ?? 0,
        };
      })
    );

    return reply.send(withStats);
  });

  // GET /api/v1/subjects/:slug
  app.get<{ Params: { slug: string } }>("/subjects/:slug", async (request, reply) => {
    const subject = await db.query.subjects.findFirst({
      where: and(eq(schema.subjects.slug, request.params.slug), eq(schema.subjects.isPublished, true)),
    });

    if (!subject) {
      return reply.code(404).send({ error: "not_found", message: "Subject not found." });
    }

    return reply.send(subject);
  });

  // GET /api/v1/subjects/:id/topics
  app.get<{ Params: { id: string } }>("/subjects/:id/topics", async (request, reply) => {
    const topicRows = await db.query.topics.findMany({
      where: eq(schema.topics.subjectId, request.params.id),
      orderBy: (t, { asc }) => [asc(t.sortOrder), asc(t.name)],
    });

    const withCounts = await Promise.all(
      topicRows.map(async (topic) => {
        const [questionCountRow] = await db
          .select({ value: count() })
          .from(schema.questions)
          .where(and(eq(schema.questions.topicId, topic.id), eq(schema.questions.isPublished, true)));

        return { ...topic, questionCount: questionCountRow?.value ?? 0 };
      })
    );

    return reply.send(withCounts);
  });
}
