import { test } from "node:test";
import assert from "node:assert/strict";
import { reviewFailureReason, reviewPayableByPatient, reviewStatusFromDispute, reviewStatusFromIntent } from "./reviewPayment.ts";

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

test("litige : gagné = de nouveau payé ; ouvert ou perdu = contesté", () => {
  assert.equal(reviewStatusFromDispute("won"), "paid");
  assert.equal(reviewStatusFromDispute("warning_closed"), "paid");
  assert.equal(reviewStatusFromDispute("needs_response"), "disputed");
  assert.equal(reviewStatusFromDispute("lost"), "disputed");
});
