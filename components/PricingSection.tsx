"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { motion, useInView } from "motion/react";
import { ArrowRight, Check, Info, Sparkles } from "lucide-react";
import { HandNote, Underlined } from "@/components/HandDrawn";
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

// Un léger "pop" du montant final dès qu'il entre dans le viewport, une
// seule fois — pas un décompte depuis 0 : faire défiler plein de valeurs
// intermédiaires (0,00 → 12,40 → 19,99…) donnait l'impression que l'offre
// coûtait bien plus cher qu'en réalité (Philippe, 2026-09-15).
function AnimatedAmount({ cents, className }: { cents: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.span
      ref={ref}
      className={`inline-block tabular-nums ${className ?? ""}`}
      initial={{ opacity: 0, scale: 0.85 }}
      animate={inView ? { opacity: 1, scale: 1 } : undefined}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
    >
      {euros(cents)}
    </motion.span>
  );
}

function PatientOffers() {
  return (
    <div>
      <p className="mx-auto max-w-md text-center text-sm leading-relaxed text-slate-500">
        Votre kiné choisit l&apos;offre qu&apos;il vous propose et peut ajuster son tarif — voici les
        prix de base.
      </p>
      <RevealGroup className="mt-8 grid gap-4 sm:grid-cols-3 sm:short:mt-5">
        {TIER_KEYS.map((key) => {
          const tier = TIERS[key];
          const featured = key === FEATURED;
          return (
            <RevealItem
              key={key}
              className={
                featured
                  ? "relative z-10 rounded-2xl bg-blue-600 p-6 text-white shadow-lg shadow-blue-900/20 ring-1 ring-blue-700 sm:short:p-5 transition-all duration-300 ease-out hover:-translate-y-2 hover:shadow-2xl hover:shadow-blue-900/30 md:scale-105"
                  : "rounded-2xl border border-slate-200/70 bg-white/70 p-6 sm:short:p-5 transition-all duration-300 ease-out hover:-translate-y-1.5 hover:border-blue-200 hover:bg-white hover:shadow-xl hover:shadow-slate-900/10"
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
              <p className="mt-4 flex items-baseline gap-1.5 sm:short:mt-2">
                <span className={`text-base line-through ${featured ? "text-blue-200" : "text-slate-400"}`}>
                  {euros(tier.listAmount)}&nbsp;€
                </span>
                <span
                  className={`font-display flex items-baseline text-3xl font-semibold tracking-tight ${featured ? "text-white" : "text-slate-900"}`}
                >
                  <AnimatedAmount cents={tier.amount} />
                  &nbsp;€
                </span>
                <span className={`text-xs ${featured ? "text-blue-100" : "text-slate-500"}`}>/mois</span>
              </p>
              <ul
                className={`mt-5 space-y-2 border-t pt-5 text-sm sm:short:mt-3 sm:short:space-y-1.5 sm:short:pt-3 ${featured ? "border-blue-500 text-blue-50" : "border-slate-100 text-slate-600"}`}
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
      <p className="mt-6 text-center text-xs text-slate-400 sm:short:mt-4">
        Réglé directement à votre kiné, via Stripe — 7 jours gratuits avant le premier prélèvement.
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

// Côté kiné (Philippe, 2026-10-10, d'après sa maquette) : trois blocs lisibles
// d'un coup d'œil au lieu d'un pavé bleu — la part qui revient au kiné, un
// simulateur (curseur). Pas de 3e bloc d'atouts (Philippe : inutile) ; à la
// place, des détails « faits main » : soulignement dessiné, note manuscrite,
// exemple chiffré qui suit le curseur. Le taux vient de PLATFORM_FEE_RATE,
// jamais écrit en dur : l'affichage ne peut pas diverger de ce qui est prélevé.
const SIM_MIN = 10;
const SIM_MAX = 100;

function KineOffer() {
  const [price, setPrice] = useState(30);
  const feeCents = Math.round(price * 100 * PLATFORM_FEE_RATE);
  const keepCents = price * 100 - feeCents;
  // Anneau : r = 42 -> périmètre ≈ 263,9 ; l'arc foncé = la commission.
  const c = 2 * Math.PI * 42;
  const arc = c * PLATFORM_FEE_RATE;
  const fill = ((price - SIM_MIN) / (SIM_MAX - SIM_MIN)) * 100;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="grid gap-3 rounded-3xl border border-slate-200/70 bg-white/60 p-3 shadow-sm sm:grid-cols-2">
        {/* 1. Votre rémunération */}
        <div className="rounded-2xl bg-blue-50/60 p-5 max-sm:p-4 sm:short:p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Votre rémunération</p>
          <div className="mt-4 flex items-center gap-4 max-sm:mt-2">
            <div className="relative h-32 w-32 shrink-0 max-sm:h-20 max-sm:w-20 sm:short:h-28 sm:short:w-28">
              <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden="true">
                <circle cx="50" cy="50" r="42" fill="none" strokeWidth="10" className="stroke-blue-200" />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={`${arc} ${c - arc}`}
                  className="stroke-blue-600"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-semibold tracking-tight text-slate-900 max-sm:text-base">{FEE_PERCENT}&nbsp;%</span>
                <span className="text-[10px] leading-tight text-slate-500 max-sm:hidden">
                  de commission
                  <br />
                  EasyPhysio
                </span>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 shrink-0 text-blue-600 max-sm:hidden" strokeWidth={1.75} />
            <div className="min-w-0">
              <p className="text-4xl font-semibold leading-none tracking-tight text-slate-900 max-sm:text-3xl">
                {100 - FEE_PERCENT}&nbsp;%
              </p>
              <p className="mt-1 text-xl font-semibold leading-tight text-slate-900 max-sm:text-base">
                <Underlined>pour vous</Underlined>
              </p>
              <p className="mt-1 text-xs text-slate-500 sm:hidden">{FEE_PERCENT}&nbsp;% de commission EasyPhysio</p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-slate-600 max-sm:mt-3 sm:short:mt-3">
            Avec 10 patients à {price}&nbsp;€, cela fait{" "}
            <span className="font-semibold text-slate-900">{euros(keepCents * 10)}&nbsp;€ par mois</span> pour vous.
            <span className="max-sm:hidden"> Vos patients vous paient directement&nbsp;; la commission est retenue au passage.</span>
          </p>
        </div>

        {/* 2. Simulateur */}
        <div className="relative rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm max-sm:p-4 sm:short:p-4">
          {/* Note manuscrite vers le curseur — grand écran seulement. */}
          <HandNote direction="down" className="absolute -right-3 -top-7 rotate-3 max-lg:hidden">
            essayez avec votre tarif
          </HandNote>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Simulez votre revenu</p>
          <div className="mt-3 flex items-baseline justify-between gap-3 sm:short:mt-1.5">
            <label htmlFor="sim-price" className="text-sm text-slate-600">
              Tarif mensuel par patient
            </label>
            <span className="text-2xl font-semibold tabular-nums text-blue-600">{price}&nbsp;€</span>
          </div>
          <input
            id="sim-price"
            type="range"
            min={SIM_MIN}
            max={SIM_MAX}
            step={1}
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
            aria-valuetext={`${price} euros par mois`}
            style={{ background: `linear-gradient(to right, #155dfc ${fill}%, #e2e8f0 ${fill}%)` }}
            className="mt-3 h-1.5 w-full cursor-pointer sm:short:mt-2 appearance-none rounded-full accent-blue-600 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:shadow"
          />
          <div className="mt-1.5 flex justify-between text-xs text-slate-400">
            <span>{SIM_MIN}&nbsp;€</span>
            <span>{SIM_MAX}&nbsp;€</span>
          </div>

          <div className="mt-3 grid grid-cols-2 divide-x divide-slate-200 rounded-xl bg-slate-50 py-3 sm:short:mt-2 sm:short:py-2">
            <div className="px-4 max-sm:px-3">
              <p className="text-xs text-slate-500">Commission ({FEE_PERCENT}&nbsp;%)</p>
              <p className="mt-0.5 text-xl font-semibold tabular-nums text-blue-600">{euros(feeCents)}&nbsp;€</p>
            </div>
            <div className="px-4 max-sm:px-3">
              <p className="text-xs text-slate-500">Vous conservez</p>
              <p className="mt-0.5 text-xl font-semibold tabular-nums text-slate-900">{euros(keepCents)}&nbsp;€</p>
            </div>
          </div>
          <p className="mt-1.5 text-center text-[11px] text-slate-400">
            par patient et par mois, hors frais Stripe (≈&nbsp;1,5&nbsp;% + 0,25&nbsp;€)
          </p>

          <div className="mt-3 flex items-center gap-3 rounded-xl bg-blue-50/70 px-3.5 py-2.5 max-sm:hidden sm:short:mt-2 sm:short:py-1.5">
            <Info className="h-5 w-5 shrink-0 text-blue-600" strokeWidth={1.75} />
            <p className="text-xs leading-snug text-slate-500">
              <span className="block text-sm font-medium text-blue-700 sm:short:inline sm:short:text-xs">Aucun abonnement fixe</span>
              <span className="hidden sm:short:inline"> — </span>
              <span className="sm:short:lowercase">Vous</span> ne payez que pour vos patients abonnés.
            </p>
          </div>
        </div>

      </div>

      <div className="mt-5 flex justify-center max-sm:mt-4 sm:short:mt-3">
        <Link
          href="/signup/kine"
          className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-7 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.97]"
        >
          Demander un accès
          <ArrowRight className="h-4 w-4" strokeWidth={2} />
        </Link>
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
