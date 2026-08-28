import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

let _client: ReturnType<typeof postgres> | null = null;
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

/**
 * Lazily creates a single shared postgres connection + drizzle instance.
 * The frontends never import this module directly -- only apps/api does.
 */
export function getDb() {
  if (!_db) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is not set");
    }
    _client = postgres(connectionString, { max: 10 });
    _db = drizzle(_client, { schema });
  }
  return _db;
}

export type Database = ReturnType<typeof getDb>;

export * as schema from "./schema";
