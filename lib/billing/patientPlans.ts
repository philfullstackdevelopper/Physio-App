// =============================================================================
// Formules patient (Philippe, 2026-11-02) — source unique des prix et du
// partage. Le kiné utilise l'appli gratuitement ; le patient choisit une
// formule, renouvelée automatiquement, résiliable à tout moment.
//
// Le paiement est fait sur le compte Stripe du kiné (« direct charge ») :
// Stripe y retire ses frais, puis la part d'EasyPhysio (application fee).
// La part d'EasyPhysio est calculée pour que le kiné touche exactement
// 6,99 € / 13,99 € / 20,99 € avec une carte européenne standard
// (1,5 % + 0,25 €) — EasyPhysio garde 3 € / 6 € / 9 € moins ces frais.
//
// Rien de ce fichier ne lit la base ni Stripe : affichage, prélèvement et
// contrôles des webhooks lisent les mêmes chiffres.
// =============================================================================

export type PatientPlanKey = "plan_1m" | "plan_3m" | "plan_6m";

export interface PatientPlan {
  key: PatientPlanKey;
  months: 1 | 3 | 6;
  label: string;
  /** Payé par le patient, TTC, centimes, pour toute la période. */
  priceCents: number;
  /** Ce que touche le kiné, centimes, après frais Stripe et part EasyPhysio. */
  kineCents: number;
}

export const PATIENT_PLANS: readonly PatientPlan[] = [
  { key: "plan_1m", months: 1, label: "1 mois", priceCents: 999, kineCents: 699 },
  { key: "plan_3m", months: 3, label: "3 mois", priceCents: 1999, kineCents: 1399 },
  { key: "plan_6m", months: 6, label: "6 mois", priceCents: 2999, kineCents: 2099 },
];

export function isPatientPlanKey(v: unknown): v is PatientPlanKey {
  return typeof v === "string" && PATIENT_PLANS.some((p) => p.key === v);
}

export function patientPlan(key: PatientPlanKey): PatientPlan {
  return PATIENT_PLANS.find((p) => p.key === key)!;
}

/** Frais Stripe estimés d'un paiement par carte européenne (1,5 % + 0,25 €). */
export function stripeFeeCents(amountCents: number): number {
  return Math.round(amountCents * 0.015 + 25);
}

/** Part d'EasyPhysio sur un paiement de cette formule, centimes. */
export function platformShareCents(plan: PatientPlan): number {
  return plan.priceCents - plan.kineCents - stripeFeeCents(plan.priceCents);
}

/** La même part en pourcentage à 2 décimales (format Stripe application_fee_percent). */
export function applicationFeePercent(plan: PatientPlan): number {
  return Math.round((platformShareCents(plan) / plan.priceCents) * 10000) / 100;
}

/** Prix par mois, centimes (affichage « soit X € / mois »). */
export function perMonthCents(plan: PatientPlan): number {
  return Math.round(plan.priceCents / plan.months);
}

export function eurosFR(cents: number): string {
  return (cents / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ---------------------------------------------------------------------------
// Accès à l'appli
// ---------------------------------------------------------------------------

export type SubscriptionRow = {
  plan: string;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
};

/**
 * L'abonnement donne-t-il accès à l'appli maintenant ?
 * - actif (ou en essai) : oui, même résilié, jusqu'à la fin de la période payée ;
 * - paiement refusé (past_due, unpaid, incomplete) : non, tout de suite
 *   (règle de Philippe : une carte refusée verrouille immédiatement) ;
 * - terminé (canceled…) : non.
 */
export function subscriptionGivesAccess(sub: SubscriptionRow | null, now: Date = new Date()): boolean {
  if (!sub || !isPatientPlanKey(sub.plan)) return false;
  if (sub.status !== "active" && sub.status !== "trialing") return false;
  if (sub.cancel_at_period_end && sub.current_period_end && new Date(sub.current_period_end) <= now) return false;
  return true;
}

/** Période payée dépassée sans nouvelle de Stripe : il faut relire l'abonnement chez Stripe. */
export function subscriptionNeedsRefresh(sub: SubscriptionRow | null, now: Date = new Date()): boolean {
  if (!sub || !isPatientPlanKey(sub.plan)) return false;
  if (!sub.current_period_end) return false;
  return (sub.status === "active" || sub.status === "trialing") && new Date(sub.current_period_end) <= now;
}

/**
 * Le patient doit-il choisir une formule avant d'entrer dans l'appli ?
 * Toujours, sauf si son kiné n'a pas encore activé Stripe (rien ne peut être
 * encaissé), s'il est suspendu, si l'accès est offert au patient par
 * l'administrateur (comptes de test), ou si l'abonnement en cours donne accès.
 * Plus d'accès gratuit offert par le kiné (Philippe, 2026-11-04 : « Free
 * acces is no longer a thing ») : instructors.review_price_cents n'est plus lu.
 */
export function patientMustSubscribe(p: {
  kineCanCharge: boolean;
  kineSuspended: boolean;
  freeAccessUntil: string | null;
  subscription: SubscriptionRow | null;
  now?: Date;
}): boolean {
  const now = p.now ?? new Date();
  if (!p.kineCanCharge || p.kineSuspended) return false;
  if (p.freeAccessUntil && new Date(p.freeAccessUntil) > now) return false;
  return !subscriptionGivesAccess(p.subscription, now);
}
