import { test } from "node:test";
import assert from "node:assert/strict";
import { buildDashboardHome } from "./homeData.ts";
import { relativeDay } from "../format/relativeDay.ts";

const now = new Date(2026, 8, 3, 15); // jeudi 3 septembre 2026
const at = (daysAgo: number, hour = 10) => new Date(2026, 8, 3 - daysAgo, hour).toISOString();

const input = {
  now,
  patients: [
    { id: "p1", full_name: "Marc T.", created_at: at(60) },
    { id: "p2", full_name: "Sophie R.", created_at: at(60) },
    { id: "p3", full_name: "Paul M.", created_at: at(60) },
    { id: "p4", full_name: "Julie L.", created_at: at(2) },
  ],
  logs: [
    { id: "l1", patient_id: "p1", completed_at: at(0, 9) },
    { id: "l2", patient_id: "p3", completed_at: at(0, 8) },
    { id: "l3", patient_id: "p3", completed_at: at(1) },
    { id: "l4", patient_id: "p2", completed_at: at(9) },
  ],
  feedback: [
    { patient_id: "p1", pain_score: 7, difficulty: null, created_at: at(0, 9) },
    { patient_id: "p1", pain_score: 6, difficulty: null, created_at: at(3) },
    { patient_id: "p3", pain_score: 2, difficulty: null, created_at: at(0, 8) },
  ],
};

test("tuiles : séances et douleurs du jour avec variation vs hier", () => {
  const h = buildDashboardHome(input);
  assert.deepEqual(h.sessionsToday, { value: 2, delta: 1 }); // 2 aujourd'hui, 1 hier
  assert.deepEqual(h.painToday, { value: 1, delta: 1 }); // 1 note ≥ 6 aujourd'hui, 0 hier
  assert.equal(h.inactiveCount, 1); // Sophie (9 jours) ; Julie a un compte de 2 jours
  assert.equal(h.patientCount, 4);
  assert.equal(h.todayLabel, "Jeudi 3 septembre");
});

test("à traiter : douleur avant inactivité, avec score", () => {
  const h = buildDashboardHome(input);
  assert.deepEqual(h.toTreat.map((r) => [r.id, r.kind]), [["p1", "pain"], ["p2", "inactive"]]);
  assert.equal(h.toTreat[0].label, "Douleur signalée");
  assert.equal(h.toTreat[0].score, 7);
  assert.equal(h.toTreat[1].label, "Aucune séance depuis 9 jours");
  assert.equal(h.surveillerCount, 2);
});

test("activité récente : 5 dernières séances, plus récente d'abord", () => {
  const h = buildDashboardHome(input);
  assert.deepEqual(h.recent.map((r) => [r.logId, r.whenLabel]), [["l1", "Aujourd'hui"], ["l2", "Aujourd'hui"], ["l3", "Hier"], ["l4", relativeDay(at(9), now)]]);
  assert.equal(h.recent[0].name, "Marc T.");
});

test("bandeau : dernière douleur du jour, sinon null", () => {
  assert.equal(buildDashboardHome(input).banner, "Marc T. a signalé une douleur pendant sa séance.");
  assert.equal(buildDashboardHome({ ...input, feedback: [] }).banner, null);
});
