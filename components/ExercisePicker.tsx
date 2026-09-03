"use client";

// =============================================================================
// ExercisePicker — grouped-by-body-area exercise checklist with a search box.
// Checkboxes stay mounted (hidden when filtered) so the form always submits the
// full selection under name="exercise_ids".
// =============================================================================

import { useMemo, useState } from "react";
import { CATEGORY_ORDER, categoryFor, type Category } from "@/lib/exercise/category";

type Exercise = { id: string; name: string };

export default function ExercisePicker({
  exercises,
  selectedIds,
}: {
  exercises: Exercise[];
  selectedIds: string[];
}) {
  const [q, setQ] = useState("");
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);
  const query = q.trim().toLowerCase();

  const groups = useMemo(() => {
    const m = new Map<Category, Exercise[]>();
    for (const ex of exercises) {
      const cat = categoryFor(ex.name);
      (m.get(cat) ?? m.set(cat, []).get(cat)!).push(ex);
    }
    return m;
  }, [exercises]);

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
        {CATEGORY_ORDER.map((cat) => {
          const list = groups.get(cat) ?? [];
          if (list.length === 0) return null;
          const visibleCount = query
            ? list.filter((ex) => ex.name.toLowerCase().includes(query)).length
            : list.length;
          return (
            <div key={cat} className={visibleCount === 0 ? "hidden" : ""}>
              <p className="sticky top-0 bg-surface py-1 text-xs font-semibold uppercase tracking-wide text-muted">
                {cat} <span className="font-normal text-muted">({list.length})</span>
              </p>
              <div className="mt-1 space-y-0.5">
                {list.map((ex) => {
                  const show = !query || ex.name.toLowerCase().includes(query);
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
                        className="h-4 w-4 rounded border-line text-brand focus:ring-brand-soft"
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
