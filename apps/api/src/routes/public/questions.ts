import type { FastifyInstance } from "fastify";
import { and, eq, inArray } from "drizzle-orm";
import { getDb, schema } from "@dap/database";
import type { PublicQuestion } from "@dap/types";

// Grading now happens entirely on the client (there's no server-side
// attempt to protect), so the public payload includes each option's
// isCorrect flag and explanation. Topic/subject names are embedded too,
// so the client can group results by topic/subject for progress tracking
// without extra round-trips.
function toPublicQuestion(
  question: typeof schema.questions.$inferSelect & {
    topic: { name: string };
    subject: { name: string };
  },
  options: (typeof schema.questionOptions.$inferSelect)[]
): PublicQuestion {
  return {
    id: question.id,
    subjectId: question.subjectId,
    topicId: question.topicId,
    topicName: question.topic.name,
    subjectName: question.subject.name,
    type: question.type,
    difficulty: question.difficulty,
    questionText: question.questionText,
    codeSnippet: question.codeSnippet,
    codeLanguage: question.codeLanguage,
    explanation: question.explanation,
    options: options
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((o) => ({
        id: o.id,
        optionText: o.optionText,
        isCorrect: o.isCorrect,
        explanation: o.explanation,
        sortOrder: o.sortOrder,
      })),
  };
}

export default async function questionsRoutes(app: FastifyInstance) {
  const db = getDb();

  // GET /api/v1/questions?subjectId=&topicId=&topicIds=a,b,c&difficulty=
  // The assessment picker (mode, question count, shuffling, weak-area topic
  // selection) now runs entirely client-side, so this is the one pool-fetch
  // endpoint it builds a quiz from. `topicIds` (comma-separated) lets the
  // client pull questions across several topics at once, e.g. for a
  // weak-areas quiz assembled from local attempt history.
  app.get<{
    Querystring: { subjectId?: string; topicId?: string; topicIds?: string; difficulty?: string };
  }>("/questions", async (request, reply) => {
    const { subjectId, topicId, topicIds, difficulty } = request.query;

    const conditions = [eq(schema.questions.isPublished, true)];
    if (subjectId) conditions.push(eq(schema.questions.subjectId, subjectId));
    if (topicId) conditions.push(eq(schema.questions.topicId, topicId));
    if (topicIds) {
      const ids = topicIds
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);
      if (ids.length > 0) conditions.push(inArray(schema.questions.topicId, ids));
    }
    if (difficulty) conditions.push(eq(schema.questions.difficulty, difficulty as any));

    const rows = await db.query.questions.findMany({
      where: and(...conditions),
      with: { options: true, topic: true, subject: true },
      limit: 200,
    });

    return reply.send(rows.map((q) => toPublicQuestion(q, q.options)));
  });

  // GET /api/v1/questions/:id
  app.get<{ Params: { id: string } }>("/questions/:id", async (request, reply) => {
    const question = await db.query.questions.findFirst({
      where: and(eq(schema.questions.id, request.params.id), eq(schema.questions.isPublished, true)),
      with: { options: true, topic: true, subject: true },
    });

    if (!question) {
      return reply.code(404).send({ error: "not_found", message: "Question not found." });
    }

    return reply.send(toPublicQuestion(question, question.options));
  });
}
