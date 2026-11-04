"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, Bell, Lock } from "lucide-react";
import LoopVideo from "@/components/LoopVideo";
import SubmitButton from "@/components/SubmitButton";
import {
  DEFAULT_OFFER_KEY,
  KINE_FOLLOW_UP_CENTS,
  PLATFORM_OFFERS,
  TRIAL_DAYS,
  eurosFR,
  monthlyTotalCents,
  savingsPercent,
} from "@/lib/billing/patientPlans";
import { startPlan } from "./actions";

// Paywall patient, direction 2 « le programme en vidéo d'abord » (Philippe,
// 2026-11-04, après le rejet de la version « générique » selon les règles
// anti-slop de taste-skill). Ce que voit TOUT patient juste après avoir
// rejoint son kiné.
//   - Ordinateur : à gauche Jules qui fait l'exercice, toute la hauteur ; à
//     droite le choix de la durée et le prix.
//   - Téléphone : la vidéo en haut, le choix dessous.
// Le choix de l'offre est un curseur « combien de temps » (Libre / 3 mois /
// 6 mois) : le grand prix change avec lui, et UNE ligne dit l'origine des deux
// montants. Tient sur un écran.

const STOPS = ["Libre", "3 mois", "6 mois"] as const;
const DEFAULT_INDEX = Math.max(0, PLATFORM_OFFERS.findIndex((o) => o.key === DEFAULT_OFFER_KEY));

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "K") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

export default function PaywallVideo({
  kineName,
  trial,
  refused,
  error,
  reminderLabel,
  firstChargeLabel,
  demo,
}: {
  kineName: string;
  trial: boolean;
  refused: boolean;
  error?: string;
  /** « 12 nov. » : rappel avant la fin de l'essai. */
  reminderLabel: string;
  /** « 14 nov. » : premier prélèvement. */
  firstChargeLabel: string;
  demo: boolean;
}) {
  const [index, setIndex] = useState(DEFAULT_INDEX);
  const offer = PLATFORM_OFFERS[index];
  const save = savingsPercent(offer);

  return (
    <main className="min-h-dvh bg-slate-950 text-white md:grid md:h-dvh md:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      {/* Jules fait l'exercice : ce que le patient va recevoir. */}
      <div className="relative h-[38dvh] overflow-hidden md:h-full">
        <LoopVideo
          src="/videos-demo/salle-v-pallof-press.mp4"
          poster="/videos-demo/salle-v-pallof-press.jpg"
          label="Démonstration filmée d'un exercice"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent md:bg-gradient-to-r md:from-transparent md:via-transparent md:to-slate-950/60" />
        <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-slate-950/55 py-1 pl-1 pr-3 backdrop-blur-sm sm:left-6 sm:top-6">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-[11px] font-semibold">{initials(kineName)}</span>
          <span className="text-xs font-medium">Préparé par {kineName}</span>
        </div>
      </div>

      {/* Le choix */}
      <div className="flex flex-col justify-center px-5 pb-5 max-md:-mt-6 md:px-12 md:py-8 short:md:py-4">
        <form action={demo ? undefined : startPlan} className="relative mx-auto w-full max-w-md">
          <h1 className="font-display text-2xl font-semibold leading-tight tracking-tight sm:text-3xl short:md:text-2xl">
            Votre programme est prêt.
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {trial ? `${TRIAL_DAYS} jours offerts, puis la durée de votre choix.` : "Choisissez la durée qui vous convient."}
          </p>

          {(refused || error) && (
            <p role="alert" className="mt-3 flex items-start gap-2 rounded-xl bg-red-500/15 p-3 text-sm text-red-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
              {error ?? "Le dernier paiement a été refusé. Choisissez à nouveau une durée."}
            </p>
          )}

          {/* Combien de temps */}
          <input type="hidden" name="plan" value={offer.key} />
          <div className="mt-6 short:md:mt-4">
            <input
              type="range"
              min={0}
              max={PLATFORM_OFFERS.length - 1}
              step={1}
              value={index}
              onChange={(e) => setIndex(Number(e.target.value))}
              aria-label="Durée d'engagement"
              aria-valuetext={offer.label}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-700 accent-blue-500 [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-white [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-lg"
              style={{ background: `linear-gradient(to right, #3b82f6 ${(index / (PLATFORM_OFFERS.length - 1)) * 100}%, #334155 ${(index / (PLATFORM_OFFERS.length - 1)) * 100}%)` }}
            />
            <div className="mt-2 flex justify-between text-xs">
              {STOPS.map((label, i) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setIndex(i)}
                  className={`transition ${i === index ? "font-semibold text-white" : "text-slate-500 hover:text-slate-300"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Le prix */}
          <div className="mt-5 flex items-end gap-3 short:md:mt-3" aria-live="polite">
            <p className="font-display text-5xl font-semibold tabular-nums tracking-tight max-sm:text-4xl">
              {eurosFR(monthlyTotalCents(offer))} €<span className="text-base font-normal text-slate-400"> / mois</span>
            </p>
            {save > 0 && <span className="mb-2 rounded-full bg-emerald-400/15 px-2 py-0.5 text-xs font-semibold text-emerald-300">−{save} %</span>}
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
            {eurosFR(offer.platformCents)} € d&apos;accès à EasyPhysio chaque mois + {eurosFR(KINE_FOLLOW_UP_CENTS)} € versés à {kineName}, les mois où il met à
            jour votre programme.{offer.commitmentMonths ? ` Engagement ${offer.commitmentMonths} mois sur l'accès, puis résiliable à tout moment.` : " Sans engagement."}
          </p>

          {trial && (
            <p className="mt-3 flex items-center gap-2 text-xs text-slate-300">
              <Bell className="h-3.5 w-3.5 shrink-0 text-blue-400" strokeWidth={2} />
              Rappel le {reminderLabel} · premier paiement le {firstChargeLabel}
            </p>
          )}

          <label className="mt-4 flex items-start gap-2.5 text-[11px] leading-snug text-slate-400 short:md:mt-3">
            <input type="checkbox" name="consent" required className="mt-0.5 h-4 w-4 shrink-0 rounded accent-blue-500" />
            <span>
              J&apos;accepte ces deux montants, prélevés chaque mois par EasyPhysio et par mon kiné, l&apos;engagement choisi et l&apos;accès immédiat (en
              cas de rétractation, seule la période utilisée est due).{" "}
              <Link href="/cgu" target="_blank" className="underline hover:text-white">
                Conditions
              </Link>
            </span>
          </label>

          <SubmitButton
            pendingText="Redirection…"
            className="mt-4 w-full rounded-full bg-blue-600 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 active:scale-[0.98] short:md:mt-3"
          >
            {trial ? "Commencer gratuitement" : "Activer mon suivi"}
          </SubmitButton>
          <p className="mt-2.5 flex items-center justify-center gap-1.5 text-center text-[11px] text-slate-500">
            <Lock className="h-3 w-3 shrink-0" strokeWidth={2} />
            {trial ? `Aucun débit avant le ${firstChargeLabel} · ` : ""}Résiliable à tout moment ·{" "}
            <Link href="/patient/compte" className="hover:text-slate-300 hover:underline">
              Mes données
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
