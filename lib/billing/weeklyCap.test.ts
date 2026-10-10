import { test } from "node:test";
import assert from "node:assert/strict";
import { weeklyCapViolation } from "./weeklyCap.ts";

test("Essentiel (1/sem.) : une séance 3×/semaine est refusée avec un message", () => {
  assert.match(weeklyCapViolation("essentiel", true, 3) ?? "", /offre Essentiel/);
  assert.equal(weeklyCapViolation("essentiel", true, 1), null);
});

test("Standard (3/sem.) : jusqu'à 3, pas au-delà", () => {
  assert.equal(weeklyCapViolation("standard", true, 3), null);
  assert.match(weeklyCapViolation("standard", true, 4) ?? "", /Standard/);
});

test("Premium, ancienne offre ou pas encore abonné : jamais bloqué", () => {
  assert.equal(weeklyCapViolation("premium", true, 7), null);
  assert.equal(weeklyCapViolation("patient_monthly", true, 7), null);
  assert.equal(weeklyCapViolation(null, false, 7), null);
  assert.equal(weeklyCapViolation("essentiel", false, 7), null);
});

test("fréquence non renseignée = 1 par semaine", () => {
  assert.equal(weeklyCapViolation("essentiel", true, null), null);
});
