"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { HandNote } from "@/components/HandDrawn";
import {
  KINE_FOLLOW_UP_CENTS,
  KINE_NET_CENTS,
  HIGHEST_MONTHLY_TOTAL_CENTS,
  HIGHEST_PLATFORM_CENTS,
  LOWEST_MONTHLY_TOTAL_CENTS,
  LOWEST_PLATFORM_CENTS,
  TRIAL_DAYS,
} from "@/lib/billing/patientPlans";
import { SIGNUPS_OPEN } from "@/lib/launchFlags";
import { intlTag } from "@/lib/i18n/translator";
import type { Locale } from "@/i18n/locales";

// « Et moi, comment je suis payé ? » — modèle définitif (Philippe, 2026-11-04 ;
// montants : lib/billing/patientPlans.ts). EasyPhysio est GRATUIT pour le kiné.
// Chaque patient paie 9,99 € par mois en deux parts distinctes : 3,99 €
// d'accès à la plateforme (à EasyPhysio) et 6,00 € de programme (au kiné,
// directement, seulement les mois où il le met à jour). Le kiné choisit un
// nombre de patients et voit ce qu'il touche. Même langage visuel qu'avant.

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

// Textes : messages/<langue>/home.json (home.plans).
export default function KinePlans() {
  const t = useTranslations("home.plans");
  const tag = intlTag(useLocale() as Locale);
  // fr-FR : identique à eurosFR de patientPlans.
  const euros = (cents: number) =>
    (cents / 100).toLocaleString(tag, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const [patients, setPatients] = useState<(typeof PATIENT_CHOICES)[number]>(10);
  const href = SIGNUPS_OPEN ? "/signup/kine" : "#liste-attente";

  return (
    <div className="mx-auto max-w-4xl text-left">
      <div className="grid gap-3 rounded-3xl border border-slate-200/70 bg-white/60 p-3 shadow-sm sm:grid-cols-[1.1fr_1fr]">
        {/* Le choix et le partage des 9,99 € */}
        <div className="flex flex-col justify-center gap-5 rounded-2xl bg-blue-50/60 p-6 max-sm:gap-4 max-sm:p-4 sm:short:gap-4 sm:short:p-5">
          <Choice label={t("patientsFollowed")} options={PATIENT_CHOICES} value={patients} onChange={setPatients} render={(n) => String(n)} />
          <div className="text-sm leading-snug text-slate-600">
            <p>
              {t("patientPays", {
                low: euros(LOWEST_MONTHLY_TOTAL_CENTS),
                high: euros(HIGHEST_MONTHLY_TOTAL_CENTS),
                trialDays: TRIAL_DAYS,
              })}
            </p>
            <ul className="mt-2 space-y-1">
              <li className="flex justify-between gap-3">
                <span>{t("kineShare")}</span>
                <span className="font-semibold tabular-nums text-slate-900">{t("amount", { value: euros(KINE_FOLLOW_UP_CENTS) })}</span>
              </li>
              <li className="flex justify-between gap-3">
                <span>{t("platformShare")}</span>
                <span className="font-semibold tabular-nums text-slate-900">{t("range", { low: euros(LOWEST_PLATFORM_CENTS), high: euros(HIGHEST_PLATFORM_CENTS) })}</span>
              </li>
            </ul>
            <p className="mt-2 text-xs text-slate-500">{t("feesNote")}</p>
          </div>
        </div>

        {/* Ce que le kiné touche */}
        <div className="relative flex flex-col justify-center rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm max-sm:p-4 sm:short:p-5">
          <HandNote direction="down" className="absolute -right-3 -top-7 rotate-3 max-lg:hidden">
            {t("handNote")}
          </HandNote>
          <p className="text-sm font-medium text-slate-500">{t("forYou")}</p>
          <p className="flex items-baseline gap-2">
            <span className="font-display text-5xl font-semibold tracking-tight tabular-nums text-slate-900 max-sm:text-4xl" aria-live="polite">
              {t("amount", { value: euros(KINE_NET_CENTS * patients) })}
            </span>
          </p>
          <p className="mt-2 text-sm text-slate-600">
            {t("calc", { patients, net: euros(KINE_NET_CENTS), fee: euros(KINE_FOLLOW_UP_CENTS) })}
          </p>
          <Link
            href={href}
            className="mt-5 inline-flex w-fit items-center gap-1.5 rounded-full bg-blue-600 px-6 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.97] sm:short:mt-4"
          >
            {SIGNUPS_OPEN ? t("createFreeAccount") : t("joinWaitlist")}
            <ArrowRight className="h-4 w-4" strokeWidth={2} />
          </Link>
          <p className="mt-3 text-xs text-slate-500">{t("footnote")}</p>
        </div>
      </div>
    </div>
  );
}
