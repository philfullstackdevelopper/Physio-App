import { test } from "node:test";
import assert from "node:assert/strict";
import { equipmentListLabel, missingEquipment } from "./equipment.ts";

test("missingEquipment : un exercice sans matériel ne manque jamais de rien", () => {
  assert.deepEqual(missingEquipment([], ["aucun"]), []);
  assert.deepEqual(missingEquipment(null, []), []);
});

test("missingEquipment : signale ce que le patient n'a pas coché", () => {
  assert.deepEqual(missingEquipment(["halteres"], ["aucun"]), ["halteres"]);
  assert.deepEqual(missingEquipment(["halteres"], ["tapis", "halteres"]), []);
  assert.deepEqual(missingEquipment(["chaise", "halteres"], ["chaise"]), ["halteres"]);
  // Patient qui n'a rien déclaré du tout : tout matériel exigé manque.
  assert.deepEqual(missingEquipment(["elastiques"], []), ["elastiques"]);
});

test("missingEquipment : le matériel de salle manque toujours à la maison", () => {
  assert.deepEqual(missingEquipment(["salle"], ["tapis", "elastiques", "halteres", "chaise", "velo_rameur", "barre_traction", "swiss_ball"]), ["salle"]);
});

test("missingEquipment : matériel du patient inconnu → on ne signale rien", () => {
  assert.deepEqual(missingEquipment(["halteres"], null), []);
  assert.deepEqual(missingEquipment(["halteres"], undefined), []);
});

test("missingEquipment : ignore les identifiants inconnus en base", () => {
  assert.deepEqual(missingEquipment(["inconnu", "halteres"], []), ["halteres"]);
});

test("equipmentListLabel : libellés courts, séparés par des virgules", () => {
  assert.equal(equipmentListLabel(["halteres", "chaise"]), "Haltères, Chaise ou banc");
  assert.equal(equipmentListLabel([]), "");
});
