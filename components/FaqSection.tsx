"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import RevealGroup, { RevealItem } from "@/components/RevealGroup";
import { PATIENT_PLANS, eurosFR, perMonthCents } from "@/lib/billing/patientPlans";
import { SIGNUPS_OPEN } from "@/lib/launchFlags";

// Formules patient (modèle du 2026-11-02) : lib/billing/patientPlans.ts.
const [P1, P3, P6] = PATIENT_PLANS;
const PLANS_TEXT = `${eurosFR(P1.priceCents)} € pour 1 mois, ${eurosFR(P3.priceCents)} € pour 3 mois ou ${eurosFR(P6.priceCents)} € pour 6 mois (soit ${eurosFR(perMonthCents(P6))} € par mois)`;
const KINE_SHARE_TEXT = `${eurosFR(P1.kineCents)} €, ${eurosFR(P3.kineCents)} € ou ${eurosFR(P6.kineCents)} €`;

const QUESTIONS = [
  {
    question: "Comment reprendre le sport sans risquer une rechute ?",
    answer:
      "Votre programme avance par étapes définies par votre kiné : on ne passe à la suivante que lorsque la précédente est acquise. Si vous signalez une douleur, votre kiné le voit et peut adapter le programme.",
  },
  {
    question: "Puis-je faire mes exercices seul(e), sans risque ?",
    answer:
      "Chaque exercice est montré par un dessin animé et des consignes écrites (les vidéos arrivent). Pendant la séance, un rappel vous dit de vous arrêter en cas de douleur vive. À la fin, vous notez votre douleur, et votre kiné la voit.",
  },
  {
    question: "Comment mon kiné peut-il me suivre à distance ?",
    answer:
      "Il voit votre assiduité, vos séances complétées et vos retours de douleur ou de difficulté au fil du temps, et ajuste votre programme entre deux rendez-vous en cabinet.",
  },
  {
    question: "Faut-il du matériel ou une caméra chez moi ?",
    answer:
      "Non, un téléphone suffit : les exercices se suivent à l'écran, avec le dessin et les consignes sous les yeux. Aucune caméra ni montre connectée. Si un exercice demande un objet (élastique, chaise), votre kiné le sait d'après ce que vous avez déclaré.",
  },
  {
    question: "Que deviennent mes données de santé ?",
    answer:
      "Elles servent uniquement à votre suivi : vos séances et vos ressentis sont visibles par vous et par votre praticien, jamais revendus ni utilisés à des fins publicitaires.",
  },
  {
    question: "Combien coûte l'application pour moi, patient ?",
    answer: `Vous choisissez une formule : ${PLANS_TEXT}. Elle se renouvelle automatiquement et vous pouvez la résilier à tout moment depuis l'appli. L'essentiel du paiement va à votre kiné. Acte non remboursé par l'Assurance Maladie.`,
  },
  {
    question: "Je suis kiné : combien ça me coûte, et combien ça me rapporte ?",
    answer: `Rien : EasyPhysio est gratuit pour vous, patients illimités. Vos patients paient leur formule (${PLANS_TEXT}) et vous recevez ${KINE_SHARE_TEXT}, frais de paiement déduits, directement sur votre compte. Avec 20 patients abonnés au mois, c'est ${eurosFR(20 * P1.kineCents)} € par mois pour vous.`,
  },
  {
    question: "Je suis praticien : comment essayer avec mes patients ?",
    // Avant le lancement (lib/launchFlags.ts), la première phrase annonce la
    // liste d'attente ; la suite décrit ce qui se passera à l'ouverture.
    answer:
      (SIGNUPS_OPEN ? "" : "EasyPhysio est en phase de test : inscrivez-vous sur la liste d'attente en bas de cette page, nous vous écrivons à l'ouverture. Ensuite, ") +
      (SIGNUPS_OPEN ? "Créez" : "créez") +
      " votre compte praticien (validé par notre équipe avant le premier accès), composez un premier programme depuis la bibliothèque d'exercices, connectez votre compte Stripe pour être payé directement par vos patients, puis invitez-les. Ils recevront leur accès sans rien installer d'autre que l'app sur leur téléphone.",
  },
];

export default function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

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
              className="flex w-full items-center justify-between gap-4 py-4 text-left phone-land:py-2.5"
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
