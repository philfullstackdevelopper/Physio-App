"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { HandNote } from "@/components/HandDrawn";
import { PATIENT_PLANS, eurosFR, perMonthCents, type PatientPlanKey } from "@/lib/billing/patientPlans";
import { SIGNUPS_OPEN } from "@/lib/launchFlags";

// Formules (modèle du 2026-11-02, Philippe) : EasyPhysio est GRATUIT pour le
// kiné ; ses patients paient une formule 1 / 3 / 6 mois, dont la plus grande
// part lui revient (6,99 € sur 9,99 €…). Même langage visuel qu'avant
// (panneau bleu pâle + panneau blanc, boutons pilule, une note manuscrite) :
// le kiné choisit une formule et un nombre de patients abonnés, et voit ce
// qu'il touche par mois. Montants : lib/billing/patientPlans.ts.

const PATIENT_CHOICES = [5, 10, 20, 40] as const;

function Choice<T extends string | number>({
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
  const [planKey, setPlanKey] = useState<PatientPlanKey>("plan_1m");
  const [patients, setPatients] = useState<(typeof PATIENT_CHOICES)[number]>(10);
  const plan = PATIENT_PLANS.find((p) => p.key === planKey)!;
  const kinePerMonth = Math.round(plan.kineCents / plan.months);
  const href = SIGNUPS_OPEN ? "/signup/kine" : "#liste-attente";

  return (
    <div className="mx-auto max-w-4xl text-left">
      <div className="grid gap-3 rounded-3xl border border-slate-200/70 bg-white/60 p-3 shadow-sm sm:grid-cols-[1.1fr_1fr]">
        {/* Les choix */}
        <div className="flex flex-col justify-center gap-5 rounded-2xl bg-blue-50/60 p-6 max-sm:gap-4 max-sm:p-4 sm:short:gap-4 sm:short:p-5">
          <Choice
            label="Formule choisie par le patient"
            options={PATIENT_PLANS.map((p) => p.key)}
            value={planKey}
            onChange={setPlanKey}
            render={(k) => PATIENT_PLANS.find((p) => p.key === k)!.label}
          />
          <Choice label="Patients abonnés" options={PATIENT_CHOICES} value={patients} onChange={setPatients} render={(n) => String(n)} />
          <p className="text-sm leading-snug text-slate-600">
            Le patient paie {eurosFR(plan.priceCents)}&nbsp;€{plan.months > 1 ? ` pour ${plan.months} mois (${eurosFR(perMonthCents(plan))} € par mois)` : " par mois"},
            renouvelé automatiquement et résiliable à tout moment. Vous recevez {eurosFR(plan.kineCents)}&nbsp;€, frais de paiement déduits.
          </p>
        </div>

        {/* Ce que le kiné touche */}
        <div className="relative flex flex-col justify-center rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm max-sm:p-4 sm:short:p-5">
          <HandNote direction="down" className="absolute -right-3 -top-7 rotate-3 max-lg:hidden">
            et l&apos;appli est gratuite
          </HandNote>
          <p className="text-sm font-medium text-slate-500">Pour vous, chaque mois</p>
          <p className="flex items-baseline gap-2">
            <span className="font-display text-5xl font-semibold tracking-tight tabular-nums text-slate-900 max-sm:text-4xl" aria-live="polite">
              {eurosFR(kinePerMonth * patients)}&nbsp;€
            </span>
          </p>
          <p className="mt-2 text-sm text-slate-600">
            {patients} patients × {eurosFR(kinePerMonth)}&nbsp;€ par mois. EasyPhysio&nbsp;: 0&nbsp;€ pour vous, patients illimités.
          </p>
          <Link
            href={href}
            className="mt-5 inline-flex w-fit items-center gap-1.5 rounded-full bg-blue-600 px-6 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.97] sm:short:mt-4"
          >
            {SIGNUPS_OPEN ? "Créer mon compte gratuit" : "Rejoindre la liste d'attente"}
            <ArrowRight className="h-4 w-4" strokeWidth={2} />
          </Link>
          <p className="mt-3 text-xs text-slate-500">Vous pouvez aussi offrir l&apos;accès à vos patients : rien à payer pour personne.</p>
        </div>
      </div>
    </div>
  );
}
