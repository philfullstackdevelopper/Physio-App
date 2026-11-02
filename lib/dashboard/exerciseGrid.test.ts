import { test } from "node:test";
import assert from "node:assert/strict";
import { buildExerciseGrid } from "./exerciseGrid.ts";

const logs = [1, 2, 3, 4].map((d) => ({ id: `l${d}`, completed_at: `2026-10-0${d}T10:00:00Z` }));
const r = (log: number, name: string, position: number, pain: number | null, status: "done" | "skipped" = "done") => ({
  workout_log_id: `l${log}`,
  exercise_name: name,
  position,
  status,
  pain,
});

test("une colonne par séance, du plus ancien au plus récent ; tendance et passés", () => {
  const g = buildExerciseGrid(
    [
      r(1, "Squat", 0, 2), r(2, "Squat", 0, 3), r(3, "Squat", 0, 5), r(4, "Squat", 0, 6),
      r(1, "Clamshell", 1, null, "skipped"), r(3, "Clamshell", 1, null, "skipped"), r(4, "Clamshell", 1, 2),
      r(1, "Pont", 2, 4), r(2, "Pont", 2, 3), r(3, "Pont", 2, 1), r(4, "Pont", 2, 1),
      r(3, "Fente", 3, 1), r(4, "Fente", 3, 1),
    ],
    logs,
  );
  assert.deepEqual(g.sessions.map((s) => s.logId), ["l1", "l2", "l3", "l4"]);
  assert.deepEqual(g.rows.map((x) => x.name), ["Squat", "Clamshell", "Pont", "Fente"]);
  assert.equal(g.rows[0].trend.label, "En hausse");
  assert.equal(g.rows[1].trend.label, "Passé 2 fois");
  assert.equal(g.rows[2].trend.label, "En baisse");
  assert.equal(g.rows[3].trend.label, "Ajouté récemment");
  assert.equal(g.rows[3].cells[0], null);
});

test("seules les 8 dernières séances avec des résultats comptent", () => {
  const many = Array.from({ length: 10 }, (_, i) => ({ id: `m${i}`, completed_at: `2026-10-${String(i + 10)}T10:00:00Z` }));
  const g = buildExerciseGrid(many.map((l) => ({ workout_log_id: l.id, exercise_name: "Squat", position: 0, status: "done" as const, pain: 1 })), many);
  assert.equal(g.sessions.length, 8);
  assert.equal(g.sessions[0].logId, "m2");
});
