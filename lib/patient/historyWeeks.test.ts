import { test } from "node:test";
import assert from "node:assert/strict";
import { buildHistoryWeeks, type HistoryWorkout } from "./historyWeeks.ts";

const genou: HistoryWorkout = { name: "Genou", timesPerWeek: 3, exercises: ["Glute Bridge", "Bodyweight Squat"] };
// Mercredi 4 novembre 2026, midi : semaine du lundi 2 novembre.
const now = new Date("2026-11-04T12:00:00");

test("semaine passée : séances faites en bleu, manquantes en rouge", () => {
  const weeks = buildHistoryWeeks({
    now,
    assignments: [{ workoutId: "w", weekStartDate: "2026-10-26", workout: genou }],
    logs: [
      { id: "a", completedAt: "2026-10-27T18:00:00", workout: genou },
      { id: "b", completedAt: "2026-10-29T18:00:00", workout: genou },
    ],
  });
  const past = weeks.find((w) => w.key === "2026-10-26")!;
  assert.equal(past.done, 2);
  assert.equal(past.target, 3);
  assert.deepEqual(past.slots.map((s) => s.status), ["done", "done", "missed"]);
  assert.deepEqual(past.slots[2].exercises, ["Glute Bridge", "Bodyweight Squat"]);
  assert.equal(past.sessions[0].id, "b"); // la plus récente d'abord
});

test("semaine en cours : ce qui reste est « à faire », pas manqué", () => {
  const weeks = buildHistoryWeeks({
    now,
    assignments: [{ workoutId: "w", weekStartDate: "2026-10-26", workout: genou }],
    logs: [{ id: "c", completedAt: "2026-11-03T08:00:00", workout: genou }],
  });
  assert.equal(weeks[0].key, "2026-11-02");
  assert.equal(weeks[0].current, true);
  assert.deepEqual(weeks[0].slots.map((s) => s.status), ["done", "todo", "todo"]);
});

test("rien de prévu ni de fait : pas de semaine vide ; rien du tout : liste vide", () => {
  const weeks = buildHistoryWeeks({
    now,
    assignments: [{ workoutId: "w", weekStartDate: "2026-10-19", weekCount: 1, workout: genou }],
    logs: [],
  });
  assert.deepEqual(weeks.map((w) => w.key), ["2026-10-19"]);
  assert.deepEqual(buildHistoryWeeks({ now, assignments: [], logs: [] }), []);
});
