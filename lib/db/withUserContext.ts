import type { PoolClient } from "pg";
import { getPool } from "./pool";

// NOT YET WIRED INTO THE LIVE APP (Scalingo migration, Phase 2).
//
// Every query needing RLS runs through here. Two things happen per call,
// both scoped to "local" (i.e. this transaction only), so nothing leaks into
// the next request that reuses this pooled connection once it commits:
//  1. "set local role" switches which RLS policies apply — same idea as
//     Supabase's own PostgREST layer, which does this internally based on
//     the caller's JWT. We do it explicitly instead, per migration 0017's
//     three roles: "authenticated" (normal logged-in queries — the default),
//     "anon" (signup, before anyone is logged in), "auth_service" (the
//     login/token-verification exception, used only by lib/auth/*).
//  2. app.current_user_id is what auth.uid() reads (see 0017) — set even
//     for "anon"/"auth_service" calls, where it's just null, since auth.uid()
//     is a no-op for policies that don't use it (e.g. auth_service_read_users
//     uses "using (true)", not auth.uid()).
export type DbRole = "authenticated" | "anon" | "auth_service";

export async function withUserContext<T>(
  userId: string | null,
  fn: (client: PoolClient) => Promise<T>,
  role: DbRole = "authenticated",
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("begin");
    await client.query(`set local role ${role}`);
    await client.query("select set_config('app.current_user_id', $1, true)", [userId ?? ""]);
    const result = await fn(client);
    await client.query("commit");
    return result;
  } catch (e) {
    await client.query("rollback");
    throw e;
  } finally {
    client.release();
  }
}
