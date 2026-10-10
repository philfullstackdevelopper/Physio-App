import { test } from "node:test";
import assert from "node:assert/strict";
import { paymentEligibleForDeletion, subscriptionLapse } from "./paymentStatus.ts";

const now = new Date("2026-09-10T12:00:00Z");
const future = "2026-10-10T12:00:00Z";
const past = "2026-08-10T12:00:00Z";

test("subscriptionLapse : pas un ancien patient tant que l'abonnement donne accès (ou n'a jamais existé)", () => {
  assert.equal(subscriptionLapse(null, null, now), null);
  assert.equal(subscriptionLapse("active", future, now), null);
  assert.equal(subscriptionLapse("trialing", future, now), null);
  // Résilié, mais la période payée court encore.
  assert.equal(subscriptionLapse("canceled", future, now), null);
});

test("subscriptionLapse : abonnement terminé → ancien patient depuis la fin de la période", () => {
  assert.deepEqual(subscriptionLapse("canceled", past, now), { reason: "ended", at: new Date(past).toISOString() });
  assert.deepEqual(subscriptionLapse("active", past, now), { reason: "ended", at: new Date(past).toISOString() });
});

test("subscriptionLapse : carte refusée → ancien patient tout de suite, date ≈ un mois avant la fin de période", () => {
  const lapse = subscriptionLapse("past_due", future, now);
  assert.equal(lapse?.reason, "payment_failed");
  assert.equal(lapse?.at, new Date("2026-09-10T12:00:00Z").toISOString());
  assert.equal(subscriptionLapse("unpaid", future, now)?.reason, "payment_failed");
});

test("paymentEligibleForDeletion : repère de 3 mois après la fin de l'accès", () => {
  assert.equal(paymentEligibleForDeletion(null, now), false);
  assert.equal(paymentEligibleForDeletion("2026-07-01T00:00:00Z", now), false);
  assert.equal(paymentEligibleForDeletion("2026-06-01T00:00:00Z", now), true);
});
