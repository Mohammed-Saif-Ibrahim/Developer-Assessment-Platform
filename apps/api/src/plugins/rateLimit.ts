import fp from "fastify-plugin";
import fastifyRateLimit from "@fastify/rate-limit";
import type { FastifyInstance } from "fastify";

/**
 * Global, generous default so every route has *some* ceiling even if a
 * specific route doesn't set its own. Individual routes (e.g. admin login,
 * the write endpoints) override this with a stricter `config.rateLimit`
 * on the route itself -- see routes/admin/auth.ts and routes/public/*.
 */
export default fp(async function rateLimitPlugin(app: FastifyInstance) {
  await app.register(fastifyRateLimit, {
    max: 300,
    timeWindow: "1 minute",
    allowList: [],
    errorResponseBuilder: () => ({
      error: "rate_limited",
      message: "Too many requests. Please slow down and try again shortly.",
    }),
  });
});
