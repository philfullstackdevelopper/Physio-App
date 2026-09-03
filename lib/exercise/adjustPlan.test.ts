import { test } from "node:test";
import assert from "node:assert/strict";
import { applyAdjustment, adjustmentMessage } from "./adjustPlan.ts";

const current = [
  { exerciseId: "a", position: 0 },
  { exerciseId: "b", position: 1 },
  { exerciseId: "c", position: 2 },
];

test("retire, ajoute en fin, renumérote", () => {
  assert.deepEqual(applyAdjustment(current, ["b"], ["d"]), [
    { exerciseId: "a", position: 0 },
    { exerciseId: "c", position: 1 },
    { exerciseId: "d", position: 2 },
  ]);
});

test("ignore les doublons et les ajouts déjà présents", () => {
  assert.deepEqual(applyAdjustment(current, [], ["a", "d", "d"]), [
    { exerciseId: "a", position: 0 },
    { exerciseId: "b", position: 1 },
    { exerciseId: "c", position: 2 },
    { exerciseId: "d", position: 3 },
  ]);
});

test("retirer puis ajouter le même exercice le garde (en fin)", () => {
  assert.deepEqual(applyAdjustment(current, ["a"], ["a"]), [
    { exerciseId: "b", position: 0 },
    { exerciseId: "c", position: 1 },
    { exerciseId: "a", position: 2 },
  ]);
});

test("message : accords et parties omises", () => {
  assert.equal(adjustmentMessage("Initiation genou", 1, 1), "J'ai ajusté votre séance « Initiation genou » : 1 exercice retiré, 1 exercice ajouté.");
  assert.equal(adjustmentMessage("Initiation genou", 0, 2), "J'ai ajusté votre séance « Initiation genou » : 2 exercices ajoutés.");
  assert.equal(adjustmentMessage("Initiation genou", 3, 0), "J'ai ajusté votre séance « Initiation genou » : 3 exercices retirés.");
});
