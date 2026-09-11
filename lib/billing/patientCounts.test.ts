import { test } from "node:test";
import assert from "node:assert/strict";
import { computePatientCounts } from "./patientCounts.ts";

const now = new Date("2026-09-10T12:00:00Z");
const future = "2026-10-10T12:00:00Z";
const past = "2026-08-10T12:00:00Z";

test("computePatientCounts : total compte tous les patients, actif seulement ceux avec une offre en cours", () => {
  const patients = [
    { id: "p1", trial_ends_at: null },
    { id: "p2", trial_ends_at: null },
    { id: "p3", trial_ends_at: null },
  ];
  const subscriptions = [
    { user_id: "p1", plan: "essentiel", status: "active", current_period_end: future },
    { user_id: "p2", plan: "standard", status: "canceled", current_period_end: future },
  ];
  const result = computePatientCounts(patients, subscriptions, now);
  assert.equal(result.total, 3);
  assert.equal(result.active, 1);
});

test("computePatientCounts : répartit les actifs par offre", () => {
  const patients = [
    { id: "p1", trial_ends_at: null },
    { id: "p2", trial_ends_at: null },
    { id: "p3", trial_ends_at: null },
    { id: "p4", trial_ends_at: null },
  ];
  const subscriptions = [
    { user_id: "p1", plan: "essentiel", status: "active", current_period_end: future },
    { user_id: "p2", plan: "standard", status: "trialing", current_period_end: future },
    { user_id: "p3", plan: "standard", status: "active", current_period_end: future },
    { user_id: "p4", plan: "premium", status: "active", current_period_end: past },
  ];
  const result = computePatientCounts(patients, subscriptions, now);
  assert.equal(result.active, 3);
  assert.deepEqual(result.byTier, { essentiel: 1, standard: 2, premium: 0 });
});

test("computePatientCounts : grandfathering (ancien essai maison) compte comme actif mais pas dans byTier", () => {
  const patients = [{ id: "p1", trial_ends_at: future }];
  const result = computePatientCounts(patients, [], now);
  assert.equal(result.active, 1);
  assert.deepEqual(result.byTier, { essentiel: 0, standard: 0, premium: 0 });
});

test("computePatientCounts : aucun patient", () => {
  const result = computePatientCounts([], [], now);
  assert.deepEqual(result, { total: 0, active: 0, byTier: { essentiel: 0, standard: 0, premium: 0 } });
});
