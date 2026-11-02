import { test } from "node:test";
import assert from "node:assert/strict";
import { summarizeExercises } from "./exerciseWatch.ts";

const row = (name: string, status: "done" | "skipped", pain: number | null = null) => ({
  exercise_name: name,
  status,
  pain,
  difficulty: null,
  created_at: "2026-11-01T10:00:00Z",
});

test("l'exercice douloureux ou souvent passé remonte en premier", () => {
  const s = summarizeExercises([
    row("Pont fessier", "done", 1),
    row("Squat", "done", 6),
    row("Squat", "done", 5),
    row("Clamshell", "skipped"),
    row("Clamshell", "skipped"),
    row("Clamshell", "done", 0),
  ]);
  assert.deepEqual(s.map((x) => x.name), ["Squat", "Clamshell", "Pont fessier"]);
  assert.equal(s[0].watch, "douleur 5,5/10");
  assert.equal(s[1].watch, "passé 2 fois");
  assert.equal(s[2].watch, null);
  assert.equal(s[1].done, 1);
});

test("aucune douleur donnée : pas de moyenne", () => {
  const [s] = summarizeExercises([row("Gainage", "done")]);
  assert.equal(s.avgPain, null);
  assert.equal(s.watch, null);
});
