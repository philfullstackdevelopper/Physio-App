"use client";

import { useState } from "react";
import { Bone, Activity, PersonStanding, Footprints, HeartPulse, Dumbbell } from "lucide-react";
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
  const active = openIndex !== null ? CONDITIONS[openIndex] : null;

  return (
    <>
      {/* A flowing tag row instead of a 6-box grid: each pill takes only the
          width its own label needs, so the row reads as a natural set of
          choices rather than six identically-sized cards. One shared panel
          below shows whichever category is selected, instead of six
          independent accordions stacked on the page. */}
      <RevealGroup className="mt-10 flex flex-wrap gap-2.5">
        {CONDITIONS.map((c, i) => {
          const open = openIndex === i;
          return (
            <RevealItem key={c.label} as="span">
              <button
                type="button"
                onClick={() => setOpenIndex(open ? null : i)}
                aria-expanded={open}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
                  open
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:border-blue-200"
                }`}
              >
                <c.icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                {c.label}
              </button>
            </RevealItem>
          );
        })}
      </RevealGroup>

      {active && (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-sm font-semibold text-slate-900">{active.label}</p>
          <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-1.5">
            {active.examples.map((ex) => (
              <li key={ex} className="flex items-center gap-2 text-sm text-slate-600">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                {ex}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-6 text-center text-xs text-slate-400">
        Exemples indicatifs. Le programme exact est toujours défini par votre kinésithérapeute.
      </p>
    </>
  );
}
