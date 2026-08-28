import type { FastifyInstance } from "fastify";
import { count, eq } from "drizzle-orm";
import { getDb, schema } from "@dap/database";
import { createTopicSchema, slugify, updateTopicSchema } from "@dap/shared";

export default async function adminTopicsRoutes(app: FastifyInstance) {
  const db = getDb();
  app.addHook("preHandler", app.requireAdmin);

  // GET /api/v1/admin/topics?subjectId=
  app.get<{ Querystring: { subjectId?: string } }>("/topics", async (request, reply) => {
    const rows = request.query.subjectId
      ? await db.query.topics.findMany({
          where: eq(schema.topics.subjectId, request.query.subjectId),
          orderBy: (t, { asc }) => [asc(t.sortOrder)],
          with: { subject: true },
        })
      : await db.query.topics.findMany({
          orderBy: (t, { desc }) => [desc(t.createdAt)],
          with: { subject: true },
        });

    const withCounts = await Promise.all(
      rows.map(async (topic) => {
        const [questionCountRow] = await db
          .select({ value: count() })
          .from(schema.questions)
          .where(eq(schema.questions.topicId, topic.id));
        return { ...topic, questionCount: questionCountRow?.value ?? 0 };
      })
    );

    return reply.send(withCounts);
  });

  // POST /api/v1/admin/topics
  app.post("/topics", async (request, reply) => {
    const parsed = createTopicSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "validation_error", message: "Invalid topic.", details: parsed.error.flatten() });
    }
    const input = parsed.data;
    const slug = input.slug ? slugify(input.slug) : slugify(input.name);

    const [created] = await db
      .insert(schema.topics)
      .values({
        subjectId: input.subjectId,
        name: input.name,
        slug,
        description: input.description ?? null,
        sortOrder: input.sortOrder ?? 0,
      })
      .returning();

    return reply.code(201).send(created);
  });

  // PUT /api/v1/admin/topics/:id
  app.put<{ Params: { id: string } }>("/topics/:id", async (request, reply) => {
    const parsed = updateTopicSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "validation_error", message: "Invalid topic.", details: parsed.error.flatten() });
    }
    const input = parsed.data;

    const [updated] = await db
      .update(schema.topics)
      .set({
        ...(input.subjectId !== undefined ? { subjectId: input.subjectId } : {}),
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.slug !== undefined ? { slug: slugify(input.slug) } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
        updatedAt: new Date(),
      })
      .where(eq(schema.topics.id, request.params.id))
      .returning();

    if (!updated) return reply.code(404).send({ error: "not_found", message: "Topic not found." });
    return reply.send(updated);
  });

  // DELETE /api/v1/admin/topics/:id
  app.delete<{ Params: { id: string } }>("/topics/:id", async (request, reply) => {
    await db.delete(schema.topics).where(eq(schema.topics.id, request.params.id));
    return reply.code(204).send();
  });
}
