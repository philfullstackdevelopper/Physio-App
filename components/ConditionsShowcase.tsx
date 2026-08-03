"use client";

import { useState } from "react";
import {
  X,
  Bone,
  Activity,
  PersonStanding,
  Footprints,
  HeartPulse,
  Dumbbell,
} from "lucide-react";

// Examples only, not an exhaustive or certified list — the kiné always defines
// the actual program for a given patient.
const CONDITIONS = [
  {
    icon: Bone,
    label: "Dos & lombaires",
    examples: ["Lombalgie chronique", "Hernie discale", "Sciatique"],
  },
  {
    icon: Activity,
    label: "Genou & ligaments",
    examples: ["Rupture du ligament croisé", "Entorse du genou", "Prothèse du genou"],
  },
  {
    icon: PersonStanding,
    label: "Épaule",
    examples: ["Tendinite de la coiffe des rotateurs", "Luxation", "Capsulite"],
  },
  {
    icon: Footprints,
    label: "Cheville & pied",
    examples: ["Entorse de cheville", "Tendinopathie d'Achille", "Fracture consolidée"],
  },
  {
    icon: HeartPulse,
    label: "Suites post-opératoires",
    examples: ["Prothèse de hanche", "Ligamentoplastie", "Chirurgie du dos"],
  },
  {
    icon: Dumbbell,
    label: "Renforcement général",
    examples: ["Reprise sportive", "Prévention des blessures", "Renforcement musculaire"],
  },
];

export default function ConditionsShowcase() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const open = openIndex !== null ? CONDITIONS[openIndex] : null;

  return (
    <>
      <div className="mx-auto mt-10 grid max-w-4xl grid-cols-2 gap-4 sm:grid-cols-3">
        {CONDITIONS.map((c, i) => (
          <button
            key={c.label}
            type="button"
            onClick={() => setOpenIndex(i)}
            className="flex flex-col items-center gap-2.5 rounded-2xl border border-slate-100 bg-white/70 px-4 py-6 text-center shadow-sm backdrop-blur transition hover:-translate-y-1 hover:shadow-md"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
              <c.icon className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <span className="text-sm font-medium text-slate-700">{c.label}</span>
          </button>
        ))}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          onClick={() => setOpenIndex(null)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                <open.icon className="h-5 w-5" strokeWidth={1.75} />
              </span>
              <button
                type="button"
                onClick={() => setOpenIndex(null)}
                aria-label="Fermer"
                className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <h3 className="font-display mt-3 text-xl font-semibold text-slate-900">{open.label}</h3>
            <p className="mt-1 text-sm text-slate-500">Exemples de situations concernées :</p>
            <ul className="mt-3 space-y-1.5">
              {open.examples.map((ex) => (
                <li key={ex} className="flex items-center gap-2 text-sm text-slate-700">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-teal-500" />
                  {ex}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-slate-400">
              Le programme exact est toujours défini par votre kinésithérapeute.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
