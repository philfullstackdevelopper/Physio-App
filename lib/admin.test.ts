import { test } from "node:test";
import assert from "node:assert/strict";
import { isAdminEmail } from "./admin.ts";

test("reconnaît un e-mail de la liste, sans tenir compte des majuscules ni des espaces", () => {
  process.env.ADMIN_EMAILS = " Admin@Example.fr , autre@example.fr";
  assert.equal(isAdminEmail("admin@example.fr"), true);
  assert.equal(isAdminEmail("AUTRE@example.fr"), true);
});

test("refuse tout le reste, liste vide comprise", () => {
  process.env.ADMIN_EMAILS = "admin@example.fr";
  assert.equal(isAdminEmail("kine@example.fr"), false);
  assert.equal(isAdminEmail(""), false);
  assert.equal(isAdminEmail(null), false);
  process.env.ADMIN_EMAILS = "";
  assert.equal(isAdminEmail("admin@example.fr"), false);
});
