import { test } from "node:test";
import assert from "node:assert/strict";
import { exerciseNameFor, exerciseNameMatches, frenchExerciseName, platformExerciseName } from "./exerciseNames.ts";
import raw from "../../i18n/content/fr-exercise-names.json" with { type: "json" };

test("dictionnaire : chaque nom français est unique (le chemin retour reste sans ambiguïté)", () => {
  const values = Object.entries(raw as Record<string, string>).filter(([k]) => !k.startsWith("_")).map(([, v]) => v);
  assert.equal(new Set(values).size, values.length);
});

test("aller-retour anglais ↔ français", () => {
  assert.equal(frenchExerciseName("Glute Bridge"), "Pont fessier");
  assert.equal(platformExerciseName("Pont fessier"), "Glute Bridge");
  assert.equal(platformExerciseName("Glute Bridge"), "Glute Bridge");
  assert.equal(platformExerciseName("Mon exercice"), "Mon exercice");
  assert.equal(frenchExerciseName("Mon exercice"), undefined);
});

test("exerciseNameFor : français seulement en français", () => {
  assert.equal(exerciseNameFor("Quad Set", "fr"), "Contraction du quadriceps");
  assert.equal(exerciseNameFor("Quad Set", undefined), "Contraction du quadriceps");
  assert.equal(exerciseNameFor("Quad Set", "en"), "Quad Set");
});

test("recherche : nom français, sans accent, ou nom anglais d'origine", () => {
  const n = "Élévation de la jambe tendue";
  assert.ok(exerciseNameMatches(n, "élévation"));
  assert.ok(exerciseNameMatches(n, "elevation"));
  assert.ok(exerciseNameMatches(n, "leg raise"));
  assert.ok(!exerciseNameMatches(n, "squat"));
  assert.ok(exerciseNameMatches("Straight Leg Raise", "leg raise"));
});
