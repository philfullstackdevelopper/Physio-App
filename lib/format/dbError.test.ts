import { test } from "node:test";
import assert from "node:assert/strict";
import { friendlyDbError } from "./dbError.ts";

console.error = () => {}; // les journaux serveur ne nous intéressent pas ici

test("traduit les erreurs Postgres courantes en français", () => {
  assert.equal(friendlyDbError({ code: "23505", message: "duplicate key value violates unique constraint" }), "Cet élément existe déjà.");
  assert.equal(
    friendlyDbError({ code: "42501", message: 'new row violates row-level security policy for table "patients"' }),
    "Vous n'avez pas le droit de faire cette action.",
  );
});

test("garde le message de nos propres règles (déjà en français)", () => {
  assert.equal(friendlyDbError({ code: "P0001", message: "Seul le patient peut accepter les CGU." }), "Seul le patient peut accepter les CGU.");
});

test("message inconnu : jamais l'anglais brut, le message par défaut", () => {
  assert.equal(friendlyDbError({ code: "XX000", message: "internal error" }, "Échec."), "Échec.");
  assert.equal(friendlyDbError(null, "Échec."), "Échec.");
});
