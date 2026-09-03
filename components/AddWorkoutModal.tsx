"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";

export type AddableWorkout = {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number | null;
  timesPerWeek: number | null;
  stageLabel: string | null;
  /** Séances span every condition now, not just the patient's assigned one —
   *  shown as a group header so a long list stays scannable. */
  conditionName: string | null;
  /** Link to the séance editor — only set for séances this instructor owns
   *  (platform séances stay read-only, same rule as everywhere else). */
  editHref: string | null;
  exerciseNames: string[];
};

/** A proper picker for adding a recommended séance — full description, stage,
 *  and exercise list per option, instead of a bare name in a dropdown, so the
 *  kiné can actually tell the workouts apart before choosing. */
export default function AddWorkoutModal({
  patientId,
  addable,
  addAction,
}: {
  patientId: string;
  addable: AddableWorkout[];
  addAction: (formData: FormData) => void;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (addable.length === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 text-sm font-medium text-[color:var(--ink-accent)] underline decoration-[color:var(--ink-accent)]/30 underline-offset-4 hover:decoration-[color:var(--ink-accent)]"
      >
        + Ajouter une séance
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#2B2622]/45 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-[var(--paper)] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Choisir une séance à recommander"
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-display text-xl font-semibold text-[color:var(--ink)]">
                Choisir une séance
              </h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fermer"
                className="rounded p-1 text-[color:var(--ink-muted)] hover:bg-black/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--ink-accent)]"
              >
                <X className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>

            <ul className="mt-4 space-y-3">
              {addable.map((w, i) => {
                const newGroup = i === 0 || addable[i - 1].conditionName !== w.conditionName;
                return (
                <li key={w.id}>
                  {newGroup && (
                    <p className={`text-xs font-semibold uppercase tracking-wide text-[color:var(--ink-muted)] ${i === 0 ? "" : "mt-4"}`}>
                      {w.conditionName ?? "Sans condition"}
                    </p>
                  )}
                  <div className={`flex items-start justify-between gap-3 border-t border-[color:var(--hairline)] pt-3 ${newGroup ? "mt-2 border-t-0 pt-0" : ""}`}>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-semibold text-[color:var(--ink)]">{w.name}</p>
                        {w.editHref && (
                          <Link
                            href={w.editHref}
                            className="shrink-0 text-xs font-medium text-[color:var(--ink-accent)] underline underline-offset-2 hover:no-underline"
                          >
                            Modifier
                          </Link>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-[color:var(--ink-muted)]">
                        {w.stageLabel && `${w.stageLabel} · `}
                        {w.durationMinutes} min
                        {w.timesPerWeek ? ` · ${w.timesPerWeek}×/semaine` : ""}
                      </p>
                      {w.description && (
                        <p className="mt-1.5 text-sm text-[color:var(--ink-soft)]">{w.description}</p>
                      )}
                      {w.exerciseNames.length > 0 && (
                        <p className="mt-1.5 text-xs text-[color:var(--ink-muted)]">
                          {w.exerciseNames.join(" · ")}
                        </p>
                      )}
                    </div>
                    <form action={addAction} onSubmit={() => setOpen(false)}>
                      <input type="hidden" name="patient_id" value={patientId} />
                      <input type="hidden" name="workout_id" value={w.id} />
                      <button
                        type="submit"
                        className="shrink-0 rounded-full border border-[color:var(--ink-accent)]/30 px-3 py-1 text-xs font-medium text-[color:var(--ink-accent)] hover:bg-[color:var(--ink-accent)]/10"
                      >
                        Ajouter
                      </button>
                    </form>
                  </div>
                </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
