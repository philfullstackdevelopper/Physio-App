import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ACCESS_PLAN_KEY,
  KINE_FOLLOW_UP_CENTS,
  KINE_NET_CENTS,
  PATIENT_MONTHLY_TOTAL_CENTS,
  PLATFORM_ACCESS_HT_CENTS,
  PLATFORM_ACCESS_TTC_CENTS,
  PLATFORM_NET_CENTS,
  TRIAL_DAYS,
  kineFollowUpChargeable,
  patientMustSubscribe,
  stripeFeeCents,
  subscriptionGivesAccess,
  subscriptionNeedsRefresh,
} from "./patientPlans.ts";

// Modèle définitif (Philippe, 2026-11-04).

test("9,99 € = 3,99 € d'accès EasyPhysio + 6,00 € pour le kiné, 10 jours d'essai", () => {
  assert.equal(PLATFORM_ACCESS_TTC_CENTS, 399);
  assert.equal(KINE_FOLLOW_UP_CENTS, 600);
  assert.equal(PATIENT_MONTHLY_TOTAL_CENTS, 999);
  assert.equal(TRIAL_DAYS, 10);
});

test("ce que chacun garde : kiné ≈ 5,66 €, EasyPhysio ≈ 3,02 € HT après frais de carte", () => {
  assert.equal(stripeFeeCents(600), 34);
  assert.equal(KINE_NET_CENTS, 566);
  assert.equal(PLATFORM_ACCESS_HT_CENTS, 333);
  assert.equal(PLATFORM_NET_CENTS, 302);
});

const now = new Date("2026-12-10T12:00:00Z");
const later = "2027-01-10T12:00:00Z";
const past = "2026-12-01T12:00:00Z";

test("accès : abonnement d'accès actif ou en essai = accès, même résilié jusqu'à la fin du mois", () => {
  assert.equal(subscriptionGivesAccess({ plan: ACCESS_PLAN_KEY, status: "trialing", current_period_end: later, cancel_at_period_end: false }, now), true);
  assert.equal(subscriptionGivesAccess({ plan: ACCESS_PLAN_KEY, status: "active", current_period_end: later, cancel_at_period_end: true }, now), true);
  assert.equal(subscriptionGivesAccess({ plan: ACCESS_PLAN_KEY, status: "active", current_period_end: past, cancel_at_period_end: true }, now), false);
  assert.equal(subscriptionGivesAccess({ plan: ACCESS_PLAN_KEY, status: "past_due", current_period_end: later, cancel_at_period_end: false }, now), false);
});

test("ancien modèle : une formule plan_1m/3m/6m reste valable jusqu'à sa fin, puis plus jamais", () => {
  assert.equal(subscriptionGivesAccess({ plan: "plan_3m", status: "active", current_period_end: later, cancel_at_period_end: false }, now), true);
  assert.equal(subscriptionGivesAccess({ plan: "plan_3m", status: "active", current_period_end: past, cancel_at_period_end: false }, now), false);
  assert.equal(subscriptionGivesAccess({ plan: "kine_pro", status: "active", current_period_end: later, cancel_at_period_end: false }, now), false);
});

test("les 6 € du kiné : jamais pendant l'essai, jamais sans abonnement d'accès actif", () => {
  assert.equal(kineFollowUpChargeable({ plan: ACCESS_PLAN_KEY, status: "active", current_period_end: later, cancel_at_period_end: false }, now), true);
  assert.equal(kineFollowUpChargeable({ plan: ACCESS_PLAN_KEY, status: "trialing", current_period_end: later, cancel_at_period_end: false }, now), false);
  assert.equal(kineFollowUpChargeable({ plan: ACCESS_PLAN_KEY, status: "past_due", current_period_end: later, cancel_at_period_end: false }, now), false);
  assert.equal(kineFollowUpChargeable({ plan: "plan_1m", status: "active", current_period_end: later, cancel_at_period_end: false }, now), false);
  assert.equal(kineFollowUpChargeable(null, now), false);
});

test("paywall : obligatoire sauf kiné sans paiements, suspendu, accès offert (test) ou abonnement valide", () => {
  const base = { kineCanCharge: true, kineSuspended: false, freeAccessUntil: null, subscription: null, now };
  assert.equal(patientMustSubscribe(base), true);
  assert.equal(patientMustSubscribe({ ...base, kineCanCharge: false }), false);
  assert.equal(patientMustSubscribe({ ...base, kineSuspended: true }), false);
  assert.equal(patientMustSubscribe({ ...base, freeAccessUntil: later }), false);
  assert.equal(
    patientMustSubscribe({ ...base, subscription: { plan: ACCESS_PLAN_KEY, status: "trialing", current_period_end: later, cancel_at_period_end: false } }),
    false,
  );
});

test("relecture chez Stripe quand la période est dépassée", () => {
  assert.equal(subscriptionNeedsRefresh({ plan: ACCESS_PLAN_KEY, status: "active", current_period_end: past, cancel_at_period_end: false }, now), true);
  assert.equal(subscriptionNeedsRefresh({ plan: ACCESS_PLAN_KEY, status: "active", current_period_end: later, cancel_at_period_end: false }, now), false);
});
