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

// ---------------------------------------------------------------------------
// Liste d'attente du lancement (migration 0066). Lecture et retrait réservés à
// l'administrateur : l'appelant doit avoir vérifié isAdminEmail().
// ---------------------------------------------------------------------------

export type WaitlistRow = { email: string; role: "kine" | "patient"; created_at: string };

export async function listWaitlist(): Promise<WaitlistRow[]> {
  const { rows } = await getPool().query<WaitlistRow>("select * from internal.admin_list_waitlist()");
  return rows;
}

export async function deleteWaitlistEntry(email: string): Promise<void> {
  await getPool().query("select internal.admin_delete_waitlist($1)", [email]);
}

// ---------------------------------------------------------------------------
// Nouveau modèle de facturation (migration 0071, 2026-10-24) : suivi mensuel
// payé au kiné, bilans validés, facture EasyPhysio par patient actif.
// Toutes ces écritures viennent du serveur, après vérification chez Stripe
// ou de l'identité du kiné (lib/billing/followUp.ts, lib/billing/platformInvoice.ts).
// ---------------------------------------------------------------------------

export async function upsertFollowUp(params: {
  patientId: string;
  instructorId: string;
  priceCents: number;
  status: "pending_card" | "active" | "stopped";
  stripeCustomerId: string | null;
  stripePaymentMethodId: string | null;
  cardLabel: string | null;
}): Promise<void> {
  await getPool().query("select internal.upsert_follow_up($1, $2, $3, $4, $5, $6, $7)", [
    params.patientId,
    params.instructorId,
    params.priceCents,
    params.status,
    params.stripeCustomerId,
    params.stripePaymentMethodId,
    params.cardLabel,
  ]);
}

export type FollowUpForCharge = {
  instructor_id: string;
  price_cents: number;
  status: string;
  stripe_customer_id: string | null;
  stripe_payment_method_id: string | null;
  connect_account_id: string | null;
};

export async function followUpForCharge(patientId: string): Promise<FollowUpForCharge | null> {
  const { rows } = await getPool().query<FollowUpForCharge>("select * from internal.follow_up_for_charge($1)", [patientId]);
  return rows[0] ?? null;
}

/** Enregistre un bilan validé ; lève une erreur si ce mois a déjà son bilan. */
export async function recordMonthlyReview(params: {
  patientId: string;
  instructorId: string;
  period: string;
  feedback: string;
  amountCents: number;
}): Promise<{ review_id: string; fee_note_year: number; fee_note_seq: number }> {
  const { rows } = await getPool().query<{ review_id: string; fee_note_year: number; fee_note_seq: number }>(
    "select * from internal.record_monthly_review($1, $2, $3, $4, $5)",
    [params.patientId, params.instructorId, params.period, params.feedback, params.amountCents],
  );
  return rows[0];
}

export async function setReviewPayment(
  reviewId: string,
  status: "pending" | "paid" | "failed",
  paymentIntentId: string | null,
): Promise<void> {
  await getPool().query("select internal.set_review_payment($1, $2, $3)", [reviewId, status, paymentIntentId]);
}

export async function reviewForPayment(
  reviewId: string,
): Promise<{ review_id: string; payment_status: string; connect_account_id: string | null } | null> {
  const { rows } = await getPool().query<{ review_id: string; payment_status: string; connect_account_id: string | null }>(
    "select * from internal.review_for_payment($1)",
    [reviewId],
  );
  return rows[0] ?? null;
}

export async function upsertPlatformBilling(params: {
  instructorId: string;
  stripeCustomerId: string;
  stripePaymentMethodId: string | null;
  label: string | null;
}): Promise<void> {
  await getPool().query("select internal.upsert_platform_billing($1, $2, $3, $4)", [
    params.instructorId,
    params.stripeCustomerId,
    params.stripePaymentMethodId,
    params.label,
  ]);
}

export async function upsertPlatformInvoice(params: {
  instructorId: string;
  periodStart: string;
  periodEnd: string;
  patientCount: number;
  amountCents: number;
  stripeInvoiceId: string | null;
  status: "draft" | "open" | "paid" | "void" | "uncollectible";
}): Promise<void> {
  await getPool().query("select internal.upsert_platform_invoice($1, $2, $3, $4, $5, $6, $7)", [
    params.instructorId,
    params.periodStart,
    params.periodEnd,
    params.patientCount,
    params.amountCents,
    params.stripeInvoiceId,
    params.status,
  ]);
}

/** Réservé à l'administrateur (isAdminEmail vérifié par l'appelant). */
export async function platformBillingList(): Promise<
  { instructor_id: string; stripe_customer_id: string; stripe_payment_method_id: string | null }[]
> {
  const { rows } = await getPool().query("select * from internal.admin_platform_billing_list()");
  return rows;
}

/** Réservé à l'administrateur (isAdminEmail vérifié par l'appelant). */
export async function platformInvoicesList(): Promise<{ instructor_id: string; period_start: string; status: string; amount_cents: number }[]> {
  const { rows } = await getPool().query("select instructor_id, to_char(period_start, 'YYYY-MM-DD') as period_start, status, amount_cents from internal.admin_platform_invoices_list()");
  return rows;
}

// ---------------------------------------------------------------------------
// Abonnement du kiné : durées et cabinets (migration 0078). Les fonctions
// « cabinet » reçoivent l'identifiant du kiné connecté, vérifié par l'appelant
// (requireApprovedInstructor) ; les règles (accord du collègue, un seul
// cabinet, un seul niveau) sont dans la base.
// ---------------------------------------------------------------------------

export type CabinetLink = {
  member_id: string;
  member_name: string | null;
  member_email: string | null;
  payer_id: string;
  payer_name: string | null;
  status: "pending" | "active";
};

export async function cabinetView(actorId: string): Promise<CabinetLink[]> {
  const { rows } = await getPool().query<CabinetLink>("select * from internal.cabinet_view($1)", [actorId]);
  return rows;
}

export async function cabinetInvite(payerId: string, email: string): Promise<string> {
  const { rows } = await getPool().query<{ r: string }>("select internal.cabinet_invite($1, $2) as r", [payerId, email]);
  return rows[0]?.r ?? "ERROR";
}

export async function cabinetRespond(memberId: string, accept: boolean): Promise<string> {
  const { rows } = await getPool().query<{ r: string }>("select internal.cabinet_respond($1, $2) as r", [memberId, accept]);
  return rows[0]?.r ?? "ERROR";
}

export async function cabinetRemove(actorId: string, memberId: string): Promise<void> {
  await getPool().query("select internal.cabinet_remove($1, $2)", [actorId, memberId]);
}

/** Réservé à l'administrateur / à la facturation. */
export async function cabinetList(): Promise<{ member_instructor_id: string; payer_instructor_id: string; status: string }[]> {
  const { rows } = await getPool().query("select * from internal.admin_cabinet_list()");
  return rows;
}

/** Réservé à l'administrateur / à la facturation. */
export async function platformPlans(): Promise<{ instructor_id: string; plan_months: number }[]> {
  const { rows } = await getPool().query("select * from internal.admin_platform_plans()");
  return rows;
}

/** Réservé à l'administrateur / à la facturation : factures avec leur date de fin. */
export async function platformInvoicesWithEnd(): Promise<
  { instructor_id: string; period_start: string; period_end: string; status: string; amount_cents: number }[]
> {
  const { rows } = await getPool().query(
    "select instructor_id, to_char(period_start, 'YYYY-MM-DD') as period_start, to_char(period_end, 'YYYY-MM-DD') as period_end, status, amount_cents from internal.admin_platform_invoices_list_v2()",
  );
  return rows;
}

// ---------------------------------------------------------------------------
// Formules patient (migration 0080) : enregistrement d'un abonnement Stripe,
// appelé par le webhook, le retour de paiement et la relecture chez Stripe.
// ---------------------------------------------------------------------------

export async function upsertSubscription(params: {
  userId: string;
  plan: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string;
  status: string;
  currentPeriodEnd: string | null;
  /** Compte Stripe du kiné (ancien modèle) ; null = compte d'EasyPhysio (abonnement d'accès). */
  stripeAccountId: string | null;
  cancelAtPeriodEnd: boolean;
}): Promise<void> {
  await getPool().query("select internal.admin_upsert_subscription($1, $2, $3, $4, $5, $6, $7, $8)", [
    params.userId,
    params.plan,
    params.stripeCustomerId,
    params.stripeSubscriptionId,
    params.status,
    params.currentPeriodEnd,
    params.stripeAccountId,
    params.cancelAtPeriodEnd,
  ]);
}

/** Abonnements des patients d'un kiné (suspension : on les arrête). */
export async function instructorSubscriptions(
  instructorId: string,
): Promise<{ patient_id: string; stripe_subscription_id: string; status: string; connect_account_id: string | null }[]> {
  const { rows } = await getPool().query("select * from internal.admin_instructor_subscriptions($1)", [instructorId]);
  return rows;
}

// Exercices créés par les kinés (migration 0081) — /admin seulement.
// ---------------------------------------------------------------------------

export interface KineExerciseRow {
  id: string;
  name: string;
  instructions: string | null;
  equipment: string[] | null;
  media_url: string | null;
  created_at: string;
  publication_status: string;
  submitted_at: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  for_one_patient: boolean;
  filming_consent_at: string | null;
  admin_seen_at: string | null;
  source_name: string | null;
  body_parts: string | null;
  author_id: string;
  author_name: string | null;
  author_cabinet: string | null;
  author_email: string | null;
}

export async function listKineExercises(): Promise<KineExerciseRow[]> {
  const { rows } = await getPool().query("select * from internal.admin_list_kine_exercises()");
  return rows;
}

/** Publier / demander une modification / garder privé. Renvoie le nombre
 *  d'exercices publiés de l'auteur et sa date de remise éventuelle. */
export async function reviewKineExercise(
  exerciseId: string,
  decision: "publish" | "changes" | "decline",
  note: string,
  rewardThreshold: number,
  rewardMonths: number,
): Promise<{ published_count: number; waived_until: string | null }> {
  const { rows } = await getPool().query(
    "select published_count, to_char(waived_until, 'YYYY-MM-DD') as waived_until from internal.admin_review_exercise($1, $2, $3, $4, $5)",
    [exerciseId, decision, note, rewardThreshold, rewardMonths],
  );
  return rows[0] ?? { published_count: 0, waived_until: null };
}

/** « Dessin fait » (ou retiré de la liste « À dessiner »). */
export async function markKineExerciseSeen(exerciseId: string, seen: boolean): Promise<void> {
  await getPool().query("select internal.admin_mark_exercise_seen($1, $2)", [exerciseId, seen]);
}


// ---------------------------------------------------------------------------
// Rejoindre son kiné par QR code ou lien (migration 0082).
// ---------------------------------------------------------------------------

/** Nom, e-mail et statut d'UN kiné, pour la page /rejoindre. */
export async function joinLinkKine(instructorId: string): Promise<{ full_name: string | null; email: string | null; status: string } | null> {
  const { rows } = await getPool().query("select * from internal.join_link_kine($1)", [instructorId]);
  return rows[0] ?? null;
}

/** Crée la fiche du patient chez ce kiné : 'OK', 'KINE_UNAVAILABLE', 'IS_KINE',
 *  'EMAIL_TAKEN', et depuis 0087 'PENDING_SAME_KINE' (déjà patient de ce kiné,
 *  CGU jamais acceptées : rien n'est créé) ou 'RATE_LIMITED' (20 par 24 h). */
export async function joinPatientByLink(params: { instructorId: string; appId: string; email: string; fullName: string }): Promise<string> {
  const { rows } = await getPool().query<{ r: string }>("select internal.join_patient_by_link($1, $2, $3, $4) as r", [
    params.instructorId,
    params.appId,
    params.email,
    params.fullName,
  ]);
  return rows[0]?.r ?? "ERROR";
}

/** Nom enregistré d'un patient de CE kiné qui n'a pas encore accepté les CGU, sinon null (0087). */
export async function joinLinkPendingPatientName(instructorId: string, email: string): Promise<string | null> {
  const { rows } = await getPool().query<{ n: string | null }>("select internal.join_link_pending_patient_name($1, $2) as n", [
    instructorId,
    email,
  ]);
  return rows[0]?.n ?? null;
}

/** Efface la fiche tout juste créée par le QR code si l'invitation n'a pas pu partir (0087). */
export async function undoJoinByLink(instructorId: string, appId: string): Promise<void> {
  await getPool().query("select internal.join_link_undo($1, $2)", [instructorId, appId]);
}

// ---------------------------------------------------------------------------
// Demandes de suppression de compte kiné (migration 0083).
// ---------------------------------------------------------------------------

export async function requestAccountDeletion(instructorId: string, reason: string): Promise<void> {
  await getPool().query("select internal.request_account_deletion($1, $2)", [instructorId, reason]);
}

export async function cancelAccountDeletion(instructorId: string): Promise<void> {
  await getPool().query("select internal.cancel_account_deletion($1)", [instructorId]);
}

export type AccountDeletionRow = {
  instructor_id: string;
  requested_at: string;
  reason: string | null;
  full_name: string | null;
  email: string | null;
  patient_count: number;
};

export async function listAccountDeletions(): Promise<AccountDeletionRow[]> {
  const { rows } = await getPool().query<AccountDeletionRow>("select * from internal.admin_list_account_deletions()");
  return rows;
}
