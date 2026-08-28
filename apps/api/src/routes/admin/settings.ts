import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@dap/database";
import { SETTINGS_KEYS, updateSettingsSchema } from "@dap/shared";
import { getWeakAreaThresholds } from "../../services/weakArea";

export default async function adminSettingsRoutes(app: FastifyInstance) {
  const db = getDb();
  app.addHook("preHandler", app.requireAdmin);

  // GET /api/v1/admin/settings
  app.get("/settings", async (_request, reply) => {
    const thresholds = await getWeakAreaThresholds();
    return reply.send({
      weakAreaAccuracyThreshold: thresholds.accuracyThreshold,
      weakAreaMinAttempts: thresholds.minAttempts,
    });
  });

  // PUT /api/v1/admin/settings
  app.put("/settings", async (request, reply) => {
    const parsed = updateSettingsSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "validation_error", message: "Invalid settings." });
    }
    const { weakAreaAccuracyThreshold, weakAreaMinAttempts } = parsed.data;

    if (weakAreaAccuracyThreshold !== undefined) {
      await db
        .insert(schema.settings)
        .values({ key: SETTINGS_KEYS.WEAK_AREA_ACCURACY_THRESHOLD, value: String(weakAreaAccuracyThreshold) })
        .onConflictDoUpdate({
          target: schema.settings.key,
          set: { value: String(weakAreaAccuracyThreshold), updatedAt: new Date() },
        });
    }

    if (weakAreaMinAttempts !== undefined) {
      await db
        .insert(schema.settings)
        .values({ key: SETTINGS_KEYS.WEAK_AREA_MIN_ATTEMPTS, value: String(weakAreaMinAttempts) })
        .onConflictDoUpdate({
          target: schema.settings.key,
          set: { value: String(weakAreaMinAttempts), updatedAt: new Date() },
        });
    }

    const thresholds = await getWeakAreaThresholds();
    return reply.send({
      weakAreaAccuracyThreshold: thresholds.accuracyThreshold,
      weakAreaMinAttempts: thresholds.minAttempts,
    });
  });
}
