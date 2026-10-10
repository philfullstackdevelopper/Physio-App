import { test } from "node:test";
import assert from "node:assert/strict";
import { hasActiveTier, isSubscriptionActive, lockReason } from "./access.ts";

const now = new Date("2026-09-10T12:00:00Z");
const future = "2026-10-10T12:00:00Z";
const past = "2026-08-10T12:00:00Z";

test("isSubscriptionActive : active/trialing oui, période échue non", () => {
  assert.equal(isSubscriptionActive("active", future, now), true);
  assert.equal(isSubscriptionActive("trialing", future, now), true);
  assert.equal(isSubscriptionActive("active", past, now), false);
  assert.equal(isSubscriptionActive(null, null, now), false);
});

test("isSubscriptionActive : résilié → accès jusqu'à la fin de la période payée, puis plus rien", () => {
  assert.equal(isSubscriptionActive("canceled", future, now), true);
  assert.equal(isSubscriptionActive("canceled", past, now), false);
  assert.equal(isSubscriptionActive("canceled", null, now), false);
});

test("isSubscriptionActive : prélèvement refusé (past_due / unpaid) → plus d'accès tout de suite", () => {
  assert.equal(isSubscriptionActive("past_due", future, now), false);
  assert.equal(isSubscriptionActive("past_due", past, now), false);
  assert.equal(isSubscriptionActive("past_due", null, now), false);
  assert.equal(isSubscriptionActive("unpaid", future, now), false);
});

test("lockReason : pourquoi l'écran cadenas s'affiche", () => {
  // Jamais abonné, ou accès en cours : pas de cadenas.
  assert.equal(lockReason(null, null, now), null);
  assert.equal(lockReason("active", future, now), null);
  assert.equal(lockReason("trialing", future, now), null);
  assert.equal(lockReason("canceled", future, now), null);
  // Carte refusée.
  assert.equal(lockReason("past_due", future, now), "payment_failed");
  assert.equal(lockReason("unpaid", future, now), "payment_failed");
  // Abonnement terminé.
  assert.equal(lockReason("canceled", past, now), "ended");
  assert.equal(lockReason("active", past, now), "ended");
  assert.equal(lockReason("incomplete_expired", null, now), "ended");
});

test("hasActiveTier : offre en essai Stripe (trialing) → accès", () => {
  assert.equal(hasActiveTier({ subPlan: "standard", subStatus: "trialing", subCurrentPeriodEnd: future }, now), true);
});

test("hasActiveTier : offre payée (active) → accès, pour chacune des trois", () => {
  for (const plan of ["essentiel", "standard", "premium"]) {
    assert.equal(hasActiveTier({ subPlan: plan, subStatus: "active", subCurrentPeriodEnd: future }, now), true, plan);
  }
});

test("hasActiveTier : offre résiliée → accès jusqu'à la fin de la période ; période échue → pas d'accès", () => {
  assert.equal(hasActiveTier({ subPlan: "premium", subStatus: "canceled", subCurrentPeriodEnd: future }, now), true);
  assert.equal(hasActiveTier({ subPlan: "premium", subStatus: "canceled", subCurrentPeriodEnd: past }, now), false);
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
