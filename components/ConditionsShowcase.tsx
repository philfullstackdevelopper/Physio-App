"use client";

import { useState } from "react";
import {
  ChevronDown,
  Bone,
  Activity,
  PersonStanding,
  Footprints,
  HeartPulse,
  Dumbbell,
} from "lucide-react";
import RevealGroup, { RevealItem } from "@/components/RevealGroup";

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

  return (
    <>
      <RevealGroup className="mx-auto mt-10 grid max-w-4xl items-start gap-4 sm:grid-cols-3">
        {CONDITIONS.map((c, i) => {
          const open = openIndex === i;
          return (
            <RevealItem
              key={c.label}
              className={`flex flex-col rounded-2xl border bg-white p-5 text-left shadow-sm transition ${
                open ? "border-blue-200" : "border-slate-100 hover:border-blue-100"
              }`}
            >
              <button
                type="button"
                onClick={() => setOpenIndex(open ? null : i)}
                aria-expanded={open}
                className="flex items-center gap-2.5"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                  <c.icon className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <span className="flex-1 text-sm font-medium text-slate-700">{c.label}</span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
                  strokeWidth={2}
                />
              </button>
              {open && (
                <ul className="mt-3 space-y-1.5 border-t border-slate-100 pt-3">
                  {c.examples.map((ex) => (
                    <li key={ex} className="flex items-center gap-2 text-sm text-slate-600">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                      {ex}
                    </li>
                  ))}
                </ul>
              )}
            </RevealItem>
          );
        })}
      </RevealGroup>
      <p className="mt-6 text-center text-xs text-slate-400">
        Exemples indicatifs. Le programme exact est toujours défini par votre kinésithérapeute.
      </p>
    </>
  );
}
