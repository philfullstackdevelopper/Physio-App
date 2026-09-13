"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import RevealGroup, { RevealItem } from "@/components/RevealGroup";

const QUESTIONS = [
  {
    question: "Comment reprendre le sport sans risquer une rechute ?",
    answer:
      "Votre programme avance par étapes définies par votre kiné : on ne passe à la suivante que lorsque la précédente est acquise. Rien n'est laissé au hasard ni à un algorithme seul.",
  },
  {
    question: "Puis-je faire mes exercices seul(e), sans risque ?",
    answer:
      "Chaque exercice est démontré en vidéo avec des consignes claires, et un rappel s'affiche à chaque séance : en cas de douleur vive, on s'arrête et on en parle à son kiné. Votre praticien reste informé de votre ressenti après chaque séance.",
  },
  {
    question: "Comment mon kiné peut-il me suivre à distance ?",
    answer:
      "Il voit votre assiduité, vos séances complétées et vos retours de douleur ou de difficulté au fil du temps, et ajuste votre programme entre deux rendez-vous en cabinet.",
  },
  {
    question: "Faut-il du matériel ou une caméra chez moi ?",
    answer:
      "Non. Un téléphone suffit. Les exercices se suivent à l'écran, avec la vidéo et les consignes sous les yeux, sans caméra, sans capteur, sans montre connectée.",
  },
  {
    question: "Que deviennent mes données de santé ?",
    answer:
      "Elles servent uniquement à votre suivi : vos séances et vos ressentis sont visibles par vous et par votre praticien, jamais revendus ni utilisés à des fins publicitaires.",
  },
  {
    question: "Combien coûte l'application pour moi, patient ?",
    answer:
      "Rien. EasyPhysio est gratuite pour les patients : c'est votre praticien qui l'utilise pour construire et suivre votre programme.",
  },
  {
    question: "Je suis praticien : comment essayer avec mes patients ?",
    answer:
      "Créez un compte praticien, composez un premier programme depuis la bibliothèque d'exercices, puis invitez vos patients. Ils recevront leur accès sans rien installer d'autre que l'app sur leur téléphone.",
  },
];

export default function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <RevealGroup className="divide-y divide-slate-100 rounded-2xl border border-slate-200/70 bg-white shadow-sm">
      {QUESTIONS.map((q, i) => {
        const open = openIndex === i;
        return (
          <RevealItem
            key={q.question}
            className={`px-6 transition-colors first:rounded-t-2xl last:rounded-b-2xl ${
              open ? "bg-blue-50/50" : "hover:bg-slate-50"
            }`}
          >
            <button
              type="button"
              onClick={() => setOpenIndex(open ? null : i)}
              aria-expanded={open}
              className="flex w-full items-center justify-between gap-4 py-4 text-left"
            >
              <span className={`text-sm font-medium transition-colors ${open ? "text-blue-700" : "text-slate-700"}`}>
                {q.question}
              </span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 transition-[transform,color] duration-300 ease-out ${
                  open ? "rotate-180 text-blue-600" : "text-slate-400"
                }`}
                strokeWidth={2}
              />
            </button>
            {/* Hauteur animée en CSS pur via grid-template-rows 0fr → 1fr : pas
                besoin de mesurer le contenu en JS, et ça s'anime même quand la
                réponse fait plusieurs lignes (Philippe, 2026-09-13 : reprendre
                la façon dont les questions "s'ouvrent" façon RoadToOffer —
                l'ancienne version affichait/masquait la réponse d'un coup). */}
            <div
              className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
                open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              }`}
            >
              <div className="overflow-hidden">
                <p className="pb-5 pr-8 text-sm leading-relaxed text-slate-600">{q.answer}</p>
              </div>
            </div>
          </RevealItem>
        );
      })}
    </RevealGroup>
  );
}
