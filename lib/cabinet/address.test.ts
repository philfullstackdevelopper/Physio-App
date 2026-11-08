import { test } from "node:test";
import assert from "node:assert/strict";
import { splitPostalCity } from "./address.ts";

test("code postal et ville en fin d'adresse", () => {
  assert.deepEqual(splitPostalCity("12 rue de la Paix, 69001 Lyon"), { postalCode: "69001", city: "Lyon" });
  assert.deepEqual(splitPostalCity("3 av. Foch 75116 Paris  "), { postalCode: "75116", city: "Paris" });
  assert.deepEqual(splitPostalCity("1 place X, 13100 Aix-en-Provence"), { postalCode: "13100", city: "Aix-en-Provence" });
});

test("adresse sans code postal : rien", () => {
  assert.deepEqual(splitPostalCity("Cabinet du centre"), { postalCode: null, city: null });
});
