import { test } from "node:test";
import assert from "node:assert/strict";
import { computeAdherence, adherenceLabel, adherenceTone } from "./adherence.ts";

// Jeudi 2026-09-03, 12:00 — lundi de la semaine en cours : 2026-08-31.
const now = new Date(2026, 8, 3, 12);
const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000).toISOString();

test("sans assignation → pct null", () => {
  const a = computeAdherence({ completedAt: [daysAgo(1)], assignments: [], now });
  assert.deepEqual(a, { pct: null, done: 1, expected: 0 });
});

test("une séance assignée depuis plus de 4 semaines, 3×/semaine, 10 faites → 83 %", () => {
  const a = computeAdherence({
    completedAt: Array.from({ length: 10 }, (_, i) => daysAgo(i * 2)),
    assignments: [{ weekStartDate: "2026-07-06", workoutId: "w1", timesPerWeek: 3 }],
    now,
  });
  assert.equal(a.expected, 12); // 4 semaines glissantes × 3
  assert.equal(a.done, 10);
  assert.equal(a.pct, 83);
});

test("séance assignée seulement cette semaine : attendu proratisé, plafond 100 %", () => {
  const a = computeAdherence({
    completedAt: [daysAgo(0), daysAgo(1), daysAgo(2)],
    assignments: [{ weekStartDate: "2026-08-31", workoutId: "w1", timesPerWeek: 3 }], // lundi de la semaine en cours
    now,
  });
  assert.equal(a.expected, 3); // une seule des 4 semaines glissantes est couverte
  assert.equal(a.pct, 100);
});

test("changement de séance en cours de route : pas de double comptage", () => {
  const a = computeAdherence({
    completedAt: [],
    // A depuis longtemps, remplacée par B à partir du 2026-08-17.
    assignments: [
      { weekStartDate: "2026-06-01", workoutId: "a", timesPerWeek: 3 },
      { weekStartDate: "2026-08-17", workoutId: "b", timesPerWeek: 5 },
    ],
    now,
  });
  // Semaines du 08-17, 08-24 et 08-31 (courante) -> B (5 chacune) ; seule la
  // 4e semaine glissante (08-10) tombe encore avant B, donc sur A (3).
  assert.equal(a.expected, 3 + 5 + 5 + 5);
});

test("timesPerWeek null compte pour 1", () => {
  const a = computeAdherence({
    completedAt: [],
    assignments: [{ weekStartDate: "2026-07-06", workoutId: "w1", timesPerWeek: null }],
    now,
  });
  assert.equal(a.expected, 4);
});

test("libellés et tons", () => {
  assert.equal(adherenceLabel(82), "Bonne");
  assert.equal(adherenceLabel(50), "Moyenne");
  assert.equal(adherenceLabel(49), "Faible");
  assert.equal(adherenceLabel(null), null);
  assert.equal(adherenceTone(80), "ok");
  assert.equal(adherenceTone(79), "warn");
  assert.equal(adherenceTone(10), "danger");
  assert.equal(adherenceTone(null), "muted");
});
