import { test } from "node:test";
import assert from "node:assert/strict";
import { levelNeighbours } from "./levelStep.ts";

const pool = [
  { id: "g-acute", conditionId: "genou", stage: "acute" },
  { id: "g-recovery", conditionId: "genou", stage: "recovery" },
  { id: "g-sport", conditionId: "genou", stage: "return_to_sport" },
  { id: "dos-sub", conditionId: "dos", stage: "subacute" },
];

test("même condition, phase voisine ; une phase vide est sautée", () => {
  assert.deepEqual(levelNeighbours({ id: "x", conditionId: "genou", stage: "subacute" }, pool), { easier: "g-acute", harder: "g-recovery" });
  assert.deepEqual(levelNeighbours({ id: "g-acute", conditionId: "genou", stage: "acute" }, pool), { easier: null, harder: "g-recovery" });
  assert.deepEqual(levelNeighbours({ id: "g-sport", conditionId: "genou", stage: "return_to_sport" }, pool), { easier: "g-recovery", harder: null });
});

test("sans phase ou sans condition : pas de niveau", () => {
  assert.deepEqual(levelNeighbours({ id: "x", conditionId: "genou", stage: null }, pool), { easier: null, harder: null });
  assert.deepEqual(levelNeighbours({ id: "x", conditionId: null, stage: "acute" }, pool), { easier: null, harder: null });
});
