import { test } from "node:test";
import assert from "node:assert/strict";
import { computeAdherence, adherenceLabel, adherenceTone } from "./adherence.ts";

// Jeudi 2026-09-03, 12:00 — lundi de la semaine en cours : 2026-08-31.
const now = new Date(2026, 8, 3, 12);
const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000).toISOString();

test("sans assignation → pct null, et une séance faite hors programme ne compte pas", () => {
  const a = computeAdherence({ completedAt: [daysAgo(1)], assignments: [], now });
  assert.deepEqual(a, { pct: null, done: 0, expected: 0 });
});

test("une séance assignée depuis plus de 4 semaines, 3×/semaine, 8 faites → 70 % (plafond par semaine)", () => {
  const a = computeAdherence({
    completedAt: Array.from({ length: 8 }, (_, i) => daysAgo(i * 2)),
    assignments: [{ weekStartDate: "2026-07-06", workoutId: "w1", timesPerWeek: 3 }],
    now,
  });
  // 3 semaines complètes × 3 + semaine en cours proratisée (jeudi : 3 jours
  // écoulés → floor(3 × 3/7) = 1).
  assert.equal(a.expected, 10);
  // Une séance tous les 2 jours : 2 cette semaine, 4 la précédente (comptées
  // 3, le rythme de la semaine), 2 celle d'avant → 7 (audit du 2026-10-08).
  assert.equal(a.done, 7);
  assert.equal(a.pct, 70);
});

test("séance assignée seulement cette semaine : attendu proratisé, plafond 100 %", () => {
  const a = computeAdherence({
    completedAt: [daysAgo(0), daysAgo(1), daysAgo(2)],
    assignments: [{ weekStartDate: "2026-08-31", workoutId: "w1", timesPerWeek: 3 }], // lundi de la semaine en cours
    now,
  });
  assert.equal(a.expected, 1); // seule la semaine en cours est couverte, et proratisée
  assert.equal(a.pct, 100);
});

test("séance attribuée aujourd'hui (lundi) : rien d'attendu encore → pas de « Faible »", () => {
  const monday = new Date(2026, 7, 31, 10); // lundi 2026-08-31
  const a = computeAdherence({
    completedAt: [],
    assignments: [{ weekStartDate: "2026-08-31", workoutId: "w1", timesPerWeek: 3 }],
    now: monday,
  });
  assert.deepEqual(a, { pct: null, done: 0, expected: 0 });
});

test("seules les séances des 4 semaines mesurées comptent", () => {
  // Fenêtre : du lundi 2026-08-10 00:00 à maintenant (jeudi 2026-09-03).
  const a = computeAdherence({
    completedAt: [
      new Date(2026, 7, 9, 18).toISOString(), // dimanche 08-09 : hors fenêtre
      new Date(2026, 7, 10, 9).toISOString(), // lundi 08-10 : dans la fenêtre
      new Date(2026, 8, 4, 9).toISOString(), // demain : ignoré
    ],
    assignments: [{ weekStartDate: "2026-07-06", workoutId: "w1", timesPerWeek: 3 }],
    now,
  });
  assert.equal(a.done, 1);
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
  // Semaines du 08-17 et 08-24 -> B (5 chacune), semaine courante (08-31) ->
  // B proratisée (jeudi : floor(5 × 3/7) = 2) ; seule la 4e semaine (08-10)
  // tombe encore avant B, donc sur A (3).
  assert.equal(a.expected, 3 + 5 + 5 + 2);
});

test("timesPerWeek null compte pour 1", () => {
  const a = computeAdherence({
    completedAt: [],
    assignments: [{ weekStartDate: "2026-07-06", workoutId: "w1", timesPerWeek: null }],
    now,
  });
  assert.equal(a.expected, 3); // 3 semaines complètes ; semaine en cours : floor(1 × 3/7) = 0
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

test("des séances en trop une semaine ne rattrapent pas une semaine vide", () => {
  const a = computeAdherence({
    // 6 séances la semaine dernière (lundi 24 → dimanche 30 août), rien d'autre.
    completedAt: [4, 5, 6, 7, 8, 9].map(daysAgo),
    assignments: [{ weekStartDate: "2026-08-17", workoutId: "w1", timesPerWeek: 3 }],
    now,
  });
  // Attendu : semaine du 17 (3) + du 24 (3) + en cours (1) = 7 ; fait : 3 (plafond).
  assert.equal(a.expected, 7);
  assert.equal(a.done, 3);
  assert.equal(a.pct, 43);
});
