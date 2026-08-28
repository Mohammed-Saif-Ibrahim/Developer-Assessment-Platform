import type { FastifyInstance } from "fastify";
import { and, count, eq } from "drizzle-orm";
import { getDb, schema } from "@dap/database";
import { createSubjectSchema, slugify, updateSubjectSchema } from "@dap/shared";

export default async function adminSubjectsRoutes(app: FastifyInstance) {
  const db = getDb();
  app.addHook("preHandler", app.requireAdmin);

  // GET /api/v1/admin/subjects
  app.get("/subjects", async (_request, reply) => {
    const rows = await db.query.subjects.findMany({ orderBy: (s, { desc }) => [desc(s.createdAt)] });

    const withStats = await Promise.all(
      rows.map(async (subject) => {
        const [topicCountRow] = await db
          .select({ value: count() })
          .from(schema.topics)
          .where(eq(schema.topics.subjectId, subject.id));
        const [questionCountRow] = await db
          .select({ value: count() })
          .from(schema.questions)
          .where(eq(schema.questions.subjectId, subject.id));
        const [publishedCountRow] = await db
          .select({ value: count() })
          .from(schema.questions)
          .where(and(eq(schema.questions.subjectId, subject.id), eq(schema.questions.isPublished, true)));

        return {
          ...subject,
          topicCount: topicCountRow?.value ?? 0,
          questionCount: questionCountRow?.value ?? 0,
          publishedQuestionCount: publishedCountRow?.value ?? 0,
        };
      })
    );

    return reply.send(withStats);
  });

  // POST /api/v1/admin/subjects
  app.post("/subjects", async (request, reply) => {
    const parsed = createSubjectSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "validation_error", message: "Invalid subject.", details: parsed.error.flatten() });
    }
    const input = parsed.data;
    const slug = input.slug ? slugify(input.slug) : slugify(input.name);

    const [created] = await db
      .insert(schema.subjects)
      .values({
        name: input.name,
        slug,
        description: input.description ?? null,
        icon: input.icon ?? null,
        isPublished: input.isPublished ?? false,
      })
      .returning();

    return reply.code(201).send(created);
  });

  // PUT /api/v1/admin/subjects/:id
  app.put<{ Params: { id: string } }>("/subjects/:id", async (request, reply) => {
    const parsed = updateSubjectSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "validation_error", message: "Invalid subject.", details: parsed.error.flatten() });
    }
    const input = parsed.data;

    const [updated] = await db
      .update(schema.subjects)
      .set({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.slug !== undefined ? { slug: slugify(input.slug) } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.icon !== undefined ? { icon: input.icon } : {}),
        ...(input.isPublished !== undefined ? { isPublished: input.isPublished } : {}),
        updatedAt: new Date(),
      })
      .where(eq(schema.subjects.id, request.params.id))
      .returning();

    if (!updated) return reply.code(404).send({ error: "not_found", message: "Subject not found." });
    return reply.send(updated);
  });

  // DELETE /api/v1/admin/subjects/:id
  app.delete<{ Params: { id: string } }>("/subjects/:id", async (request, reply) => {
    await db.delete(schema.subjects).where(eq(schema.subjects.id, request.params.id));
    return reply.code(204).send();
  });

  // POST /api/v1/admin/subjects/:id/publish
  app.post<{ Params: { id: string } }>("/subjects/:id/publish", async (request, reply) => {
    const [updated] = await db
      .update(schema.subjects)
      .set({ isPublished: true, updatedAt: new Date() })
      .where(eq(schema.subjects.id, request.params.id))
      .returning();
    if (!updated) return reply.code(404).send({ error: "not_found", message: "Subject not found." });
    return reply.send(updated);
  });

  // POST /api/v1/admin/subjects/:id/unpublish
  app.post<{ Params: { id: string } }>("/subjects/:id/unpublish", async (request, reply) => {
    const [updated] = await db
      .update(schema.subjects)
      .set({ isPublished: false, updatedAt: new Date() })
      .where(eq(schema.subjects.id, request.params.id))
      .returning();
    if (!updated) return reply.code(404).send({ error: "not_found", message: "Subject not found." });
    return reply.send(updated);
  });
}
