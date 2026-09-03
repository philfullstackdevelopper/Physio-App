import { test } from "node:test";
import assert from "node:assert/strict";
import { initials } from "./initials.ts";

test("deux mots → deux lettres", () => {
  assert.equal(initials("Marc T."), "MT");
  assert.equal(initials("Claire Dupont"), "CD");
});
test("un mot → deux premières lettres", () => {
  assert.equal(initials("Claire"), "CL");
});
test("vide → « ? »", () => {
  assert.equal(initials(""), "?");
  assert.equal(initials(null), "?");
});
