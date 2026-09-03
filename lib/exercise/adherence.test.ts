import { test } from "node:test";
import assert from "node:assert/strict";
import { computeAdherence, adherenceLabel, adherenceTone } from "./adherence.ts";

const now = new Date(2026, 8, 3, 12);
const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000).toISOString();

test("sans recommandation → pct null", () => {
  const a = computeAdherence({ completedAt: [daysAgo(1)], recommendations: [], now });
  assert.deepEqual(a, { pct: null, done: 1, expected: 0 });
});

test("4 semaines à 3×/semaine, 10 séances faites → 83 %", () => {
  const a = computeAdherence({
    completedAt: Array.from({ length: 10 }, (_, i) => daysAgo(i * 2)),
    recommendations: [{ timesPerWeek: 3, createdAt: daysAgo(40) }],
    now,
  });
  assert.equal(a.expected, 12);
  assert.equal(a.done, 10);
  assert.equal(a.pct, 83);
});

test("recommandation récente : attendu proratisé, plafond 100 %", () => {
  const a = computeAdherence({
    completedAt: [daysAgo(0), daysAgo(1), daysAgo(2), daysAgo(3)],
    recommendations: [{ timesPerWeek: 3, createdAt: daysAgo(5) }],
    now,
  });
  assert.equal(a.expected, 3); // ceil(5/7) = 1 semaine × 3
  assert.equal(a.pct, 100);
});

test("les séances hors fenêtre de 28 jours ne comptent pas", () => {
  const a = computeAdherence({
    completedAt: [daysAgo(29), daysAgo(40)],
    recommendations: [{ timesPerWeek: 2, createdAt: daysAgo(60) }],
    now,
  });
  assert.equal(a.done, 0);
  assert.equal(a.pct, 0);
});

test("timesPerWeek null compte pour 1", () => {
  const a = computeAdherence({
    completedAt: [],
    recommendations: [{ timesPerWeek: null, createdAt: daysAgo(30) }],
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
