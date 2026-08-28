import fp from "fastify-plugin";
import fastifyCookie from "@fastify/cookie";
import type { FastifyInstance } from "fastify";

/**
 * Registers @fastify/cookie once, globally. The admin-auth plugin
 * (JWT-in-cookie) depends on this being registered first. There's no
 * anonymous-session cookie anymore -- the public API is fully
 * unauthenticated -- so there's nothing here that needs a signing secret.
 */
export default fp(async function cookiesPlugin(app: FastifyInstance) {
  app.register(fastifyCookie);
});
