import { test } from "node:test";
import assert from "node:assert/strict";
import { computeSignal, INACTIVE_DAYS } from "./patientSignal.ts";

const now = new Date(2026, 8, 3, 12);
const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000).toISOString();
const base = { concerning: false, severe: false, lastPain: null, lastSessionAt: daysAgo(1), createdAt: daysAgo(30), now };

test("douleur prioritaire sur l'inactivité", () => {
  const s = computeSignal({ ...base, concerning: true, lastPain: 7, lastSessionAt: daysAgo(10) });
  assert.equal(s.kind, "pain");
  assert.equal(s.label, "Douleur signalée 7/10");
  assert.equal(s.score, 7);
});

test("inactif à partir de 7 jours", () => {
  const s = computeSignal({ ...base, lastSessionAt: daysAgo(INACTIVE_DAYS) });
  assert.equal(s.kind, "inactive");
  assert.equal(s.label, "Aucune séance depuis 7 jours");
  assert.equal(s.days, 7);
});

test("à jour sous 7 jours", () => {
  const s = computeSignal({ ...base, lastSessionAt: daysAgo(6) });
  assert.equal(s.kind, "ok");
  assert.equal(s.label, "À jour");
});

test("jamais de séance mais compte jeune → à jour (pas de bruit)", () => {
  const s = computeSignal({ ...base, lastSessionAt: null, createdAt: daysAgo(3) });
  assert.equal(s.kind, "ok");
});

test("jamais de séance et compte ancien → inactif depuis la création", () => {
  const s = computeSignal({ ...base, lastSessionAt: null, createdAt: daysAgo(12) });
  assert.equal(s.kind, "inactive");
  assert.equal(s.days, 12);
});

test("douleur sans dernière note connue → libellé sans score", () => {
  const s = computeSignal({ ...base, concerning: true, lastPain: null });
  assert.equal(s.label, "Douleur signalée");
  assert.equal(s.score, null);
});
