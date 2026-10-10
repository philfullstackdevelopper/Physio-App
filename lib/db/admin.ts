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

// « RPPS vérifié » : seul le serveur peut le poser, après verifyRpps()
// (migration 0063 — le kiné ne peut plus l'écrire lui-même).
// Indicatif seulement (l'approbation, elle, passe par setInstructorStatus) :
// un échec — par exemple la migration 0063 pas encore appliquée — est
// journalisé sans bloquer l'inscription.
export async function setInstructorRppsVerified(instructorId: string, verifiedAt: string | null): Promise<void> {
  try {
    await getPool().query("select internal.admin_set_rpps_verified($1, $2)", [instructorId, verifiedAt]);
  } catch (e) {
    console.error("setInstructorRppsVerified : badge RPPS non enregistré", e);
  }
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

// ---------------------------------------------------------------------------
// Vue d'ensemble /admin et suspension d'un kiné (migration 0062).
// ---------------------------------------------------------------------------

export type AdminInstructorRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  status: string;
  created_at: string;
  cabinet_name: string | null;
  rpps_number: string | null;
  rpps_verified_at: string | null;
  patient_count: number;
  paying_count: number;
  connect_status: string | null;
};

export async function listAllInstructors(): Promise<AdminInstructorRow[]> {
  const { rows } = await getPool().query<AdminInstructorRow>("select * from internal.admin_list_instructors()");
  return rows;
}

export type InstructorSubscriptionRow = {
  patient_id: string;
  stripe_subscription_id: string;
  status: string | null;
  connect_account_id: string | null;
};

export async function listInstructorSubscriptions(instructorId: string): Promise<InstructorSubscriptionRow[]> {
  const { rows } = await getPool().query<InstructorSubscriptionRow>(
    "select * from internal.admin_instructor_subscriptions($1)",
    [instructorId],
  );
  return rows;
}

/** RPPS déjà porté par un autre compte kiné (non refusé) ? */
export async function rppsInUse(rppsNumber: string, excludeInstructorId: string | null): Promise<boolean> {
  const { rows } = await getPool().query<{ used: boolean }>("select internal.rpps_in_use($1, $2) as used", [
    rppsNumber,
    excludeInstructorId,
  ]);
  return !!rows[0]?.used;
}

// ---------------------------------------------------------------------------
// Comptes de test créés depuis /admin (migration 0064). L'appelant doit avoir
// vérifié isAdminEmail() côté serveur (app/admin/testAccountActions.ts).
// ---------------------------------------------------------------------------

export type TestAccountRow = {
  app_id: string;
  kind: "kine" | "patient";
  email: string;
  full_name: string;
  instructor_id: string | null;
  instructor_name: string | null;
  created_at: string;
};

export async function listTestAccounts(): Promise<TestAccountRow[]> {
  const { rows } = await getPool().query<TestAccountRow>("select * from internal.admin_list_test_accounts()");
  return rows;
}

export async function createTestInstructor(email: string, fullName: string): Promise<string> {
  const { rows } = await getPool().query<{ id: string }>(
    "select internal.admin_create_test_instructor($1, $2) as id",
    [email, fullName],
  );
  return String(rows[0].id);
}

export async function createTestPatient(params: {
  email: string;
  fullName: string;
  instructorId: string;
  freeAccess: boolean;
}): Promise<string> {
  const { rows } = await getPool().query<{ id: string }>(
    "select internal.admin_create_test_patient($1, $2, $3, $4) as id",
    [params.email, params.fullName, params.instructorId, params.freeAccess],
  );
  return String(rows[0].id);
}

export type TestAccountMember = {
  app_id: string;
  email: string;
  clerk_id: string | null;
  has_subscription: boolean;
  other_patients: number;
};

/** Le compte de test et, pour un kiné, ses patients de test. Lève une erreur si ce n'est pas un compte de test. */
export async function testAccountMembers(appId: string): Promise<TestAccountMember[]> {
  const { rows } = await getPool().query<TestAccountMember>(
    "select * from internal.admin_test_account_members($1)",
    [appId],
  );
  return rows;
}

export async function deleteTestAccount(appId: string): Promise<void> {
  await getPool().query("select internal.admin_delete_test_account($1)", [appId]);
}
