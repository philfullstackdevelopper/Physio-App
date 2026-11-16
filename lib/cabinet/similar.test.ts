import { test } from "node:test";
import assert from "node:assert/strict";
import { looksLikeSameCabinet, normalizeWords } from "./similar.ts";

test("mots génériques et accents ignorés", () => {
  assert.deepEqual(normalizeWords("Cabinet de Kinésithérapie du Parc"), ["parc"]);
  assert.deepEqual(normalizeWords("Kiné Saint-Éloi"), ["saint", "eloi"]);
});

test("même mot significatif dans le nom : même cabinet probable", () => {
  assert.equal(looksLikeSameCabinet({ name: "Kiné du Parc" }, { name: "Cabinet de kinésithérapie du Parc" }), true);
  assert.equal(looksLikeSameCabinet({ name: "Centre Kiné Bellecour" }, { name: "Kinésithérapie Bellecour SCM" }), true);
});

test("même adresse : même cabinet probable, même avec des noms différents", () => {
  assert.equal(
    looksLikeSameCabinet({ name: "Cabinet Martin", address: "12 rue des Lilas, 75011 Paris" }, { name: "Kiné Lilas", address: "12 Rue des Lilas, 75011 PARIS" }),
    true,
  );
});

test("noms sans mot commun et adresses différentes : cabinets différents", () => {
  assert.equal(looksLikeSameCabinet({ name: "Kiné du Parc" }, { name: "Cabinet Voltaire" }), false);
  assert.equal(looksLikeSameCabinet({ name: "Cabinet de kinésithérapie" }, { name: "Cabinet de kinésithérapie" }), false);
});
