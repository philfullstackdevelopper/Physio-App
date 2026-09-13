import { Pool } from "pg";

// Direct, server-only Postgres connection to the Scalingo database — never
// goes through PostgREST, never reachable from the browser. Used exclusively
// for the handful of privileged operations in lib/db/admin.ts that call the
// `internal.*` SQL functions (supabase/migrations/0057), which PostgREST
// deliberately never exposes. Everything else (normal, RLS-scoped reads and
// writes) still goes through lib/supabase/* + PostgREST.
//
// Reads SCALINGO_DATABASE_URL specifically (not DATABASE_URL, which stays
// the Supabase connection string during the migration window so both can
// coexist without one accidentally shadowing the other).
//
// A single pooled connection, reused across requests — same pattern as any
// standard node-postgres setup, kept as one module-level singleton so we
// don't open a new pool per request.
let pool: Pool | undefined;

export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.SCALINGO_DATABASE_URL;
    if (!connectionString) {
      throw new Error("SCALINGO_DATABASE_URL must be set to use the Postgres pool.");
    }
    pool = new Pool({ connectionString });
  }
  return pool;
}
