"use client";

import { useState } from "react";
import { ChevronDown, Target, ClipboardList, TrendingUp } from "lucide-react";
import RevealGroup, { RevealItem } from "@/components/RevealGroup";

const FEATURES = [
  {
    icon: Target,
    title: "Programmes sur mesure",
    body: "Votre situation et votre étape de récupération façonnent chaque séance.",
    details: [
      "Le programme est basé sur la condition et la phase choisies par votre kiné",
      "Il évolue automatiquement, étape par étape, au fil de votre récupération",
      "Vos retours (douleur, difficulté ressentie) peuvent ralentir ou accélérer la progression",
    ],
  },
  {
    icon: ClipboardList,
    title: "Séances guidées pas à pas",
    body: "Une démonstration vidéo et des consignes claires pour chaque exercice, un à la fois.",
    details: [
      "Chaque exercice s'affiche seul à l'écran, avec sa vidéo de démonstration",
      "Les consignes restent visibles pendant toute la durée de l'exercice",
      "Vous avancez à votre rythme, sans caméra ni capteur requis",
    ],
  },
  {
    icon: TrendingUp,
    title: "Progression partagée",
    body: "Vous et votre praticien suivez vos progrès, séance après séance.",
    details: [
      "Votre série de séances complétées est visible en un coup d'œil",
      "Votre kiné voit votre assiduité et vos retours entre deux rendez-vous",
      "Un signal de douleur ou de difficulté remonte à votre praticien",
    ],
  },
];

export default function FeaturesShowcase() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <RevealGroup className="divide-y divide-slate-100">
      {FEATURES.map((f, i) => {
        const open = openIndex === i;
        return (
          <RevealItem key={f.title} className="py-5 first:pt-0 last:pb-0">
            <button
              type="button"
              onClick={() => setOpenIndex(open ? null : i)}
              aria-expanded={open}
              className="flex w-full items-start justify-between gap-4 text-left"
            >
              <span className="flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                  <f.icon className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <span>
                  <span className="block font-display text-lg font-semibold text-slate-900">
                    {f.title}
                  </span>
                  <span className="mt-1 block text-sm leading-relaxed text-slate-600">{f.body}</span>
                </span>
              </span>
              <ChevronDown
                className={`mt-3.5 h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
                strokeWidth={2}
              />
            </button>

            {open && (
              <ul className="mt-4 space-y-2 border-t border-slate-100 pt-4 sm:pl-[60px]">
                {f.details.map((d) => (
                  <li key={d} className="flex items-start gap-2 text-sm leading-relaxed text-slate-600">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                    {d}
                  </li>
                ))}
              </ul>
            )}
          </RevealItem>
        );
      })}
    </RevealGroup>
  );
}
