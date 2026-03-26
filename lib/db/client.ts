import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Lazy initialization to avoid build-time errors
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

function getDb() {
  if (_db) return _db;

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  // Serverless-friendly config:
  // - prepare: false — required for PgBouncer/Supavisor transaction mode
  // - max: 1 — each serverless invocation uses a single connection
  const client = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });
  _db = drizzle(client, { schema });
  return _db;
}

// Export a proxy that lazily initializes the db on first access
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_, prop) {
    return getDb()[prop as keyof typeof _db];
  },
});
