import { test } from "node:test";
import assert from "node:assert/strict";
import {
  chargeOutcomeUnknown,
  reviewFailureReason,
  reviewNeedsChargeRetry,
  reviewPayableByPatient,
  reviewStatusFromDispute,
  reviewStatusFromIntent,
  settledIntent,
} from "./reviewPayment.ts";

// Paiement des honoraires du kiné (audit Stripe du 2026-11-08).

test("état d'un paiement d'après Stripe : payé, en cours, refusé", () => {
  assert.equal(reviewStatusFromIntent({ status: "succeeded" }), "paid");
  assert.equal(reviewStatusFromIntent({ status: "processing" }), "pending");
  assert.equal(reviewStatusFromIntent({ status: "requires_payment_method", last_payment_error: { code: "card_declined", decline_code: "insufficient_funds" } }), "failed");
  assert.equal(reviewStatusFromIntent({ status: "canceled" }), "failed");
});

test("banque qui exige une confirmation (3-D Secure hors session) : validation demandée, pas refus", () => {
  assert.equal(reviewStatusFromIntent({ status: "requires_action" }), "action_required");
  assert.equal(reviewStatusFromIntent({ status: "requires_payment_method", last_payment_error: { code: "authentication_required" } }), "action_required");
  assert.equal(reviewStatusFromIntent({ status: "requires_payment_method", last_payment_error: { code: "card_declined", decline_code: "authentication_required" } }), "action_required");
});

test("raison d'un refus : le motif précis de la banque quand il existe", () => {
  assert.equal(reviewFailureReason({ code: "card_declined", decline_code: "insufficient_funds" }), "insufficient_funds");
  assert.equal(reviewFailureReason({ code: "authentication_required" }), "authentication_required");
  assert.equal(reviewFailureReason(null), null);
});

test("bouton « Payer » : seulement pour un mois refusé ou à confirmer", () => {
  assert.equal(reviewPayableByPatient("action_required"), true);
  assert.equal(reviewPayableByPatient("failed"), true);
  for (const s of ["paid", "pending", "refunded", "disputed"]) assert.equal(reviewPayableByPatient(s), false);
});

// ---- Audit du 2026-11-10 (M3) ------------------------------------------------

test("prélèvement interrompu : une coupure réseau n'est pas un refus de carte", () => {
  // Stripe a répondu (refus, 3-D Secure, requête invalide) : on sait que rien n'est encaissé.
  assert.equal(chargeOutcomeUnknown({ type: "StripeCardError", code: "card_declined", payment_intent: { id: "pi_1" } }), false);
  assert.equal(chargeOutcomeUnknown({ type: "StripeCardError", code: "card_declined" }), false);
  assert.equal(chargeOutcomeUnknown({ type: "StripeInvalidRequestError", code: "resource_missing" }), false);
  // Réseau coupé, Stripe en panne, même requête déjà en cours : on ne sait pas.
  assert.equal(chargeOutcomeUnknown({ type: "StripeConnectionError" }), true);
  assert.equal(chargeOutcomeUnknown({ type: "StripeAPIError" }), true);
  assert.equal(chargeOutcomeUnknown({ type: "StripeIdempotencyError" }), true);
  assert.equal(chargeOutcomeUnknown({}), true);
  assert.equal(chargeOutcomeUnknown(null), true);
});

test("paiement qui fait foi pour un mois : réussi d'abord, sinon en cours, jamais un refus", () => {
  const failed = { id: "pi_a", status: "requires_payment_method" };
  const processing = { id: "pi_b", status: "processing" };
  const ok = { id: "pi_c", status: "succeeded" };
  assert.equal(settledIntent([failed, processing, ok])?.id, "pi_c");
  assert.equal(settledIntent([failed, processing])?.id, "pi_b");
  assert.equal(settledIntent([failed]), null);
  assert.equal(settledIntent([]), null);
});

test("note restée « en cours » sans paiement connu : le prochain enregistrement du programme retente", () => {
  assert.equal(reviewNeedsChargeRetry({ payment_status: "pending", stripe_payment_intent_id: null }), true);
  // Paiement en cours de traitement chez Stripe : on attend, pas de nouvel essai.
  assert.equal(reviewNeedsChargeRetry({ payment_status: "pending", stripe_payment_intent_id: "pi_1" }), false);
  for (const s of ["paid", "failed", "action_required", "refunded", "disputed"]) {
    assert.equal(reviewNeedsChargeRetry({ payment_status: s, stripe_payment_intent_id: null }), false);
  }
});

test("litige : gagné = de nouveau payé ; ouvert ou perdu = contesté", () => {
  assert.equal(reviewStatusFromDispute("won"), "paid");
  assert.equal(reviewStatusFromDispute("warning_closed"), "paid");
  assert.equal(reviewStatusFromDispute("needs_response"), "disputed");
  assert.equal(reviewStatusFromDispute("lost"), "disputed");
});
