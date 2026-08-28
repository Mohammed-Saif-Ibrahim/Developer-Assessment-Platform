import { buildApp } from "./app";
import { env } from "./env";

async function main() {
  const app = buildApp();
  try {
    await app.listen({ port: env.port, host: "0.0.0.0" });
    console.log(`API listening on http://localhost:${env.port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
