import { test } from "node:test";
import assert from "node:assert/strict";
import { planEquipmentSwaps, isPlatformSeance, NO_EQUIPMENT_SWAPS } from "./equipmentSwaps.ts";

test("planEquipmentSwaps : matériel inconnu → rien n'est remplacé", () => {
  assert.deepEqual(planEquipmentSwaps([{ name: "Banded Row", equipment: ["elastiques"] }], null), [null]);
});

test("planEquipmentSwaps : remplace ce que le patient n'a pas, garde le reste", () => {
  const rows = [
    { name: "Glute Bridge", equipment: [] },
    { name: "Banded Row", equipment: ["elastiques"] },
    { name: "Cycling", equipment: ["velo_rameur"] },
  ];
  assert.deepEqual(planEquipmentSwaps(rows, []), [null, "Prone T Arm Raise (Floor)", "Walking"]);
  assert.deepEqual(planEquipmentSwaps(rows, ["elastiques", "velo_rameur"]), [null, null, null]);
});

test("planEquipmentSwaps : ne crée pas de doublon dans la séance", () => {
  const rows = [
    { name: "Prone T Arm Raise (Floor)", equipment: [] },
    { name: "Banded Row", equipment: ["elastiques"] },
    { name: "Banded Face Pull", equipment: ["elastiques"] },
  ];
  assert.deepEqual(planEquipmentSwaps(rows, []), [null, "Reverse Snow Angel", "Prone Y Raise"]);
});

test("planEquipmentSwaps : objets de la maison jamais remplacés", () => {
  assert.deepEqual(planEquipmentSwaps([{ name: "Incline Push-up", equipment: ["chaise"] }], []), [null]);
});

test("isPlatformSeance : seulement les séances de la plateforme", () => {
  assert.equal(isPlatformSeance({ created_by: null, patient_id: null }), true);
  assert.equal(isPlatformSeance({ created_by: "k", patient_id: null }), false);
  assert.equal(isPlatformSeance({ created_by: null, patient_id: "p" }), false);
});

test("NO_EQUIPMENT_SWAPS : aucun remplaçant n'est lui-même remplacé", () => {
  const targets = Object.values(NO_EQUIPMENT_SWAPS).flat();
  for (const t of targets) assert.equal(t in NO_EQUIPMENT_SWAPS, false, t);
});
