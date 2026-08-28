import type { FastifyInstance } from "fastify";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@dap/database";
import { createQuestionSchema, updateQuestionSchema } from "@dap/shared";

export default async function adminQuestionsRoutes(app: FastifyInstance) {
  const db = getDb();
  app.addHook("preHandler", app.requireAdmin);

  // GET /api/v1/admin/questions?subjectId=&topicId=&isPublished=&difficulty=&type=
  app.get<{
    Querystring: {
      subjectId?: string;
      topicId?: string;
      isPublished?: string;
      difficulty?: string;
      type?: string;
    };
  }>("/questions", async (request, reply) => {
    const { subjectId, topicId, isPublished, difficulty, type } = request.query;
    const conditions = [];
    if (subjectId) conditions.push(eq(schema.questions.subjectId, subjectId));
    if (topicId) conditions.push(eq(schema.questions.topicId, topicId));
    if (isPublished !== undefined) conditions.push(eq(schema.questions.isPublished, isPublished === "true"));
    if (difficulty) conditions.push(eq(schema.questions.difficulty, difficulty as any));
    if (type) conditions.push(eq(schema.questions.type, type as any));

    const rows = await db.query.questions.findMany({
      where: conditions.length ? and(...conditions) : undefined,
      with: { options: true, subject: true, topic: true },
      orderBy: (q, { desc }) => [desc(q.createdAt)],
      limit: 200,
    });

    return reply.send(rows);
  });

  // GET /api/v1/admin/questions/:id
  app.get<{ Params: { id: string } }>("/questions/:id", async (request, reply) => {
    const question = await db.query.questions.findFirst({
      where: eq(schema.questions.id, request.params.id),
      with: { options: true, subject: true, topic: true },
    });
    if (!question) return reply.code(404).send({ error: "not_found", message: "Question not found." });
    return reply.send(question);
  });

  // POST /api/v1/admin/questions
  app.post("/questions", async (request, reply) => {
    const parsed = createQuestionSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "validation_error", message: "Invalid question.", details: parsed.error.flatten() });
    }
    const input = parsed.data;

    if (!input.options.some((o) => o.isCorrect)) {
      return reply.code(400).send({ error: "validation_error", message: "At least one option must be marked correct." });
    }

    const [question] = await db
      .insert(schema.questions)
      .values({
        subjectId: input.subjectId,
        topicId: input.topicId,
        type: input.type,
        difficulty: input.difficulty,
        questionText: input.questionText,
        codeSnippet: input.codeSnippet ?? null,
        codeLanguage: input.codeLanguage ?? null,
        explanation: input.explanation ?? null,
        isPublished: input.isPublished ?? false,
      })
      .returning();

    await db.insert(schema.questionOptions).values(
      input.options.map((o, idx) => ({
        questionId: question.id,
        optionText: o.optionText,
        isCorrect: o.isCorrect,
        explanation: o.explanation ?? null,
        sortOrder: o.sortOrder ?? idx,
      }))
    );

    const full = await db.query.questions.findFirst({
      where: eq(schema.questions.id, question.id),
      with: { options: true },
    });

    return reply.code(201).send(full);
  });

  // PUT /api/v1/admin/questions/:id
  app.put<{ Params: { id: string } }>("/questions/:id", async (request, reply) => {
    const parsed = updateQuestionSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "validation_error", message: "Invalid question.", details: parsed.error.flatten() });
    }
    const input = parsed.data;

    if (input.options && !input.options.some((o) => o.isCorrect)) {
      return reply.code(400).send({ error: "validation_error", message: "At least one option must be marked correct." });
    }

    const [updated] = await db
      .update(schema.questions)
      .set({
        ...(input.subjectId !== undefined ? { subjectId: input.subjectId } : {}),
        ...(input.topicId !== undefined ? { topicId: input.topicId } : {}),
        ...(input.type !== undefined ? { type: input.type } : {}),
        ...(input.difficulty !== undefined ? { difficulty: input.difficulty } : {}),
        ...(input.questionText !== undefined ? { questionText: input.questionText } : {}),
        ...(input.codeSnippet !== undefined ? { codeSnippet: input.codeSnippet } : {}),
        ...(input.codeLanguage !== undefined ? { codeLanguage: input.codeLanguage } : {}),
        ...(input.explanation !== undefined ? { explanation: input.explanation } : {}),
        ...(input.isPublished !== undefined ? { isPublished: input.isPublished } : {}),
        updatedAt: new Date(),
      })
      .where(eq(schema.questions.id, request.params.id))
      .returning();

    if (!updated) return reply.code(404).send({ error: "not_found", message: "Question not found." });

    // Full options replace-on-write keeps add/remove/reorder logic simple and atomic.
    if (input.options) {
      await db.delete(schema.questionOptions).where(eq(schema.questionOptions.questionId, updated.id));
      await db.insert(schema.questionOptions).values(
        input.options.map((o, idx) => ({
          questionId: updated.id,
          optionText: o.optionText,
          isCorrect: o.isCorrect,
          explanation: o.explanation ?? null,
          sortOrder: o.sortOrder ?? idx,
        }))
      );
    }

    const full = await db.query.questions.findFirst({
      where: eq(schema.questions.id, updated.id),
      with: { options: true },
    });

    return reply.send(full);
  });

  // DELETE /api/v1/admin/questions/:id
  app.delete<{ Params: { id: string } }>("/questions/:id", async (request, reply) => {
    await db.delete(schema.questions).where(eq(schema.questions.id, request.params.id));
    return reply.code(204).send();
  });

  // POST /api/v1/admin/questions/:id/publish
  app.post<{ Params: { id: string } }>("/questions/:id/publish", async (request, reply) => {
    const [updated] = await db
      .update(schema.questions)
      .set({ isPublished: true, updatedAt: new Date() })
      .where(eq(schema.questions.id, request.params.id))
      .returning();
    if (!updated) return reply.code(404).send({ error: "not_found", message: "Question not found." });
    return reply.send(updated);
  });

  // POST /api/v1/admin/questions/:id/unpublish
  app.post<{ Params: { id: string } }>("/questions/:id/unpublish", async (request, reply) => {
    const [updated] = await db
      .update(schema.questions)
      .set({ isPublished: false, updatedAt: new Date() })
      .where(eq(schema.questions.id, request.params.id))
      .returning();
    if (!updated) return reply.code(404).send({ error: "not_found", message: "Question not found." });
    return reply.send(updated);
  });
}
