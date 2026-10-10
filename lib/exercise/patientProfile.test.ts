import { test } from "node:test";
import assert from "node:assert/strict";
import { ageFromDob, isProfileComplete, type ProfileRow } from "./patientProfile.ts";

// La porte de l'inscription patient (lib/patient/home-data.ts) : tant que ce
// profil n'est pas complet, le patient est renvoyé au questionnaire.

const complete: ProfileRow = {
  date_of_birth: "1980-05-01",
  height_cm: 175,
  weight_kg: 70,
  activity_level: "moderate",
  condition_id: null, // choisi par le kiné, pas par le patient : non requis
  injury_stage: "subacute",
};

test("profil complet : le patient accède à l'appli", () => {
  assert.equal(isProfileComplete(complete), true);
});

test("chaque champ requis manquant renvoie au questionnaire", () => {
  for (const field of ["date_of_birth", "height_cm", "weight_kg", "activity_level", "injury_stage"] as const) {
    assert.equal(isProfileComplete({ ...complete, [field]: null }), false, field);
  }
  assert.equal(isProfileComplete(null), false);
  assert.equal(isProfileComplete(undefined), false);
});

test("âge : date invalide ou future ignorée", () => {
  assert.equal(ageFromDob(null), undefined);
  assert.equal(ageFromDob("pas une date"), undefined);
  assert.equal(ageFromDob("2999-01-01"), undefined);
  assert.ok((ageFromDob("1980-05-01") ?? 0) >= 45);
});
