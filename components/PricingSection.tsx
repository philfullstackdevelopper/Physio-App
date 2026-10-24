"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Info } from "lucide-react";
import { HandNote, Underlined } from "@/components/HandDrawn";
import RevealGroup, { RevealItem } from "@/components/RevealGroup";
import { estimateStripeFeeCents } from "@/lib/billing/platformFee";
import {
  FREE_FIRST_MONTH,
  KINE_FEE_PER_ACTIVE_PATIENT_CENTS,
  KINE_FEE_PER_ACTIVE_PATIENT_TTC_CENTS,
  PATIENT_APP_ONLY_MONTHLY_CENTS,
  RECOMMENDED_REVIEW_PRICE_CENTS,
  REVIEW_PRICE_MAX_CENTS,
  REVIEW_PRICE_MIN_CENTS,
  eurosFR,
} from "@/lib/billing/reviewModel";
import { SIGNUPS_OPEN } from "@/lib/launchFlags";

// Section "Tarifs" de la landing, avec un choix "Côté kiné" / "Côté patient"
// (Philippe, 2026-09-13 : chacun ne se reconnaît que dans son propre prix).
//
// Réécrite pour le nouveau modèle (Philippe, 2026-10-24) — deux flux séparés :
// le patient paie son kiné pour chaque bilan de suivi mensuel fait (100 % pour
// le kiné), et le kiné paie EasyPhysio un forfait par patient actif. Les
// montants viennent tous de lib/billing/reviewModel.ts. Ne jamais parler de
// « commission » ni d'« abonnement » côté kiné : c'est la séparation des deux
// paiements qui rend le modèle conforme au code de déontologie.

const euros = (cents: number) => eurosFR(cents);
const eurosRound = (cents: number) => eurosFR(cents, 0);
const REVIEW_PRICE = eurosRound(RECOMMENDED_REVIEW_PRICE_CENTS);
const KINE_FEE_HT = eurosRound(KINE_FEE_PER_ACTIVE_PATIENT_CENTS);

// Deux façons d'utiliser EasyPhysio côté patient (Philippe, 2026-10-24) :
// le suivi mensuel avec son kiné (payé au kiné), ou l'accès seul à l'appli
// (payé à EasyPhysio). La 2e offre reste « bien-être » : jamais de programme
// construit d'après une pathologie (voir lib/billing/reviewModel.ts).
const FOLLOW_UP_POINTS = [
  "Une fois par mois, votre kiné regarde vos séances et vos douleurs, ajuste votre programme et vous écrit",
  "Prélevé seulement le mois où le bilan est fait",
  "Carte enregistrée une seule fois, arrêt à tout moment",
  "Pendant vos soins au cabinet, l'appli vous est offerte par votre kiné",
];

const APP_ONLY_POINTS = [
  "Toute la bibliothèque d'exercices, dessinés et animés",
  "Vos propres séances, composées et enregistrées",
  "Le planning et l'historique de vos séances",
  "Continuer le programme laissé par votre kiné",
];

function PatientOffers() {
  return (
    <div className="mx-auto max-w-3xl">
      <RevealGroup className="grid gap-4 sm:grid-cols-2">
        <RevealItem className="relative rounded-2xl bg-blue-600 p-6 text-white shadow-lg shadow-blue-900/20 ring-1 ring-blue-700 max-sm:p-5 sm:short:p-5">
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-slate-900 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
            Avec votre kiné
          </span>
          <p className="text-sm font-medium text-blue-50">Suivi mensuel par votre kiné</p>
          <p className="mt-3 flex items-baseline gap-1.5 sm:short:mt-2">
            <span className="text-xs text-blue-100">environ</span>
            <span className="font-display text-3xl font-semibold tracking-tight text-white">{REVIEW_PRICE}&nbsp;€</span>
            <span className="text-xs text-blue-100">par bilan</span>
          </p>
          <p className="mt-1 text-xs text-blue-100">Tarif fixé par votre kiné, payé à votre kiné. Non remboursé.</p>
          <ul className="mt-5 space-y-2 border-t border-blue-500 pt-5 text-sm text-blue-50 sm:short:mt-3 sm:short:space-y-1.5 sm:short:pt-3">
            {FOLLOW_UP_POINTS.map((point) => (
              <li key={point} className="flex items-start gap-2">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white" strokeWidth={2.5} />
                {point}
              </li>
            ))}
          </ul>
        </RevealItem>
        <RevealItem className="relative rounded-2xl border border-slate-200/70 bg-white/70 p-6 max-sm:p-5 sm:short:p-5">
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-slate-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-600 ring-1 ring-slate-200">
            En autonomie
          </span>
          <p className="text-sm font-medium text-slate-500">L&apos;appli seule</p>
          <p className="mt-3 flex items-baseline gap-1.5 sm:short:mt-2">
            <span className="font-display text-3xl font-semibold tracking-tight text-slate-900">
              {euros(PATIENT_APP_ONLY_MONTHLY_CENTS)}&nbsp;€
            </span>
            <span className="text-xs text-slate-500">/mois</span>
          </p>
          <p className="mt-1 text-xs text-slate-500">Sans suivi par un kiné, payé à EasyPhysio. Sans engagement.</p>
          <ul className="mt-5 space-y-2 border-t border-slate-100 pt-5 text-sm text-slate-600 sm:short:mt-3 sm:short:space-y-1.5 sm:short:pt-3">
            {APP_ONLY_POINTS.map((point) => (
              <li key={point} className="flex items-start gap-2">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600" strokeWidth={2.5} />
                {point}
              </li>
            ))}
          </ul>
        </RevealItem>
      </RevealGroup>
      <p className="mt-6 text-center text-xs text-slate-400 sm:short:mt-4">
        Le suivi est payé directement à votre kiné&nbsp;: EasyPhysio ne prend rien sur ce paiement.
      </p>
      <div className="mt-6 flex justify-center sm:short:mt-2">
        <Link
          href="/login"
          className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 underline-offset-4 transition hover:text-blue-700 hover:underline"
        >
          Me connecter
          <ArrowRight className="h-4 w-4" strokeWidth={2} />
        </Link>
      </div>
    </div>
  );
}

// Côté kiné : à gauche, comment l'argent circule en trois étapes ; à droite,
// un simulateur (patients actifs, patients en suivi mensuel, tarif du bilan).
const KINE_STEPS = [
  {
    title: "Vous fixez votre tarif de suivi",
    body: `Chaque mois, vous regardez les séances et les douleurs du patient, ajustez son programme et lui écrivez. Tarif conseillé : ${REVIEW_PRICE} € le bilan.`,
  },
  {
    title: "Votre patient vous paie directement",
    body: "Il accepte votre tarif une fois. Il n'est prélevé que le mois où vous faites le bilan, et la note d'honoraires part toute seule.",
  },
  {
    title: "Vous payez EasyPhysio à part",
    body: `${KINE_FEE_HT} € HT par patient actif et par mois, en une seule facture.${FREE_FIRST_MONTH ? " Premier mois offert." : ""}`,
  },
];

const SIM_ACTIVE_MAX = 50;

function Slider({
  id,
  label,
  value,
  display,
  min,
  max,
  step = 1,
  onChange,
  valueText,
}: {
  id: string;
  label: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  valueText: string;
}) {
  const fill = max > min ? ((value - min) / (max - min)) * 100 : 0;
  return (
    <div className="mt-3 sm:short:mt-2">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm text-slate-600">
          {label}
        </label>
        <span className="text-xl font-semibold tabular-nums text-blue-600">{display}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-valuetext={valueText}
        style={{ background: `linear-gradient(to right, #155dfc ${fill}%, #e2e8f0 ${fill}%)` }}
        className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full accent-blue-600 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:shadow"
      />
    </div>
  );
}

function KineOffer() {
  const [active, setActive] = useState(30);
  const [followed, setFollowed] = useState(20);
  const [priceCents, setPriceCents] = useState(RECOMMENDED_REVIEW_PRICE_CENTS);

  // On ne peut pas suivre plus de patients qu'on n'en a d'actifs.
  const reviews = Math.min(followed, active);
  const reviewsCents = reviews * priceCents;
  const easyphysioCents = active * KINE_FEE_PER_ACTIVE_PATIENT_TTC_CENTS;
  const cardFeesCents = reviews * estimateStripeFeeCents(priceCents);
  const netCents = reviewsCents - easyphysioCents - cardFeesCents;

  const rows = [
    { label: `${reviews} bilan${reviews > 1 ? "s" : ""} × ${euros(priceCents)} €`, value: `+ ${euros(reviewsCents)} €`, tone: "text-slate-900" },
    { label: `EasyPhysio : ${active} × ${euros(KINE_FEE_PER_ACTIVE_PATIENT_TTC_CENTS)} € TTC`, value: `− ${euros(easyphysioCents)} €`, tone: "text-blue-600" },
    { label: "Frais de paiement (estimés)", value: `− ${euros(cardFeesCents)} €`, tone: "text-slate-700" },
  ];

  return (
    <div className="mx-auto max-w-4xl">
      <div className="grid gap-3 rounded-3xl border border-slate-200/70 bg-white/60 p-3 shadow-sm sm:grid-cols-2">
        {/* 1. Comment ça marche */}
        <div className="rounded-2xl bg-blue-50/60 p-5 max-sm:p-4 sm:short:p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Comment ça marche</p>
          <ol className="mt-4 space-y-4 max-sm:mt-3 max-sm:space-y-3 sm:short:mt-3 sm:short:space-y-2.5">
            {KINE_STEPS.map((step, i) => (
              <li key={step.title} className="flex gap-3">
                <span className="font-display flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{step.title}</p>
                  <p className="mt-0.5 text-sm leading-snug text-slate-600 max-sm:text-xs">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-sm leading-relaxed text-slate-600 max-sm:hidden sm:short:mt-3">
            Les deux paiements ne se mélangent jamais&nbsp;: <Underlined>vos honoraires restent à 100&nbsp;% à vous.</Underlined>
          </p>
        </div>

        {/* 2. Simulateur */}
        <div className="relative rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm max-sm:p-4 sm:short:p-4">
          {/* Note manuscrite vers les curseurs — grand écran seulement. */}
          <HandNote direction="down" className="absolute -right-3 -top-7 rotate-3 max-lg:hidden">
            essayez avec vos patients
          </HandNote>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Simulez votre revenu</p>

          <Slider
            id="sim-active"
            label="Patients actifs sur l'appli"
            value={active}
            display={String(active)}
            min={1}
            max={SIM_ACTIVE_MAX}
            onChange={(v) => {
              setActive(v);
              if (followed > v) setFollowed(v);
            }}
            valueText={`${active} patients actifs`}
          />
          <Slider
            id="sim-followed"
            label="dont en suivi mensuel"
            value={reviews}
            display={String(reviews)}
            min={0}
            max={active}
            onChange={setFollowed}
            valueText={`${reviews} patients en suivi mensuel`}
          />
          <Slider
            id="sim-price"
            label="Votre tarif du bilan"
            value={priceCents}
            display={`${eurosRound(priceCents)} €`}
            min={REVIEW_PRICE_MIN_CENTS}
            max={REVIEW_PRICE_MAX_CENTS}
            step={100}
            onChange={setPriceCents}
            valueText={`${eurosRound(priceCents)} euros par bilan`}
          />

          <div className="mt-3 rounded-xl bg-slate-50 px-4 py-3 max-sm:px-3 sm:short:mt-2 sm:short:py-2">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm font-medium text-slate-900">Revenu en plus</p>
              <p className={`text-2xl font-semibold tabular-nums ${netCents >= 0 ? "text-slate-900" : "text-slate-500"}`}>
                {netCents < 0 ? "− " : ""}
                {euros(Math.abs(netCents))}&nbsp;€
                <span className="text-xs font-normal text-slate-500"> / mois</span>
              </p>
            </div>
            <dl className="mt-1.5 space-y-0.5 border-t border-slate-200 pt-1.5 text-xs text-slate-500">
              {rows.map((row) => (
                <div key={row.label} className="flex justify-between gap-3">
                  <dt className="min-w-0 truncate">{row.label}</dt>
                  <dd className={`shrink-0 font-medium tabular-nums ${row.tone}`}>{row.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="mt-3 flex items-center gap-3 rounded-xl bg-blue-50/70 px-3.5 py-2.5 max-sm:hidden sm:short:hidden">
            <Info className="h-5 w-5 shrink-0 text-blue-600" strokeWidth={1.75} />
            <p className="text-xs leading-snug text-slate-500">
              <span className="block text-sm font-medium text-blue-700">Pas de bilan, pas de prélèvement</span>
              Les patients encore en soins ne paient pas de bilan&nbsp;: l&apos;appli sert alors au suivi de leurs exercices.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 max-sm:mt-4 sm:short:mt-3">
        {/* Avant le lancement (lib/launchFlags.ts) : un seul bouton, vers la
            liste d'attente du bas de page. */}
        <Link
          href={SIGNUPS_OPEN ? "/signup/kine" : "#liste-attente"}
          className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-7 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.97]"
        >
          {SIGNUPS_OPEN ? "Demander un accès" : "Rejoindre la liste d'attente"}
          <ArrowRight className="h-4 w-4" strokeWidth={2} />
        </Link>
        {SIGNUPS_OPEN && (
          <a
            href="#liste-attente"
            className="inline-flex items-center text-sm font-medium text-slate-600 underline-offset-4 transition hover:text-blue-700 hover:underline"
          >
            Me prévenir du lancement
          </a>
        )}
      </div>
    </div>
  );
}

export default function PricingSection() {
  const [who, setWho] = useState<"kine" | "patient">("kine");

  return (
    <div>
      <div className="mx-auto flex w-fit rounded-full bg-slate-100 p-1">
        {(
          [
            { key: "kine", label: "Côté kiné" },
            { key: "patient", label: "Côté patient" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setWho(tab.key)}
            className={`rounded-full px-5 py-2 text-sm font-medium transition ${
              who === tab.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
            aria-pressed={who === tab.key}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div key={who} className="mt-10 sm:short:mt-5 animate-[fadeInUp_0.4s_ease-out_both]">
        {who === "kine" ? <KineOffer /> : <PatientOffers />}
      </div>
    </div>
  );
}
