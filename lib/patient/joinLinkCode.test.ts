import { test } from "node:test";
import assert from "node:assert/strict";
import { signJoinCode, verifyJoinCode } from "./joinLinkCode.ts";

const ID = "3f2b8c1e-7a4d-4e9b-9c0a-1d2e3f4a5b6c";

test("un code signé se relit avec la même clé", () => {
  assert.equal(verifyJoinCode(["nouvelle"], signJoinCode("nouvelle", ID)), ID);
});

test("un code signé avec l'ancienne clé reste valable pendant la rotation", () => {
  const ancien = signJoinCode("ancienne", ID);
  assert.equal(verifyJoinCode(["nouvelle", "ancienne"], ancien), ID);
  assert.equal(verifyJoinCode(["nouvelle"], ancien), null);
});

test("refuse une signature fausse, un autre kiné, ou un code mal formé", () => {
  const code = signJoinCode("cle", ID);
  const autre = "00000000-0000-4000-8000-000000000000";
  assert.equal(verifyJoinCode(["cle"], `${autre}.${code.split(".")[1]}`), null);
  assert.equal(verifyJoinCode(["cle"], `${ID}.AAAAAAAAAAAAAAAA`), null);
  assert.equal(verifyJoinCode(["cle"], "pas-un-uuid.abc"), null);
  assert.equal(verifyJoinCode(["cle"], ID), null);
  assert.equal(verifyJoinCode(["cle"], `${code}.extra`), null);
  assert.equal(verifyJoinCode(["cle"], "%E0%A4%A"), null);
  assert.equal(verifyJoinCode([], code), null);
});

test("majuscules dans l'identifiant : même code, identifiant rendu en minuscules", () => {
  const code = signJoinCode("cle", ID.toUpperCase());
  assert.equal(code, signJoinCode("cle", ID));
  assert.equal(verifyJoinCode(["cle"], code.toUpperCase().replace(/\..*/, "." + code.split(".")[1])), ID);
});
