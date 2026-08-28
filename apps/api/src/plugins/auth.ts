import fp from "fastify-plugin";
import fastifyJwt from "@fastify/jwt";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { env } from "../env";

export const ADMIN_COOKIE_NAME = "dap_admin_session";

export interface AdminJwtPayload {
  sub: string;
  email: string;
  role: string;
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: AdminJwtPayload;
    user: AdminJwtPayload;
  }
}

declare module "fastify" {
  interface FastifyInstance {
    requireAdmin: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

/**
 * Registers @fastify/jwt and a `requireAdmin` decorator used to protect
 * every /api/v1/admin/* route. Authorization is enforced here, on the
 * server -- never assumed from the frontend hiding a route.
 *
 * The token itself now lives in an HttpOnly, Secure cookie rather than in
 * localStorage/an Authorization header, so it can't be read or exfiltrated
 * by JavaScript (e.g. via an XSS payload) running in the admin app.
 */
export default fp(async function authPlugin(app: FastifyInstance) {
  app.register(fastifyJwt, {
    secret: env.adminSecret,
    sign: { expiresIn: env.jwtExpiresIn },
    cookie: {
      cookieName: ADMIN_COOKIE_NAME,
      signed: false,
    },
  });

  app.decorate("requireAdmin", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      reply.code(401).send({ error: "unauthorized", message: "A valid admin session is required." });
    }
  });
});
