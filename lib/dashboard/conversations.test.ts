import { test } from "node:test";
import assert from "node:assert/strict";
import { buildConversations } from "./conversations.ts";

const patients = [
  { id: "p1", full_name: "Marc T." },
  { id: "p2", full_name: "Sophie R." },
  { id: "p3", full_name: "Aline B." },
];

test("tri : patients avec messages d'abord, par lastAt décroissant", () => {
  const rows = buildConversations({
    patients,
    messages: [
      { patient_id: "p1", body: "Bonjour", created_at: "2026-09-01T10:00:00Z", sender: "patient", read_by_instructor_at: null },
      { patient_id: "p2", body: "Ça va mieux", created_at: "2026-09-02T10:00:00Z", sender: "patient", read_by_instructor_at: "2026-09-02T11:00:00Z" },
    ],
  });
  assert.deepEqual(rows.map((r) => r.patientId), ["p2", "p1", "p3"]);
});

test("patients sans message triés par nom (fr)", () => {
  const rows = buildConversations({ patients, messages: [] });
  assert.deepEqual(rows.map((r) => r.patientId), ["p3", "p1", "p2"]);
  assert.equal(rows[0].lastBody, null);
  assert.equal(rows[0].lastAt, null);
  assert.equal(rows[0].lastSender, null);
  assert.equal(rows[0].unread, 0);
});

test("compte des non-lus : seulement sender patient et read_by_instructor_at null", () => {
  const rows = buildConversations({
    patients,
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
  const rows = buildConversations({ patients, messages: [] });
  const marc = rows.find((r) => r.patientId === "p1")!;
  assert.equal(marc.initials, "MT");
});
