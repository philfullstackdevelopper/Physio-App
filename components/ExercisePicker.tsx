"use client";

// =============================================================================
// ExercisePicker — grouped-by-body-area exercise checklist with a search box.
// Checkboxes stay mounted (hidden when filtered) so the form always submits the
// full selection under name="exercise_ids".
// =============================================================================

import { useMemo, useState } from "react";
import { primaryBodyPart, type BodyPart } from "@/lib/exercise/category";
import ExerciseIllustration from "@/components/ExerciseIllustration";

type Exercise = {
  id: string;
  name: string;
  instructions: string | null;
  bodyPartIds: string[];
  /** Old French names this exercise was renamed or merged away from
   *  (migration 0042/0043) — searched, never displayed. */
  search_keywords: string[] | null;
};

function matches(ex: Exercise, query: string) {
  return (
    ex.name.toLowerCase().includes(query) ||
    ex.instructions?.toLowerCase().includes(query) ||
    (ex.search_keywords ?? []).some((k) => k.toLowerCase().includes(query))
  );
}

export default function ExercisePicker({
  exercises,
  bodyParts,
  selectedIds,
}: {
  exercises: Exercise[];
  bodyParts: BodyPart[];
  selectedIds: string[];
}) {
  const [q, setQ] = useState("");
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);
  const query = q.trim().toLowerCase();

  const groups = useMemo(() => {
    const m = new Map<string, Exercise[]>();
    for (const ex of exercises) {
      const bp = primaryBodyPart(ex.bodyPartIds, bodyParts);
      if (!bp) continue;
      (m.get(bp.id) ?? m.set(bp.id, []).get(bp.id)!).push(ex);
    }
    return m;
  }, [exercises, bodyParts]);

  return (
    <div>
      <input
        type="text"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Rechercher un exercice…"
        className="w-full rounded-lg border border-line px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft"
      />

      <div className="mt-3 max-h-[28rem] space-y-4 overflow-y-auto">
        {bodyParts.map((bp) => {
          const list = groups.get(bp.id) ?? [];
          if (list.length === 0) return null;
          const visibleCount = query
            ? list.filter((ex) => matches(ex, query)).length
            : list.length;
          return (
            <div key={bp.id} className={visibleCount === 0 ? "hidden" : ""}>
              <p className="sticky top-0 bg-surface py-1 text-xs font-semibold uppercase tracking-wide text-muted">
                {bp.label} <span className="font-normal text-muted">({list.length})</span>
              </p>
              <div className="mt-1 space-y-0.5">
                {list.map((ex) => {
                  const show = !query || matches(ex, query);
                  return (
                    <label
                      key={ex.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 transition-colors duration-150 hover:bg-app-bg ${show ? "" : "hidden"}`}
                    >
                      <input
                        type="checkbox"
                        name="exercise_ids"
                        value={ex.id}
                        defaultChecked={selected.has(ex.id)}
                        className="h-4 w-4 shrink-0 rounded border-line text-brand focus:ring-brand-soft"
                      />
                      <ExerciseIllustration
                        name={ex.name}
                        animate={false}
                        className="h-9 w-9 shrink-0 text-brand"
                      />
                      <span className="text-sm text-ink">{ex.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
