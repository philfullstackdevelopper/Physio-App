import { test } from "node:test";
import assert from "node:assert/strict";
import { buildPatientRows } from "./patientRows.ts";
import { relativeDay } from "../format/relativeDay.ts";

const now = new Date(2026, 8, 3, 12);
const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000).toISOString();

const input = {
  now,
  patients: [
    { id: "p1", full_name: "Marc T.", condition_id: "c1", created_at: daysAgo(60), terms_accepted_at: daysAgo(60) },
    { id: "p2", full_name: "Sophie R.", condition_id: "c2", created_at: daysAgo(60), terms_accepted_at: daysAgo(60) },
    { id: "p3", full_name: "Paul M.", condition_id: null, created_at: daysAgo(2), terms_accepted_at: daysAgo(2) },
  ],
  profiles: [
    { id: "p1", injury_stage: "acute", health_data_consent_at: daysAgo(60) },
    { id: "p2", injury_stage: "recovery", health_data_consent_at: daysAgo(60) },
  ],
  conditions: [{ id: "c1", name: "Prothèse genou" }, { id: "c2", name: "Entorse cheville" }],
  logs: [
    { patient_id: "p1", completed_at: daysAgo(0) },
    { patient_id: "p1", completed_at: daysAgo(2) },
    { patient_id: "p2", completed_at: daysAgo(9) },
  ],
  feedback: [
    { patient_id: "p1", pain_score: 7, difficulty: null, created_at: daysAgo(0) },
    { patient_id: "p1", pain_score: 8, difficulty: null, created_at: daysAgo(2) },
  ],
  // week_start_date well before all 4 rolling adherence-window buckets
  // (earliest bucket monday is 2026-08-10 for this fixture's `now`), so the
  // assignment covers the whole window — same intent the old `daysAgo(30)`
  // fixture had under the pre-migration-0047 model.
  recs: [
    { patient_id: "p1", workout_id: "w1", week_start_date: "2026-08-04", times_per_week: 3 },
    { patient_id: "p2", workout_id: "w2", week_start_date: "2026-08-04", times_per_week: 2 },
  ],
};

test("douleur, phase courte, adhérence et libellés", () => {
  const rows = buildPatientRows(input);
  const marc = rows.find((r) => r.id === "p1")!;
  assert.equal(marc.initials, "MT");
  assert.equal(marc.conditionName, "Prothèse genou");
  assert.equal(marc.stageShort, "Phase 1");
  assert.equal(marc.lastSessionLabel, "Aujourd'hui");
  assert.equal(marc.signal.kind, "pain");
  assert.equal(marc.signal.label, "Douleur signalée 7/10"); // dernière note, pas la moyenne
  assert.equal(marc.adherence.expected, 10); // 3 semaines × 3 + semaine en cours proratisée (jeudi : 1) — voir adherence.ts
  assert.equal(marc.adherence.done, 2);
  assert.equal(marc.adherenceTone, "danger");
});

test("inactivité et à jour", () => {
  const rows = buildPatientRows(input);
  const sophie = rows.find((r) => r.id === "p2")!;
  assert.equal(sophie.signal.kind, "inactive");
  assert.equal(sophie.signal.label, "Dernière séance faite il y a 9 jours");
  assert.equal(sophie.lastSessionLabel, relativeDay(sophie.lastSessionAt, now));
  assert.notEqual(sophie.lastSessionLabel, "Jamais");
  const paul = rows.find((r) => r.id === "p3")!;
  assert.equal(paul.signal.kind, "ok"); // compte de 2 jours : jamais « inactif »
  assert.equal(paul.conditionName, null);
  assert.equal(paul.adherence.pct, null);
});

test("tri : douleur sévère, douleur, inactif, puis alphabétique", () => {
  const rows = buildPatientRows(input);
  assert.deepEqual(rows.map((r) => r.id), ["p1", "p2", "p3"]);
});

test("onboarding : invitation jamais acceptée vs profil santé jamais terminé", () => {
  const marc = buildPatientRows(input).find((r) => r.id === "p1")!;
  assert.equal(marc.onboardingStage, null); // CGU + profil : inscription terminée

  const paul = buildPatientRows(input).find((r) => r.id === "p3")!;
  assert.equal(paul.onboardingStage, "profile"); // CGU acceptées, mais aucune ligne patient_profiles

  const invited = { id: "p4", full_name: "Zoé K.", condition_id: null, created_at: daysAgo(1), terms_accepted_at: null };
  const rows = buildPatientRows({ ...input, patients: [...input.patients, invited] });
  assert.equal(rows.find((r) => r.id === "p4")!.onboardingStage, "invite");
});

test("tri : les inscriptions en attente restent en bas, même en présence d'une douleur sévère", () => {
  const invited = { id: "p4", full_name: "Aaron A.", condition_id: null, created_at: daysAgo(1), terms_accepted_at: null };
  const rows = buildPatientRows({
    ...input,
    patients: [...input.patients, invited],
    feedback: [...input.feedback, { patient_id: "p4", pain_score: 10, difficulty: null, created_at: daysAgo(0) }],
  });
  assert.deepEqual(rows.map((r) => r.id), ["p1", "p2", "p3", "p4"]);
});

test("anciens patients (abonnement terminé / carte refusée) : détectés d'après Stripe, tout en bas, sous les inscriptions en attente", () => {
  const rows = buildPatientRows({
    ...input,
    subscriptions: [
      // p1 : résilié, période payée terminée il y a 5 jours → ancien patient.
      { user_id: "p1", status: "canceled", current_period_end: daysAgo(5) },
      // p2 : abonnement en cours → patient actif.
      { user_id: "p2", status: "active", current_period_end: new Date(now.getTime() + 10 * 86_400_000).toISOString() },
    ],
  });
  const byId = Object.fromEntries(rows.map((r) => [r.id, r]));
  assert.equal(byId.p1.lapseReason, "ended");
  assert.notEqual(byId.p1.paymentLapsedAt, null);
  assert.equal(byId.p2.paymentLapsedAt, null);
  assert.equal(byId.p3.paymentLapsedAt, null); // jamais abonné : en attente, pas « ancien »
  // p1 a pourtant le signal le plus grave (douleur) : il passe quand même en dernier.
  assert.equal(rows[rows.length - 1].id, "p1");
  // p3 (inscription en attente) reste au-dessus de l'ancien patient.
  assert.ok(rows.findIndex((r) => r.id === "p3") < rows.findIndex((r) => r.id === "p1"));
});

test("sans abonnement connu, personne n'est « ancien patient » (l'ancienne étiquette manuelle n'est plus lue)", () => {
  const rows = buildPatientRows({
    ...input,
    patients: input.patients.map((p) => ({ ...p, payment_lapsed_at: daysAgo(10) })),
  });
  assert.ok(rows.every((r) => r.paymentLapsedAt === null && r.lapseReason === null));
});
