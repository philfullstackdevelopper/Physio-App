"use client";

import { useState } from "react";
import { X, Target, Video, TrendingUp } from "lucide-react";

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
    icon: Video,
    title: "Correction par caméra",
    body: "L'IA compte vos répétitions et corrige votre posture en temps réel.",
    details: [
      "Fonctionne directement dans votre navigateur, via la caméra de votre appareil",
      "Compte vos répétitions et vous alerte si votre posture dévie",
      "Réservé aux exercices adaptés à ce suivi — les autres restent guidés à l'audio",
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
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const open = openIndex !== null ? FEATURES[openIndex] : null;

  return (
    <>
      <div className="mx-auto mt-24 grid max-w-5xl gap-6 pb-24 sm:grid-cols-3">
        {FEATURES.map((f, i) => (
          <button
            key={f.title}
            type="button"
            onClick={() => setOpenIndex(i)}
            className="rounded-2xl border border-slate-100 bg-white/70 p-6 text-left shadow-sm backdrop-blur transition hover:-translate-y-1 hover:shadow-md"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
              <f.icon className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <h3 className="mt-3 font-semibold text-slate-900">{f.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{f.body}</p>
            <span className="mt-3 inline-block text-sm font-medium text-teal-700">
              En savoir plus →
            </span>
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
            <h3 className="font-display mt-3 text-xl font-semibold text-slate-900">{open.title}</h3>
            <ul className="mt-3 space-y-2">
              {open.details.map((d) => (
                <li key={d} className="flex items-start gap-2 text-sm leading-relaxed text-slate-700">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-500" />
                  {d}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
