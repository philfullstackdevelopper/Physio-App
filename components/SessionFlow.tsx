"use client";

// =============================================================================
// SessionFlow — orchestrates the patient journey on the page.
//   Step 1: intake (patient enters their profile).
//   Step 2: session (targets pre-filled from the profile; physio can adjust).
// =============================================================================

import { useState } from "react";
import PatientIntake from "@/components/PatientIntake";
import PoseTracker from "@/components/PoseTracker";
import {
  DEFAULT_SQUAT,
  recommendPrescription,
  type PatientContext,
  type Prescription,
} from "@/lib/exercise/prescription";

export default function SessionFlow() {
  const [step, setStep] = useState<"intake" | "session">("intake");
  const [ctx, setCtx] = useState<PatientContext | null>(null);
  const [prescription, setPrescription] = useState<Prescription>(DEFAULT_SQUAT);

  if (step === "intake") {
    return (
      <PatientIntake
        initial={ctx ?? undefined}
        onSubmit={(c) => {
          setCtx(c);
          setPrescription(recommendPrescription(c)); // auto-tailor from profile
          setStep("session");
        }}
      />
    );
  }

  const patch = (p: Partial<Prescription>) => setPrescription((prev) => ({ ...prev, ...p }));
  const activityLabel = { sedentary: "Sédentaire", moderate: "Modérée", active: "Active" }[
    ctx?.activityLevel ?? "moderate"
  ];

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5">
      {/* Profile summary + edit */}
      <div className="flex items-center justify-between rounded-lg bg-slate-100 px-4 py-2.5 text-sm text-slate-600">
        <span>
          {ctx?.ageYears} ans · {ctx?.heightCm} cm · {ctx?.weightKg} kg · {activityLabel}
        </span>
        <button onClick={() => setStep("intake")} className="font-medium text-teal-700 hover:underline">
          Modifier
        </button>
      </div>

      {/* Physio can still fine-tune the auto-generated targets */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Objectifs (réglables par le kiné)</h2>
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
