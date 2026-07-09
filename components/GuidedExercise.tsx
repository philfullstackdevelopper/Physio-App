"use client";

// =============================================================================
// GuidedExercise — the logged-in patient's session (no intake here; the profile
// was captured once at onboarding). Targets arrive pre-tailored and remain
// adjustable, then drive the live pose analysis.
// =============================================================================

import { useState } from "react";
import PoseTracker from "@/components/PoseTracker";
import type { Prescription } from "@/lib/exercise/prescription";

export default function GuidedExercise({ initial }: { initial: Prescription }) {
  const [prescription, setPrescription] = useState<Prescription>(initial);
  const patch = (p: Partial<Prescription>) => setPrescription((prev) => ({ ...prev, ...p }));

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5">
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Objectifs de la séance</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Générés à partir de votre profil. Votre kinésithérapeute peut les ajuster.
        </p>
        <div className="mt-3 grid grid-cols-3 gap-3">
          <label className="text-sm text-slate-600">
            Séries
            <input
              type="number" min={1} max={10}
              value={prescription.goalSets}
              onChange={(e) => patch({ goalSets: Number(e.target.value) })}
              className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-slate-900"
            />
          </label>
          <label className="text-sm text-slate-600">
            Reps / série
            <input
              type="number" min={1} max={50}
              value={prescription.goalReps}
              onChange={(e) => patch({ goalReps: Number(e.target.value) })}
              className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-slate-900"
            />
          </label>
          <label className="text-sm text-slate-600">
            Profondeur (≤ °)
            <input
              type="number" min={40} max={140}
              value={prescription.goodDepth}
              onChange={(e) => patch({ goodDepth: Number(e.target.value) })}
              className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-slate-900"
            />
          </label>
        </div>
      </section>

      <PoseTracker
        prescription={prescription}
        onComplete={(done) => console.log(`Séance terminée : ${done} répétitions`)}
      />
    </div>
  );
}
