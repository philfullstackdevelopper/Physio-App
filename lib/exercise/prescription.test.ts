import { test } from "node:test";
import assert from "node:assert/strict";
import { FIXED_GOAL_REPS, FIXED_GOAL_SETS, goalTextFor, recommendPrescription } from "./prescription.ts";

test("3 × 12 pour tout le monde, quels que soient l'âge, l'activité ou la phase", () => {
  for (const ctx of [{}, { ageYears: 70, activityLevel: "sedentary" as const, stage: "acute" as const }, { activityLevel: "active" as const }]) {
    const p = recommendPrescription(ctx);
    assert.equal(p.goalSets, FIXED_GOAL_SETS);
    assert.equal(p.goalReps, FIXED_GOAL_REPS);
  }
  assert.equal(goalTextFor("Allongé sur le dos, soulevez le bassin.", { goalSets: 3, goalReps: 12 }), "3 séries × 12 répétitions");
});

test("endurance : la durée écrite dans la consigne devient l'objectif", () => {
  const p = { goalSets: 3, goalReps: 12 };
  assert.equal(goalTextFor("Pédalez 10 minutes à faible résistance.", p), "10 minutes");
  assert.equal(goalTextFor("Marchez 1 minute.", p), "1 minute");
  assert.equal(goalTextFor("Marchez quelques minutes.", p), "3 séries × 12 répétitions");
  assert.equal(goalTextFor(null, p), "3 séries × 12 répétitions");
});
