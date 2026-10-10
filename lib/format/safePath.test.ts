import { test } from "node:test";
import assert from "node:assert/strict";
import { safeInternalPath } from "./safePath.ts";

const FALLBACK = "/accueil";

test("garde un chemin du site, requête comprise", () => {
  assert.equal(safeInternalPath("/patient/compte?refreshed=1", FALLBACK), "/patient/compte?refreshed=1");
});

test("refuse les adresses vers un autre site", () => {
  for (const evil of ["//evil.com", "/\\evil.com", "/\\/evil.com", "https://evil.com", "evil.com", "/\tevil", "javascript:alert(1)"]) {
    assert.equal(safeInternalPath(evil, FALLBACK), FALLBACK, evil);
  }
});

test("rien ou vide : la page par défaut", () => {
  assert.equal(safeInternalPath(null, FALLBACK), FALLBACK);
  assert.equal(safeInternalPath("", FALLBACK), FALLBACK);
});
