import { test } from "node:test";
import assert from "node:assert/strict";
import { nextSeance, phaseDoseFor } from "./phasePlan.ts";

const pool = [
  { id: "g1b", name: "Genou · Phase 1 · B", conditionId: "genou", stage: "acute" },
  { id: "g1a", name: "Genou · Phase 1 · A", conditionId: "genou", stage: "acute" },
  { id: "g3a", name: "Genou · Phase 3 · A", conditionId: "genou", stage: "recovery" },
  { id: "d2", name: "Dos · Phase 2", conditionId: "dos", stage: "subacute" },
];

test("A → B dans la même phase, puis phase suivante (phase vide sautée)", () => {
  assert.equal(nextSeance(pool[1], pool)?.id, "g1b");
  assert.equal(nextSeance(pool[0], pool)?.id, "g3a");
  assert.equal(nextSeance(pool[2], pool), null);
});

test("copie personnelle d'un patient : même nom que l'originale, pas reproposée", () => {
  const copy = { id: "copie", name: "Genou · Phase 1 · A", conditionId: "genou", stage: "acute" };
  assert.equal(nextSeance(copy, pool)?.id, "g1b");
});

test("sans phase ou sans pathologie : rien", () => {
  assert.equal(nextSeance({ id: "x", name: "x", conditionId: "genou", stage: null }, pool), null);
  assert.equal(nextSeance({ id: "x", name: "x", conditionId: null, stage: "acute" }, pool), null);
});

test("dose de phase : seulement les exercices en répétitions", () => {
  assert.deepEqual(phaseDoseFor("subacute", "reps"), { sets: 3, reps: 12 });
  assert.equal(phaseDoseFor("subacute", "hold"), null);
  assert.equal(phaseDoseFor(null, "reps"), null);
});
