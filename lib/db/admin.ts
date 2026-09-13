import { getPool } from "./pool";

// Server-only wrappers around the `internal.*` SQL functions (see
// supabase/migrations/0057_scalingo_admin_bypass_functions.sql). These
// replace the old @supabase/supabase-js admin client (SUPABASE_SERVICE_ROLE_KEY)
// on the Scalingo side: PostgREST has no equivalent bypass role, so these
// three privileged writes go through a direct, never-internet-facing
// Postgres connection instead, calling functions that live in a schema
// PostgREST never exposes.
//
// Never call these from anywhere reachable by end-user input without the
// same authorization checks the old admin-client call sites already had
// upstream (e.g. verifyRpps() before approving an instructor, Stripe's own
// webhook signature before syncing a subscription).

export async function setInstructorStatus(instructorId: string, status: string): Promise<void> {
  await getPool().query("select internal.admin_set_instructor_status($1, $2)", [instructorId, status]);
}

export async function upsertSubscription(params: {
  userId: string;
  plan: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  status: string;
  currentPeriodEnd: string | null;
}): Promise<void> {
  await getPool().query(
    "select internal.admin_upsert_subscription($1, $2, $3, $4, $5, $6)",
    [
      params.userId,
      params.plan,
      params.stripeCustomerId,
      params.stripeSubscriptionId,
      params.status,
      params.currentPeriodEnd,
    ],
  );
}

// Not privileged in the RLS sense (app_users already has an open policy) —
// used here specifically because it needs no Clerk-authenticated session at
// all, unlike the normal supabase-js client. Account deletion calls this
// AFTER already deleting the Clerk identity itself, at which point a fresh
// Clerk token may no longer be obtainable.
export async function deleteAppUserById(appId: string): Promise<void> {
  await getPool().query("delete from public.app_users where app_id = $1", [appId]);
}

export async function deleteAppUserByEmail(email: string): Promise<void> {
  await getPool().query("delete from public.app_users where email = $1", [email]);
}

export async function upsertConnectAccount(params: {
  instructorId: string;
  stripeConnectAccountId: string;
  status: string;
}): Promise<void> {
  await getPool().query(
    "select internal.admin_upsert_connect_account($1, $2, $3)",
    [params.instructorId, params.stripeConnectAccountId, params.status],
  );
}
