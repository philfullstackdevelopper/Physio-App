import { test } from "node:test";
import assert from "node:assert/strict";
import { hasActiveTier, isSubscriptionActive } from "./access.ts";

const now = new Date("2026-09-10T12:00:00Z");
const future = "2026-10-10T12:00:00Z";
const past = "2026-08-10T12:00:00Z";

test("isSubscriptionActive : active/trialing oui, canceled non, période échue non", () => {
  assert.equal(isSubscriptionActive("active", future, now), true);
  assert.equal(isSubscriptionActive("trialing", future, now), true);
  assert.equal(isSubscriptionActive("canceled", future, now), false);
  assert.equal(isSubscriptionActive("active", past, now), false);
  assert.equal(isSubscriptionActive(null, null, now), false);
});

test("hasActiveTier : offre en essai Stripe (trialing) → accès", () => {
  assert.equal(hasActiveTier({ subPlan: "standard", subStatus: "trialing", subCurrentPeriodEnd: future }, now), true);
});

test("hasActiveTier : offre payée (active) → accès, pour chacune des trois", () => {
  for (const plan of ["essentiel", "standard", "premium"]) {
    assert.equal(hasActiveTier({ subPlan: plan, subStatus: "active", subCurrentPeriodEnd: future }, now), true, plan);
  }
});

test("hasActiveTier : offre annulée ou période échue → pas d'accès", () => {
  assert.equal(hasActiveTier({ subPlan: "premium", subStatus: "canceled", subCurrentPeriodEnd: future }, now), false);
  assert.equal(hasActiveTier({ subPlan: "premium", subStatus: "active", subCurrentPeriodEnd: past }, now), false);
});

test("hasActiveTier : grandfathering — ancien patient_monthly actif → accès", () => {
  assert.equal(hasActiveTier({ subPlan: "patient_monthly", subStatus: "active", subCurrentPeriodEnd: future }, now), true);
});

test("hasActiveTier : grandfathering — ancien essai maison encore en cours → accès", () => {
  assert.equal(hasActiveTier({ trialEndsAt: future }, now), true);
  assert.equal(hasActiveTier({ trialEndsAt: past }, now), false);
});

test("hasActiveTier : un plan kiné actif ne donne pas l'accès patient", () => {
  assert.equal(hasActiveTier({ subPlan: "kine_platform_fee", subStatus: "active", subCurrentPeriodEnd: future }, now), false);
});

test("hasActiveTier : rien du tout → pas d'accès", () => {
  assert.equal(hasActiveTier({}, now), false);
  assert.equal(hasActiveTier({ subPlan: null, subStatus: "inactive", subCurrentPeriodEnd: null, trialEndsAt: null }, now), false);
});
