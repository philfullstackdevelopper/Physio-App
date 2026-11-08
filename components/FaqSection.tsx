"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";
import RevealGroup, { RevealItem } from "@/components/RevealGroup";
import {
  HIGHEST_PLATFORM_CENTS,
  LOWEST_PLATFORM_CENTS,
  KINE_FOLLOW_UP_CENTS,
  PLATFORM_OFFERS,
  TRIAL_DAYS,
  monthlyTotalCents,
} from "@/lib/billing/patientPlans";
import { SIGNUPS_OPEN } from "@/lib/launchFlags";
import { intlTag } from "@/lib/i18n/translator";
import type { Locale } from "@/i18n/locales";

// Modèle définitif (2026-11-04) : lib/billing/patientPlans.ts.
// Audit du 2026-11-06 (Philippe : on allège) : question « Je suis kiné : combien
// ça me coûte… » retirée (le bloc Tarifs de l'accueil y répond), plus de
// « validé par notre équipe » (validation automatique depuis le 2026-11-02) ni
// de « les vidéos arrivent » (les exercices proposés sont filmés).
// Questions et réponses : messages/<langue>/home.json (home.faq.q1…q7).
function useQuestions() {
  const t = useTranslations("home.faq");
  const tag = intlTag(useLocale() as Locale);
  // fr-FR : identique à eurosFR de patientPlans.
  const euros = (cents: number) =>
    (cents / 100).toLocaleString(tag, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  // Même phrase que offersSummaryFR (lib/billing/patientPlans.ts), dans la langue choisie.
  const parts = PLATFORM_OFFERS.map((o, i) => {
    const total = euros(monthlyTotalCents(o));
    if (!o.commitmentMonths) return t("offerNoCommitment", { total });
    return i === 1
      ? t("offerCommitmentFirst", { total, months: o.commitmentMonths })
      : t("offerCommitment", { total, months: o.commitmentMonths });
  });
  const offers = t("offersJoin", { head: parts.slice(0, -1).join(", "), last: parts[parts.length - 1] });
  return [
    { question: t("q1"), answer: t("a1") },
    { question: t("q2"), answer: t("a2") },
    { question: t("q3"), answer: t("a3") },
    { question: t("q4"), answer: t("a4") },
    { question: t("q5"), answer: t("a5") },
    {
      question: t("q6"),
      answer: t("a6", {
        trialDays: TRIAL_DAYS,
        offers,
        low: euros(LOWEST_PLATFORM_CENTS),
        high: euros(HIGHEST_PLATFORM_CENTS),
        kine: euros(KINE_FOLLOW_UP_CENTS),
      }),
    },
    {
      question: t("q7"),
      // Avant le lancement (lib/launchFlags.ts), la première phrase annonce la
      // liste d'attente ; la suite décrit ce qui se passera à l'ouverture.
      answer: SIGNUPS_OPEN ? t("a7Open") : t("a7Waitlist"),
    },
  ];
}

export default function FaqSection() {
  const QUESTIONS = useQuestions();
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
