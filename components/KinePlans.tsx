"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { HandNote } from "@/components/HandDrawn";
import {
  CABINET_SHARES,
  FOUNDER_OFFER_UNTIL_LABEL,
  FREE_FIRST_MONTH,
  KINE_PLANS,
  KINE_SUBSCRIPTION_TTC_CENTS,
  eurosFR,
  subscriptionPrice,
  type PlanMonths,
} from "@/lib/billing/reviewModel";
import { SIGNUPS_OPEN } from "@/lib/launchFlags";

// Formules d'abonnement du kiné (Philippe, 2026-11-01). Après trois essais,
// retenu : « un seul prix qui s'ajuste » — le kiné choisit la durée payée
// d'avance et le nombre de kinés du cabinet, un seul prix change sous ses
// yeux. Pas de cartes répétées ni de liste de coches (règles « anti-slop » de
// taste-skill), et le langage visuel de la section « Et moi, comment je suis
// payé ? » juste au-dessus (panneau bleu pâle + panneau blanc, boutons
// pilule gris/blanc, une seule note manuscrite). Montants :
// lib/billing/reviewModel.ts. Avant le lancement, le bouton mène à la liste
// d'attente ; après, à l'inscription avec la formule dans l'adresse.

const euros = (cents: number) => eurosFR(cents);
const KINE_CHOICES = [1, 2, 3, 4, 5] as const;
// Remises cabinet, tirées de CABINET_SHARES (2e kiné, puis 3e et suivants).
const CABINET_OFF_2 = Math.round((1 - CABINET_SHARES[1]) * 100);
const CABINET_OFF_3 = Math.round((1 - CABINET_SHARES[CABINET_SHARES.length - 1]) * 100);

function Choice<T extends number>({
  label,
  options,
  value,
  onChange,
  render,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  render: (v: T) => string;
}) {
  return (
    <div>
      <p className="text-sm text-slate-600">{label}</p>
      <div className="mt-2 flex w-fit rounded-full bg-slate-100 p-1" role="group" aria-label={label}>
        {options.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => onChange(o)}
            aria-pressed={value === o}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition max-sm:px-2.5 ${
              value === o ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {render(o)}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function KinePlans() {
  const [months, setMonths] = useState<PlanMonths>(6);
  const [kines, setKines] = useState<(typeof KINE_CHOICES)[number]>(1);
  const p = subscriptionPrice(months, kines);
  const full = KINE_SUBSCRIPTION_TTC_CENTS * months * kines;
  const off = Math.round((p.savingCents / full) * 100);
  const href = SIGNUPS_OPEN ? `/signup/kine?formule=${months}${kines > 1 ? `&kines=${kines}` : ""}` : "#liste-attente";

  return (
    <div className="mx-auto max-w-4xl text-left">
      <div className="grid gap-3 rounded-3xl border border-slate-200/70 bg-white/60 p-3 shadow-sm sm:grid-cols-[1.1fr_1fr]">
        {/* Les deux choix */}
        <div className="flex flex-col justify-center gap-5 rounded-2xl bg-blue-50/60 p-6 max-sm:gap-4 max-sm:p-4 sm:short:gap-4 sm:short:p-5">
          <Choice
            label="Payé d'avance pour"
            options={KINE_PLANS.map((pl) => pl.months)}
            value={months}
            onChange={setMonths}
            render={(m) => `${m} mois`}
          />
          <Choice
            label="Kinés au cabinet"
            options={KINE_CHOICES}
            value={kines}
            onChange={setKines}
            render={(k) => (k === 5 ? "5 et +" : String(k))}
          />
          <p className="text-sm leading-snug text-slate-600">
            Au cabinet, le 2<sup>e</sup> kiné paie {CABINET_OFF_2}&nbsp;% de moins, les
            suivants {CABINET_OFF_3}&nbsp;% ; une seule facture, chacun ses patients.
          </p>
        </div>

        {/* Le prix qui en découle */}
        <div className="relative flex flex-col justify-center rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm max-sm:p-4 sm:short:p-5">
          <HandNote direction="down" className="absolute -right-3 -top-7 rotate-3 max-lg:hidden">
            jouez avec la durée
          </HandNote>
          <p className="flex items-baseline gap-2">
            <span className="font-display text-5xl font-semibold tracking-tight tabular-nums text-slate-900 max-sm:text-4xl" aria-live="polite">
              {euros(p.perKinePerMonthCents)}&nbsp;€
            </span>
            <span className="text-sm text-slate-500">TTC par mois{kines > 1 ? " et par kiné" : ""}</span>
          </p>
          <p className="mt-2 min-h-[3.75rem] text-sm text-slate-600">
            {months === 1 && kines === 1 ? (
              "Sans engagement, arrêt à tout moment."
            ) : (
              <>
                {p.founder && p.regularTtcCents !== null && (
                  <span className="mr-1.5 text-slate-400 line-through">{euros(p.regularTtcCents)}&nbsp;€</span>
                )}
                {euros(p.ttcCents)}&nbsp;€ {months === 1 ? "par mois" : `pour ${months} mois`}
                {kines > 1 ? `, ${kines} kinés` : ""}.
                {p.founder && (
                  <span className="block font-medium text-blue-700">Offre fondateur, jusqu&apos;au {FOUNDER_OFFER_UNTIL_LABEL}</span>
                )}
                {off > 0 && (
                  <span className="block font-medium text-emerald-700">
                    {euros(p.savingCents)}&nbsp;€ économisés, soit −{off}&nbsp;%
                  </span>
                )}
              </>
            )}
          </p>
          <Link
            href={href}
            className="mt-5 inline-flex w-fit items-center gap-1.5 rounded-full bg-blue-600 px-6 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.97] sm:short:mt-4"
          >
            {SIGNUPS_OPEN ? "Choisir cette formule" : "Rejoindre la liste d'attente"}
            <ArrowRight className="h-4 w-4" strokeWidth={2} />
          </Link>
          <p className="mt-3 text-xs text-slate-500">
            {FREE_FIRST_MONTH && months === 1 ? "Premier mois offert. " : ""}Patients illimités, rien de prélevé sur vos honoraires.
          </p>
        </div>
      </div>
    </div>
  );
}
