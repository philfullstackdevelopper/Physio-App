import { Pool } from "pg";

// NOT YET WIRED INTO THE LIVE APP. Part of the Scalingo migration (Phase 2) —
// reads DATABASE_URL, which only exists once the Scalingo Postgres addon is
// provisioned. Until then this module is inert; the live app still runs on
// lib/supabase/*. See supabase/migrations/0017_users_and_auth_tokens.sql for
// why auth.uid() keeps working unchanged once we do point this at a real DB.
//
// A single pooled connection, reused across requests — same pattern as any
// standard node-postgres setup, kept as one module-level singleton so we
// don't open a new pool per request.
let pool: Pool | undefined;

export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL must be set to use the Postgres pool.");
    }
    pool = new Pool({ connectionString });
  }
  return pool;
}
