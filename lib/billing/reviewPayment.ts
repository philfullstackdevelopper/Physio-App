// Règles pures du paiement des honoraires du kiné (6 € / mois de mise à jour)
// — testées dans reviewPayment.test.ts. Aucun accès à Stripe ni à la base.

export type ReviewPaymentStatus = "pending" | "paid" | "failed" | "action_required" | "refunded" | "disputed";

/** Erreurs Stripe qui veulent dire « la banque demande au patient de confirmer lui-même ». */
const AUTH_CODES = new Set(["authentication_required"]);

/**
 * État d'un paiement d'honoraires d'après le PaymentIntent Stripe.
 * - succeeded → payé ; processing → en cours ;
 * - requires_action, ou refus avec « authentication_required » (3-D Secure
 *   exigé hors session) → validation demandée au patient ;
 * - tout le reste (carte refusée, annulé…) → refusé.
 */
export function reviewStatusFromIntent(intent: {
  status: string;
  last_payment_error?: { code?: string | null; decline_code?: string | null } | null;
}): Exclude<ReviewPaymentStatus, "refunded" | "disputed"> {
  if (intent.status === "succeeded") return "paid";
  if (intent.status === "processing") return "pending";
  if (intent.status === "requires_action" || intent.status === "requires_confirmation") return "action_required";
  const err = intent.last_payment_error;
  if ((err?.code && AUTH_CODES.has(err.code)) || (err?.decline_code && AUTH_CODES.has(err.decline_code))) return "action_required";
  return "failed";
}

/** La raison d'un refus, telle que Stripe la donne (pour comprendre les échecs). */
export function reviewFailureReason(err: { code?: string | null; decline_code?: string | null } | null | undefined): string | null {
  if (!err) return null;
  return (err.decline_code && err.code === "card_declined" ? err.decline_code : err.code) ?? null;
}

/**
 * Erreur pendant le prélèvement automatique : sait-on si la carte a été
 * débitée ? (audit du 2026-11-10, M3)
 * - Stripe a répondu avec un paiement (refus de carte, 3-D Secure…) ou une
 *   erreur de requête : on SAIT que rien n'a été encaissé → false.
 * - Coupure réseau, Stripe indisponible, trop de requêtes, même requête déjà
 *   en cours : on NE SAIT PAS → true. Le mois reste « en cours » et sera relu
 *   chez Stripe, au lieu d'être marqué « refusé » (ce qui afficherait un bouton
 *   « Payer » au patient pour un mois peut-être déjà payé).
 */
export function chargeOutcomeUnknown(err: { type?: string | null; code?: string | null; payment_intent?: unknown } | null | undefined): boolean {
  if (!err) return true;
  if (err.payment_intent) return false;
  if (err.type) return ["StripeConnectionError", "StripeAPIError", "StripeRateLimitError", "StripeIdempotencyError"].includes(err.type);
  // Erreur qui ne vient pas de Stripe (réseau, délai dépassé…) : inconnue, sauf si elle porte un code de refus.
  return !err.code;
}

/**
 * Parmi les paiements Stripe trouvés pour UN mois d'honoraires, celui qui fait
 * foi : un paiement réussi d'abord, sinon un paiement en cours de traitement,
 * sinon aucun (les refus ne comptent pas : le patient peut encore payer).
 */
export function settledIntent<T extends { status: string }>(intents: readonly T[]): T | null {
  return intents.find((i) => i.status === "succeeded") ?? intents.find((i) => i.status === "processing") ?? null;
}

/**
 * Un mois enregistré (note numérotée) mais resté « en cours » sans AUCUN
 * paiement connu : le prélèvement n'a jamais abouti (plantage ou coupure
 * réseau juste après l'enregistrement). Le prochain enregistrement du
 * programme, le même mois, doit retenter le prélèvement.
 */
export function reviewNeedsChargeRetry(review: { payment_status: string; stripe_payment_intent_id: string | null }): boolean {
  return review.payment_status === "pending" && !review.stripe_payment_intent_id;
}

/** Le patient peut-il régler lui-même ce mois (bouton « Payer ») ? */
export function reviewPayableByPatient(status: string): boolean {
  return status === "action_required" || status === "failed";
}

/**
 * État d'un litige (charge.dispute.*) → état du paiement. Gagné ou simple
 * demande d'information close = payé ; sinon (en cours, perdu…) contesté.
 */
export function reviewStatusFromDispute(disputeStatus: string): "paid" | "disputed" {
  return disputeStatus === "won" || disputeStatus === "warning_closed" ? "paid" : "disputed";
}
