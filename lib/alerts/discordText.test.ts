import { test } from "node:test";
import assert from "node:assert/strict";
import { kineSignupText, plain, whoLine } from "./discordText.ts";

test("nom et ville du cabinet", () => {
  assert.equal(whoLine("Marie Dupont", "12 rue de la Paix, 69003 Lyon"), "Marie Dupont · 69003 Lyon");
  assert.equal(whoLine("Marie Dupont", ""), "Marie Dupont");
  assert.equal(whoLine("", null), "Nom non renseigné");
});

test("mise en forme Discord neutralisée", () => {
  assert.equal(plain("**Jean** @everyone"), "\\*\\*Jean\\*\\* \\@everyone");
  assert.equal(plain("a_b"), "a\\_b");
  assert.equal(plain("  Jean   Paul  "), "Jean Paul");
});

test("texte de l'alerte", () => {
  assert.equal(kineSignupText("directe", "Marie Dupont · 69003 Lyon"), "✅ Nouveau kiné inscrit : **Marie Dupont · 69003 Lyon** — il est dans l'appli");
  assert.match(kineSignupText("compte_cree", "Marie"), /cabinet pas encore renseigné/);
});
