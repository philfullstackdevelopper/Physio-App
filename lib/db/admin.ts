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

// Suppression d'un compte (et, en cascade, de toutes ses données). Depuis la
// migration 0061, app_users n'est plus modifiable via PostgREST : ces deux
// fonctions passent par internal.delete_app_user_by_* (laissez-passer
// `app_users`). Pas besoin de session Clerk — utile quand l'identité Clerk
// vient d'être supprimée.
export async function deleteAppUserById(appId: string): Promise<void> {
  await getPool().query("select internal.delete_app_user_by_id($1)", [appId]);
}

export async function deleteAppUserByEmail(email: string): Promise<void> {
  await getPool().query("select internal.delete_app_user_by_email($1)", [email.trim().toLowerCase()]);
}

// Vidéo d'un exercice de la PLATEFORME (created_by null) — réservé à
// l'administrateur : l'appelant doit avoir vérifié isAdminEmail() côté serveur
// avant (app/dashboard/exercises/actions.ts). Les kinés, eux, ne peuvent plus
// changer que la vidéo de leurs propres exercices (set_exercise_media, 0061).
export async function adminSetExerciseMedia(exerciseId: string, url: string | null, startSeconds: number): Promise<void> {
  await getPool().query("select internal.admin_set_exercise_media($1, $2, $3)", [exerciseId, url, startSeconds]);
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
