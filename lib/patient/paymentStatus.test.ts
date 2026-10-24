import { test } from "node:test";
import assert from "node:assert/strict";
import { paymentEligibleForDeletion } from "./paymentStatus.ts";

const now = new Date("2026-09-10T12:00:00Z");

test("paymentEligibleForDeletion : repère de 3 mois après la fin de l'accès", () => {
  assert.equal(paymentEligibleForDeletion(null, now), false);
  assert.equal(paymentEligibleForDeletion("2026-07-01T00:00:00Z", now), false);
  assert.equal(paymentEligibleForDeletion("2026-06-01T00:00:00Z", now), true);
});
