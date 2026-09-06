import type { FastifyInstance } from "fastify";
import argon2 from "argon2";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@dap/database";
import { adminLoginSchema } from "@dap/shared";
import { env } from "../../env.js";
import { ADMIN_COOKIE_NAME } from "../../plugins/auth.js";

export default async function adminAuthRoutes(app: FastifyInstance) {
  const db = getDb();

  // POST /api/v1/admin/auth/login
  app.post(
    "/auth/login",
    { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const parsed = adminLoginSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: "validation_error", message: "Email and password are required." });
      }
      const { email, password } = parsed.data;

      const admin = await db.query.adminUsers.findFirst({ where: eq(schema.adminUsers.email, email) });
      if (!admin) {
        return reply.code(401).send({ error: "invalid_credentials", message: "Incorrect email or password." });
      }

      const valid = await argon2.verify(admin.passwordHash, password);
      if (!valid) {
        return reply.code(401).send({ error: "invalid_credentials", message: "Incorrect email or password." });
      }

      const token = app.jwt.sign({ sub: admin.id, email: admin.email, role: admin.role });

      // HttpOnly cookie -- never readable by JavaScript, so it can't be
      // lifted by an XSS payload the way a localStorage token could be.
      reply.setCookie(ADMIN_COOKIE_NAME, token, {
        httpOnly: true,
        secure: env.isProduction,
        sameSite: "none",
        path: "/",
        maxAge: env.jwtExpiresInSeconds,
      });

      return reply.send({
        admin: { id: admin.id, email: admin.email, name: admin.name, role: admin.role },
      });
    }
  );

  // POST /api/v1/admin/auth/logout
  app.post("/auth/logout", async (_request, reply) => {
    reply.clearCookie(ADMIN_COOKIE_NAME, {
      httpOnly: true,
      secure: env.isProduction,
      sameSite: "none",
      path: "/",
    });

    return reply.code(204).send();
  });

  // GET /api/v1/admin/auth/me
  app.get("/auth/me", { preHandler: app.requireAdmin }, async (request, reply) => {
    return reply.send({ admin: request.user });
  });
}
