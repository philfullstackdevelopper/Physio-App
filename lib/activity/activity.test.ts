import { test } from "node:test";
import assert from "node:assert/strict";
import {
  KINE_STAGES,
  PATIENT_STAGES,
  buildActivity,
  funnel,
  kineLevel,
  kineNeedsNudge,
  patientLevel,
  patientNeedsNudge,
  patientStage,
  type InstructorActivityDb,
  type PatientActivityDb,
} from "./activity.ts";

const NOW = new Date("2026-11-16T12:00:00Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString();

function patient(over: Partial<PatientActivityDb> = {}): PatientActivityDb {
  return {
    patient_id: "abcd1234-0000-0000-0000-000000000001",
    instructor_id: "k1",
    email: "Pat@Example.com",
    created_at: daysAgo(20),
    joined_via_link: false,
    terms_accepted_at: null,
    subscription_status: null,
    has_programme: false,
    first_session_at: null,
    last_session_at: null,
    sessions_7d: 0,
    sessions_30d: 0,
    sessions_total: 0,
    push_platforms: [],
    is_test: false,
    ...over,
  };
}

function kine(over: Partial<InstructorActivityDb> = {}): InstructorActivityDb {
  return {
    instructor_id: "k1",
    full_name: "Marie Kiné",
    email: "marie@example.com",
    status: "approved",
    created_at: daysAgo(40),
    first_patient_at: null,
    last_programme_at: null,
    push_platforms: [],
    is_test: false,
    ...over,
  };
}

test("niveau patient : actif ≤ 7 j, ralentit ≤ 14 j, inactif au-delà, pas commencé sans séance", () => {
  assert.equal(patientLevel(null, NOW), "pas_commence");
  assert.equal(patientLevel(daysAgo(0), NOW), "actif");
  assert.equal(patientLevel(daysAgo(7), NOW), "actif");
  assert.equal(patientLevel(daysAgo(8), NOW), "ralentit");
  assert.equal(patientLevel(daysAgo(14), NOW), "ralentit");
  assert.equal(patientLevel(daysAgo(15), NOW), "inactif");
});

test("niveau kiné : jamais vu = inactif, 30 j de marge avant inactif", () => {
  assert.equal(kineLevel(null, NOW), "inactif");
  assert.equal(kineLevel(daysAgo(3), NOW), "actif");
  assert.equal(kineLevel(daysAgo(20), NOW), "ralentit");
  assert.equal(kineLevel(daysAgo(31), NOW), "inactif");
});

test("étape patient : la plus avancée atteinte", () => {
  assert.equal(patientStage(patient()), "ajoute");
  assert.equal(patientStage(patient({ terms_accepted_at: daysAgo(5) })), "cgu");
  assert.equal(patientStage(patient({ terms_accepted_at: daysAgo(5), subscription_status: "trialing" })), "carte");
  assert.equal(patientStage(patient({ subscription_status: "canceled", terms_accepted_at: daysAgo(5) })), "cgu");
  assert.equal(patientStage(patient({ has_programme: true })), "programme");
  assert.equal(patientStage(patient({ has_programme: true, sessions_total: 1 })), "seance");
});

test("parcours : une étape atteinte compte pour les précédentes", () => {
  const f = funnel(PATIENT_STAGES, ["ajoute", "carte", "seance", "seance"]);
  assert.deepEqual(
    f.map((s) => s.count),
    [4, 3, 3, 2, 2],
  );
  assert.deepEqual(
    funnel(KINE_STAGES, []).map((s) => s.count),
    [0, 0, 0, 0],
  );
});

test("assemblage : pseudonyme, dates Clerk par e-mail, compteurs par kiné", () => {
  const seen = new Map([
    ["pat@example.com", { lastActiveAt: daysAgo(2), lastSignInAt: daysAgo(10) }],
    ["marie@example.com", { lastActiveAt: null, lastSignInAt: daysAgo(40) }],
  ]);
  const { patients, kines } = buildActivity(
    [patient({ has_programme: true, sessions_total: 3, sessions_7d: 2, last_session_at: daysAgo(1), push_platforms: ["web"] })],
    [kine({ first_patient_at: daysAgo(20), last_programme_at: daysAgo(3) })],
    seen,
    NOW,
  );
  const p = patients[0];
  assert.equal(p.code, "P-ABCD");
  assert.equal(p.instructorName, "Marie Kiné");
  assert.equal(p.lastSeenAt, daysAgo(2));
  assert.equal(p.level, "actif");
  assert.equal(p.notifiable, true);
  const k = kines[0];
  assert.equal(k.patients, 1);
  assert.equal(k.activePatients, 1);
  assert.equal(k.sessions7d, 2);
  assert.equal(k.stage, "programme");
  // Pas vu par Clerk depuis 40 j, mais un programme il y a 3 j : actif.
  assert.equal(k.level, "actif");
});

test("relance : seulement avec notifications, programme en main et pas actif", () => {
  const build = (over: Partial<PatientActivityDb>) => buildActivity([patient(over)], [kine()], new Map(), NOW).patients[0];
  assert.equal(patientNeedsNudge(build({ has_programme: true, push_platforms: ["ios"] })), true);
  assert.equal(patientNeedsNudge(build({ has_programme: true, push_platforms: [] })), false);
  assert.equal(patientNeedsNudge(build({ has_programme: false, push_platforms: ["ios"] })), false);
  assert.equal(
    patientNeedsNudge(build({ has_programme: true, sessions_total: 1, last_session_at: daysAgo(2), push_platforms: ["ios"] })),
    false,
  );
  const k = (over: Partial<InstructorActivityDb>) => buildActivity([], [kine(over)], new Map(), NOW).kines[0];
  assert.equal(kineNeedsNudge(k({ push_platforms: ["android"] })), true);
  assert.equal(kineNeedsNudge(k({ push_platforms: ["android"], status: "pending" })), false);
  assert.equal(kineNeedsNudge(k({ push_platforms: [] })), false);
});
