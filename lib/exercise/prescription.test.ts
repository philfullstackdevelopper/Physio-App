import { test } from "node:test";
import assert from "node:assert/strict";
import { FIXED_GOAL_REPS, FIXED_GOAL_SETS, goalShortFor, goalTextFor, recommendPrescription } from "./prescription.ts";

test("3 séries de 8 à 12 répétitions pour tout le monde, quels que soient l'âge, l'activité ou la phase", () => {
  for (const ctx of [{}, { ageYears: 70, activityLevel: "sedentary" as const, stage: "acute" as const }, { activityLevel: "active" as const }]) {
    const p = recommendPrescription(ctx);
    assert.equal(p.goalSets, FIXED_GOAL_SETS);
    assert.equal(p.goalReps, FIXED_GOAL_REPS);
  }
  assert.equal(goalTextFor("Allongé sur le dos, soulevez le bassin.", { goalSets: 3, goalReps: 12 }), "3 séries de 8 à 12 répétitions");
  assert.equal(goalShortFor("Allongé sur le dos, soulevez le bassin."), "3 × 8-12 rép.");
});

test("endurance : la durée écrite dans la consigne devient l'objectif", () => {
  const p = { goalSets: 3, goalReps: 12 };
  assert.equal(goalTextFor("Pédalez 10 minutes à faible résistance.", p), "10 minutes");
  assert.equal(goalTextFor("Marchez 1 minute.", p), "1 minute");
  assert.equal(goalTextFor("Marchez quelques minutes.", p), "3 séries de 8 à 12 répétitions");
  assert.equal(goalTextFor(null, p), "3 séries de 8 à 12 répétitions");
  assert.equal(goalShortFor("Pédalez 10 minutes."), "10 min");
});

test("maintien : le temps écrit dans la consigne devient l'objectif", () => {
  const p = { goalSets: 3, goalReps: 12 };
  assert.equal(goalTextFor("Tenez la position 30 secondes.", p), "3 × 30 secondes");
  assert.equal(goalTextFor("Tenez 20 à 30 secondes.", p), "3 × 20 à 30 secondes");
  assert.equal(goalShortFor("Tenez 20 à 30 secondes."), "3 × 20-30 s");
});
