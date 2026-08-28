import { env } from "./env.js";
import cookiesPlugin from "./plugins/cookies.js";
import authPlugin from "./plugins/auth.js";
import rateLimitPlugin from "./plugins/rateLimit.js";

import subjectsRoutes from "./routes/public/subjects.js";
import questionsRoutes from "./routes/public/questions.js";
import publicSettingsRoutes from "./routes/public/settings.js";

import adminAuthRoutes from "./routes/admin/auth.js";
import adminSubjectsRoutes from "./routes/admin/subjects.js";
import adminTopicsRoutes from "./routes/admin/topics.js";
import adminQuestionsRoutes from "./routes/admin/questions.js";
import adminDashboardRoutes from "./routes/admin/dashboard.js";
import adminSettingsRoutes from "./routes/admin/settings.js";

import Fastify from "fastify";
import cors from "@fastify/cors";
export function buildApp() {
  const app = Fastify({
    logger: {
      level: env.nodeEnv === "production" ? "info" : "debug",
      transport:
        env.nodeEnv === "production"
          ? undefined
          : { target: "pino-pretty", options: { translateTime: "HH:MM:ss", ignore: "pid,hostname" } },
    },
    // Reject oversized request bodies outright instead of accepting
    // arbitrarily large payloads (e.g. giant questionText/codeSnippet blobs).
    bodyLimit: 1 * 1024 * 1024, // 1 MiB
  });

  app.register(cors, {
    origin: env.corsOrigins,
    credentials: true,
  });

  app.register(cookiesPlugin);
  app.register(rateLimitPlugin);
  app.register(authPlugin);

  app.get("/health", async () => ({ status: "ok", time: new Date().toISOString() }));

  // Public API - candidate-facing, read-only content. No anonymous session
  // or per-visitor identity is issued here: assessments, attempts, progress,
  // and bookmarks all live in the browser's localStorage now, never on the
  // server, so there's nothing here to key by a user id.
  app.register(
    async (publicApi) => {
      publicApi.register(subjectsRoutes);
      publicApi.register(questionsRoutes);
      publicApi.register(publicSettingsRoutes);
    },
    { prefix: "/api/v1" }
  );

  // Admin API - every route behind requireAdmin (enforced inside each file).
  // Scope is purely content management (subjects/topics/questions) plus
  // dashboard stats and global app settings -- there's no candidate
  // activity (assessments/attempts) stored server-side to show here.
  app.register(
    async (adminApi) => {
      adminApi.register(adminAuthRoutes);
      adminApi.register(adminSubjectsRoutes);
      adminApi.register(adminTopicsRoutes);
      adminApi.register(adminQuestionsRoutes);
      adminApi.register(adminDashboardRoutes);
      adminApi.register(adminSettingsRoutes);
    },
    { prefix: "/api/v1/admin" }
  );

  app.setErrorHandler((error, _request, reply) => {
    app.log.error(error);
    const statusCode = error.statusCode ?? 500;
    reply.code(statusCode).send({
      error: statusCode === 500 ? "internal_error" : "request_error",
      message: statusCode === 500 ? "Something went wrong." : error.message,
    });
  });

  return app;
}
