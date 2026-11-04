import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PATIENT_PLANS,
  applicationFeePercent,
  patientMustSubscribe,
  platformShareCents,
  stripeFeeCents,
  subscriptionGivesAccess,
  subscriptionNeedsRefresh,
} from "./patientPlans.ts";

test("partage : le kiné touche 6,99 / 13,99 / 20,99 €, EasyPhysio 2,60 / 5,45 / 8,30 €", () => {
  const [m1, m3, m6] = PATIENT_PLANS;
  assert.deepEqual([platformShareCents(m1), platformShareCents(m3), platformShareCents(m6)], [260, 545, 830]);
  for (const p of PATIENT_PLANS) {
    // Ce que Stripe prélèvera avec le pourcentage arrondi = la part attendue (à 1 centime près).
    const fee = Math.round((p.priceCents * applicationFeePercent(p)) / 100);
    assert.ok(Math.abs(fee - platformShareCents(p)) <= 1, `${p.key}: ${fee}`);
    assert.equal(p.priceCents - stripeFeeCents(p.priceCents) - platformShareCents(p), p.kineCents);
  }
});

const now = new Date("2026-11-04T12:00:00Z");
const active = { plan: "plan_1m", status: "active", current_period_end: "2026-12-04T12:00:00Z", cancel_at_period_end: false };

test("accès : actif oui ; résilié jusqu'à la fin de la période ; carte refusée non", () => {
  assert.equal(subscriptionGivesAccess(active, now), true);
  assert.equal(subscriptionGivesAccess({ ...active, cancel_at_period_end: true }, now), true);
  assert.equal(subscriptionGivesAccess({ ...active, cancel_at_period_end: true, current_period_end: "2026-11-01T00:00:00Z" }, now), false);
  assert.equal(subscriptionGivesAccess({ ...active, status: "past_due" }, now), false);
  assert.equal(subscriptionGivesAccess({ ...active, status: "canceled" }, now), false);
  assert.equal(subscriptionGivesAccess({ ...active, plan: "premium" }, now), false);
  assert.equal(subscriptionGivesAccess(null, now), false);
});

test("période dépassée sans nouvelles : relire chez Stripe", () => {
  assert.equal(subscriptionNeedsRefresh(active, now), false);
  assert.equal(subscriptionNeedsRefresh({ ...active, current_period_end: "2026-11-03T00:00:00Z" }, now), true);
});

test("doit choisir une formule : seulement si le kiné encaisse et rien n'ouvre déjà l'accès", () => {
  const base = { kineFree: false, kineCanCharge: true, kineSuspended: false, freeAccessUntil: null, subscription: null, now };
  assert.equal(patientMustSubscribe(base), true);
  assert.equal(patientMustSubscribe({ ...base, kineFree: true }), false);
  assert.equal(patientMustSubscribe({ ...base, kineCanCharge: false }), false);
  assert.equal(patientMustSubscribe({ ...base, kineSuspended: true }), false);
  assert.equal(patientMustSubscribe({ ...base, freeAccessUntil: "2036-01-01T00:00:00Z" }), false);
  assert.equal(patientMustSubscribe({ ...base, subscription: active }), false);
});
