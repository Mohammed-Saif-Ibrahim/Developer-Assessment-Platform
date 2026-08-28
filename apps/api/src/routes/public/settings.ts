import type { FastifyInstance } from "fastify";
import { getWeakAreaThresholds } from "../../services/weakArea";

// Read-only, unauthenticated. These are global app config (admin-tunable
// under /admin/settings), not per-user data, so there's no session or
// cookie involved -- the client just needs the current thresholds to
// compute "weak areas" from its own local attempt history.
export default async function publicSettingsRoutes(app: FastifyInstance) {
  app.get("/settings/weak-area", async (_request, reply) => {
    const thresholds = await getWeakAreaThresholds();
    return reply.send({
      accuracyThreshold: thresholds.accuracyThreshold,
      minAttempts: thresholds.minAttempts,
    });
  });
}
