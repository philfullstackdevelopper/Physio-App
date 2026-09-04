import { test } from "node:test";
import assert from "node:assert/strict";
import { buildConversations, filterConversations } from "./conversations.ts";

const patients = [
  { id: "p1", full_name: "Marc T.", condition_id: null, follow_up_at: null },
  { id: "p2", full_name: "Sophie R.", condition_id: null, follow_up_at: null },
  { id: "p3", full_name: "Aline B.", condition_id: null, follow_up_at: null },
];

test("tri : patients avec messages d'abord, par lastAt décroissant", () => {
  const rows = buildConversations({
    patients,
    profiles: [],
    conditions: [],
    messages: [
      { patient_id: "p1", body: "Bonjour", created_at: "2026-09-01T10:00:00Z", sender: "patient", read_by_instructor_at: null },
      { patient_id: "p2", body: "Ça va mieux", created_at: "2026-09-02T10:00:00Z", sender: "patient", read_by_instructor_at: "2026-09-02T11:00:00Z" },
    ],
  });
  assert.deepEqual(rows.map((r) => r.patientId), ["p2", "p1", "p3"]);
});

test("patients sans message triés par nom (fr)", () => {
  const rows = buildConversations({ patients, profiles: [], conditions: [], messages: [] });
  assert.deepEqual(rows.map((r) => r.patientId), ["p3", "p1", "p2"]);
  assert.equal(rows[0].lastBody, null);
  assert.equal(rows[0].lastAt, null);
  assert.equal(rows[0].lastSender, null);
  assert.equal(rows[0].unread, 0);
});

test("compte des non-lus : seulement sender patient et read_by_instructor_at null", () => {
  const rows = buildConversations({
    patients,
    profiles: [],
    conditions: [],
    messages: [
      { patient_id: "p1", body: "a", created_at: "2026-09-01T10:00:00Z", sender: "patient", read_by_instructor_at: null },
      { patient_id: "p1", body: "b", created_at: "2026-09-01T11:00:00Z", sender: "patient", read_by_instructor_at: null },
      { patient_id: "p1", body: "c", created_at: "2026-09-01T12:00:00Z", sender: "instructor", read_by_instructor_at: null },
      { patient_id: "p1", body: "d", created_at: "2026-09-01T09:00:00Z", sender: "patient", read_by_instructor_at: "2026-09-01T09:30:00Z" },
    ],
  });
  const p1 = rows.find((r) => r.patientId === "p1")!;
  assert.equal(p1.unread, 2);
  assert.equal(p1.lastBody, "c");
  assert.equal(p1.lastSender, "instructor");
  assert.equal(p1.lastAt, "2026-09-01T12:00:00Z");
});

test("initials calculées pour chaque ligne", () => {
  const rows = buildConversations({ patients, profiles: [], conditions: [], messages: [] });
  const marc = rows.find((r) => r.patientId === "p1")!;
  assert.equal(marc.initials, "MT");
});

test("followUp et conditionLabel viennent des tables patient", () => {
  const rows = buildConversations({
    patients: [
      { id: "p1", full_name: "Marc T.", condition_id: "c1", follow_up_at: "2026-09-04T08:00:00Z" },
      { id: "p2", full_name: "Sophie R.", condition_id: null, follow_up_at: null },
    ],
    profiles: [{ id: "p1", injury_stage: "acute" }],
    conditions: [{ id: "c1", name: "Prothèse genou" }],
    messages: [],
  });
  assert.equal(rows[0].followUp, true);
  assert.equal(rows[0].conditionLabel, "Prothèse genou · Phase 1");
  assert.equal(rows[1].followUp, false);
  assert.equal(rows[1].conditionLabel, null);
});

test("filterConversations : onglets et recherche sans accents", () => {
  const rows = buildConversations({
    patients: [
      { id: "p1", full_name: "Émilie D.", condition_id: null, follow_up_at: "2026-09-04T08:00:00Z" },
      { id: "p2", full_name: "Marc T.", condition_id: null, follow_up_at: null },
    ],
    profiles: [],
    conditions: [],
    messages: [
      { patient_id: "p2", body: "Bonjour", created_at: "2026-09-01T10:00:00Z", sender: "patient", read_by_instructor_at: null },
    ],
  });
  assert.deepEqual(filterConversations(rows, "all", "").map((r) => r.patientId), ["p2", "p1"]);
  assert.deepEqual(filterConversations(rows, "unread", "").map((r) => r.patientId), ["p2"]);
  assert.deepEqual(filterConversations(rows, "follow_up", "").map((r) => r.patientId), ["p1"]);
  assert.deepEqual(filterConversations(rows, "all", "emilie").map((r) => r.patientId), ["p1"]);
  assert.deepEqual(filterConversations(rows, "unread", "emilie"), []);
});
