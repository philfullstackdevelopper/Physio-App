import { test } from "node:test";
import assert from "node:assert/strict";
import { parsePendingCabinet } from "./pendingCabinet.ts";

const ID = "3f2b8c1e-9a4d-4c7b-8e2f-1a2b3c4d5e6f";

test("inscrire son cabinet", () => {
  const p = parsePendingCabinet({ mode: "create", cabinetName: " Cabinet du Parc ", cabinetAddress: "1 rue X, 69001 Lyon", phone: "0612345678", rppsNumber: "10001234567", siret: "" });
  assert.equal(p?.mode, "create");
  assert.equal(p?.cabinetName, "Cabinet du Parc");
  assert.equal(p?.cabinetId, null);
  assert.equal(p?.rppsNumber, "10001234567");
  assert.equal(p?.siret, null);
});

test("ancien cookie sans mode = inscrire", () => {
  const p = parsePendingCabinet({ cabinetName: "A", cabinetAddress: "B", phone: "C" });
  assert.equal(p?.mode, "create");
});

test("rejoindre un cabinet : id obligatoire et valide", () => {
  assert.equal(parsePendingCabinet({ mode: "join", cabinetId: ID, cabinetName: "Cab", cabinetAddress: "", phone: "06" })?.cabinetId, ID);
  assert.equal(parsePendingCabinet({ mode: "join", cabinetId: "pas-un-id", cabinetName: "Cab", phone: "06" }), null);
  assert.equal(parsePendingCabinet({ mode: "join", cabinetName: "Cab", phone: "06" }), null);
});

test("champs manquants ou cookie invalide", () => {
  assert.equal(parsePendingCabinet({ mode: "create", cabinetName: "A", phone: "06" }), null);
  assert.equal(parsePendingCabinet({ mode: "create", cabinetAddress: "B", phone: "06" }), null);
  assert.equal(parsePendingCabinet(null), null);
  assert.equal(parsePendingCabinet("texte"), null);
});
