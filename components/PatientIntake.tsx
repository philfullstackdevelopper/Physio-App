"use client";

// =============================================================================
// PatientIntake — first screen the patient sees.
// -----------------------------------------------------------------------------
// Collects the profile used to tailor the exercise session. On submit it hands
// a `PatientContext` back to the parent, which derives the prescription.
// (In the real app this would also persist to `patient_profiles`.)
// =============================================================================

import { useState } from "react";
import type { ActivityLevel, PatientContext } from "@/lib/exercise/prescription";

export default function PatientIntake({
  onSubmit,
  initial,
}: {
  onSubmit: (ctx: PatientContext) => void;
  initial?: PatientContext;
}) {
  const [ageYears, setAge] = useState(initial?.ageYears ?? 45);
  const [heightCm, setHeight] = useState(initial?.heightCm ?? 175);
  const [weightKg, setWeight] = useState(initial?.weightKg ?? 70);
  const [activityLevel, setActivity] = useState<ActivityLevel>(
    initial?.activityLevel ?? "moderate",
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ ageYears, heightCm, weightKg, activityLevel });
      }}
      className="mx-auto flex max-w-md flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div>
        <h2 className="text-lg font-medium text-slate-900">Avant de commencer</h2>
        <p className="mt-1 text-sm text-slate-500">
          Ces informations nous permettent d&apos;adapter votre séance.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <label className="text-sm text-slate-600">
          Âge
          <input
            type="number" min={5} max={100} required
            value={ageYears}
            onChange={(e) => setAge(Number(e.target.value))}
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-slate-900 focus:border-teal-600 focus:outline-none"
          />
        </label>
        <label className="text-sm text-slate-600">
          Taille (cm)
          <input
            type="number" min={100} max={230} required
            value={heightCm}
            onChange={(e) => setHeight(Number(e.target.value))}
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-slate-900 focus:border-teal-600 focus:outline-none"
          />
        </label>
        <label className="text-sm text-slate-600">
          Poids (kg)
          <input
            type="number" min={20} max={250} required
            value={weightKg}
            onChange={(e) => setWeight(Number(e.target.value))}
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-slate-900 focus:border-teal-600 focus:outline-none"
          />
        </label>
      </div>

      <label className="text-sm text-slate-600">
        Niveau d&apos;activité physique
        <select
          value={activityLevel}
          onChange={(e) => setActivity(e.target.value as ActivityLevel)}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
        >
          <option value="sedentary">Sédentaire (peu ou pas de sport)</option>
          <option value="moderate">Modérée (activité régulière)</option>
          <option value="active">Active (sport fréquent)</option>
        </select>
      </label>

      <button
        type="submit"
        className="mt-1 rounded-md bg-teal-600 px-4 py-2.5 font-medium text-white hover:bg-teal-700"
      >
        Commencer ma séance
      </button>
    </form>
  );
}
