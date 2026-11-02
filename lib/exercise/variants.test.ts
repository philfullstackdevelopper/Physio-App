import { test } from "node:test";
import assert from "node:assert/strict";
import { recommendVariants } from "./variants.ts";

const ex = (id: string, ...bodyPartIds: string[]) => ({ id, name: id, bodyPartIds });

const pool = [
  { conditionId: "genou", stage: "acute", exercises: [ex("quad-iso", "genou"), ex("cheville-pompe", "cheville")] },
  { conditionId: "genou", stage: "recovery", exercises: [ex("fente", "genou"), ex("pont-uni", "hanche")] },
  { conditionId: "dos", stage: "recovery", exercises: [ex("squat-barre", "genou")] },
];
const current = { conditionId: "genou", stage: "subacute", exercises: [ex("squat", "genou"), ex("pont", "hanche")] };
const all = new Set(["quad-iso", "cheville-pompe", "fente", "pont-uni", "squat-barre"]);

test("plus facile = phase en dessous, plus difficile = phase au-dessus, même zone et même condition", () => {
  const r = recommendVariants({ current, pool, pickable: all });
  assert.deepEqual(
    r.map((x) => `${x.forName}:${x.kind}:${x.alt.name}`),
    ["squat:easier:quad-iso", "squat:harder:fente", "pont:harder:pont-uni"],
  );
});

test("un exercice surveillé passe en tête, avec seulement la variante plus facile", () => {
  const swapped = { ...current, exercises: [ex("pont", "hanche"), ex("squat", "genou")] };
  const r = recommendVariants({ current: swapped, pool, pickable: all, watch: new Map([["squat", "douleur 6/10"]]) });
  assert.equal(r[0].forName, "squat");
  assert.equal(r[0].kind, "easier");
  assert.equal(r[0].reason, "douleur 6/10");
  assert.ok(!r.some((x) => x.forName === "squat" && x.kind === "harder"));
});

test("non filmé (non choisissable) ou sans phase : rien", () => {
  assert.deepEqual(recommendVariants({ current, pool, pickable: new Set() }), []);
  assert.deepEqual(recommendVariants({ current: { ...current, stage: null }, pool, pickable: all }), []);
});
