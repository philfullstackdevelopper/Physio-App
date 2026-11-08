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
