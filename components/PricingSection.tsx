"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, ChevronDown, Sparkles } from "lucide-react";
import RevealGroup, { RevealItem } from "@/components/RevealGroup";
import { TIERS, TIER_KEYS, type TierKey } from "@/lib/billing/plans";
import { HIGHLIGHT, featuresFor } from "@/lib/billing/tierCopy";
import { PLATFORM_FEE_RATE } from "@/lib/billing/platformFee";

// Section "Tarifs" de la landing, avec un choix "Côté kiné" / "Côté patient" :
// chacun ne se reconnaît que dans son propre prix (le kiné dans sa commission,
// le patient dans les 3 offres que son kiné lui propose) — les montrer tous
// les deux en même temps, comme avant, ne parlait vraiment à personne
// (Philippe, 2026-09-13). Les 3 offres patient viennent de lib/billing/plans.ts
// et lib/billing/tierCopy.ts, déjà utilisés par /patient/abonnement — même
// source, donc jamais de prix divergent entre la landing et le vrai checkout.

const euros = (cents: number) => (cents / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2 });
const FEATURED: TierKey = "standard";
const FEE_PERCENT = Math.round(PLATFORM_FEE_RATE * 100);

function PatientOffers() {
  return (
    <div>
      <p className="mx-auto max-w-md text-center text-sm leading-relaxed text-slate-500">
        Votre kiné choisit l&apos;offre qu&apos;il vous propose et peut ajuster son tarif — voici les
        prix de base.
      </p>
      <RevealGroup className="mt-8 grid gap-4 sm:grid-cols-3">
        {TIER_KEYS.map((key) => {
          const tier = TIERS[key];
          const featured = key === FEATURED;
          return (
            <RevealItem
              key={key}
              className={
                featured
                  ? "relative rounded-2xl bg-blue-600 p-6 text-white shadow-lg shadow-blue-900/20 ring-1 ring-blue-700"
                  : "rounded-2xl border border-slate-200/70 bg-white/70 p-6"
              }
            >
              {featured && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-slate-900 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                  Le plus choisi
                </span>
              )}
              <p className={`text-sm font-medium ${featured ? "text-blue-50" : "text-slate-500"}`}>
                {tier.label}
              </p>
              <p
                className={`mt-1.5 flex items-center gap-1.5 text-xs font-medium ${featured ? "text-blue-100" : "text-blue-700"}`}
              >
                <Sparkles className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                {HIGHLIGHT[key]}
              </p>
              <p className="mt-4 flex items-baseline gap-1.5">
                <span className={`text-base line-through ${featured ? "text-blue-200" : "text-slate-400"}`}>
                  {euros(tier.listAmount)}&nbsp;€
                </span>
                <span
                  className={`font-display text-3xl font-semibold tracking-tight ${featured ? "text-white" : "text-slate-900"}`}
                >
                  {euros(tier.amount)}&nbsp;€
                </span>
                <span className={`text-xs ${featured ? "text-blue-100" : "text-slate-500"}`}>/mois</span>
              </p>
              <ul
                className={`mt-5 space-y-2 border-t pt-5 text-sm ${featured ? "border-blue-500 text-blue-50" : "border-slate-100 text-slate-600"}`}
              >
                {featuresFor(key).map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check
                      className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${featured ? "text-white" : "text-blue-600"}`}
                      strokeWidth={2.5}
                    />
                    {f}
                  </li>
                ))}
              </ul>
            </RevealItem>
          );
        })}
      </RevealGroup>
      <p className="mt-6 text-center text-xs text-slate-400">
        Réglé directement à votre kiné, via Stripe — 7 jours gratuits avant le premier prélèvement.
      </p>
      <div className="mt-6 flex justify-center">
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

function KineOffer() {
  const [whyOpen, setWhyOpen] = useState(false);
  return (
    <div className="mx-auto max-w-md">
      <div className="rounded-2xl bg-blue-600 p-8 text-white">
        <p className="text-sm font-medium text-blue-100">Cabinets &amp; praticiens · Bêta</p>
        <p className="font-display mt-3 text-7xl font-semibold tracking-tight">{FEE_PERCENT} %</p>
        <p className="mt-1 text-sm text-blue-200">prélevés par patient actif, sur le tarif que vous fixez</p>
        <ul className="mt-8 space-y-2 text-sm text-blue-50">
          <li>Vous fixez votre tarif mensuel par patient</li>
          <li>Paiement direct par vos patients, via Stripe Connect</li>
          <li>Patients illimités</li>
          <li>Bibliothèque d&apos;exercices avec vidéos</li>
          <li>Suivi d&apos;assiduité et signalements de douleur</li>
          <li>Ajustement de programme à distance</li>
        </ul>
        <Link
          href="/signup/kine"
          className="mt-8 inline-flex items-center gap-1.5 rounded-full bg-white px-6 py-3 text-sm font-medium text-blue-700 shadow-sm transition hover:bg-slate-100 active:scale-[0.97]"
        >
          Demander un accès
          <ArrowRight className="h-4 w-4" strokeWidth={2} />
        </Link>
        <p className="mt-4 text-xs leading-relaxed text-blue-100">
          Aucun abonnement fixe — la commission est prélevée automatiquement, uniquement sur vos
          patients actifs.
        </p>
      </div>

      <button
        type="button"
        onClick={() => setWhyOpen((v) => !v)}
        className="mt-4 flex w-full items-center justify-between rounded-xl border border-slate-200/70 bg-white/70 px-5 py-3.5 text-left text-sm font-medium text-slate-700 transition hover:border-slate-300"
        aria-expanded={whyOpen}
      >
        Pourquoi {FEE_PERCENT}&nbsp;%&nbsp;?
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${whyOpen ? "rotate-180" : ""}`}
          strokeWidth={2}
        />
      </button>
      {whyOpen && (
        <div className="mt-2 space-y-2 rounded-xl bg-white/70 px-5 py-4 text-sm leading-relaxed text-slate-600">
          <p>
            Pas d&apos;abonnement fixe, pas de coût caché : {FEE_PERCENT}&nbsp;% du tarif que{" "}
            <strong className="font-medium text-slate-900">vous</strong> fixez, calculé au prorata des
            jours où le patient est actif — rien de plus.
          </p>
          <p>Un patient qui rejoint en cours de mois ne vous coûte qu&apos;une fraction du prix ce mois-là.</p>
          <p>Aucun patient actif un mois donné = aucune commission ce mois-là.</p>
        </div>
      )}
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

      <div key={who} className="mt-10 animate-[fadeInUp_0.4s_ease-out_both]">
        {who === "kine" ? <KineOffer /> : <PatientOffers />}
      </div>
    </div>
  );
}
