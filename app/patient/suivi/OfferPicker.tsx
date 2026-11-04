"use client";

import { useState } from "react";
import Link from "next/link";
import { Lock } from "lucide-react";
import SubmitButton from "@/components/SubmitButton";
import {
  BEST_OFFER_KEY,
  DEFAULT_OFFER_KEY,
  KINE_FOLLOW_UP_CENTS,
  PLATFORM_OFFERS,
  TRIAL_DAYS,
  eurosFR,
  monthlyTotalCents,
  platformOffer,
  savingsPercent,
  type PlatformOfferKey,
} from "@/lib/billing/patientPlans";
import { startPlan } from "./actions";

// Choix de l'offre (paywall patient, proposition A retenue par Philippe le
// 2026-11-04) : trois lignes empilées, l'engagement 3 mois coché par défaut,
// un seul badge, et UNE ligne de détail qui suit l'offre choisie — l'origine
// des deux montants reste visible sans répéter le texte trois fois.
export default function OfferPicker({
  kineName,
  trial,
  firstChargeLabel,
  demo,
}: {
  kineName: string;
  trial: boolean;
  /** « 14 nov. » : date du premier prélèvement après l'essai. */
  firstChargeLabel: string;
  demo: boolean;
}) {
  const [key, setKey] = useState<PlatformOfferKey>(DEFAULT_OFFER_KEY);
  const selected = platformOffer(key);

  return (
    <form action={demo ? undefined : startPlan}>
      <fieldset>
        <legend className="sr-only">Choisissez votre offre</legend>
        <div className="space-y-2 max-sm:space-y-1.5">
          {PLATFORM_OFFERS.map((o) => {
            const on = o.key === key;
            const save = savingsPercent(o);
            return (
              <label
                key={o.key}
                className={`relative flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 transition max-sm:px-3 max-sm:py-2 ${
                  on ? "border-blue-600 bg-blue-50/70 ring-1 ring-blue-600" : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <input
                  type="radio"
                  name="plan"
                  value={o.key}
                  checked={on}
                  onChange={() => setKey(o.key)}
                  className="sr-only"
                />
                <span
                  aria-hidden
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${on ? "border-blue-600" : "border-slate-300"}`}
                >
                  {on && <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-slate-900">{o.label}</span>
                  {save > 0 && <span className="text-xs font-medium text-emerald-700">−{save} %</span>}
                </span>
                <span className="shrink-0 text-right">
                  <span className="text-lg font-semibold tabular-nums text-slate-900">{eurosFR(monthlyTotalCents(o))} €</span>
                  <span className="text-xs text-slate-500"> / mois</span>
                </span>
                {o.key === BEST_OFFER_KEY && (
                  <span className="absolute -top-2.5 right-4 rounded-full bg-blue-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                    Le plus avantageux
                  </span>
                )}
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* L'origine du prix, pour l'offre choisie. */}
      <p className="mt-3 text-xs leading-relaxed text-slate-500 max-sm:mt-2" aria-live="polite">
        <span className="font-medium text-slate-700">{eurosFR(selected.platformCents)} €</span> d&apos;accès à EasyPhysio, chaque mois
        {" + "}
        <span className="font-medium text-slate-700">{eurosFR(KINE_FOLLOW_UP_CENTS)} €</span> versés à {kineName}, les mois où il met à jour
        votre programme.
      </p>

      <label className="mt-4 flex items-start gap-2.5 text-xs leading-snug text-slate-600 max-sm:mt-2.5">
        <input type="checkbox" name="consent" required className="mt-0.5 h-4 w-4 shrink-0 rounded accent-blue-600" />
        <span>
          J&apos;accepte ces deux montants, prélevés chaque mois par EasyPhysio et par mon kiné, l&apos;engagement choisi, et l&apos;accès immédiat
          au service (en cas de rétractation, seule la période utilisée est due).{" "}
          <Link href="/cgu" target="_blank" className="underline hover:text-slate-900">
            Conditions
          </Link>
        </span>
      </label>

      <SubmitButton
        pendingText="Redirection…"
        className="mt-4 w-full rounded-full bg-blue-600 py-3 max-sm:mt-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.98]"
      >
        {trial ? `Commencer mes ${TRIAL_DAYS} jours gratuits` : "Activer mon suivi"}
      </SubmitButton>
      <p className="mt-2.5 flex items-center justify-center gap-1.5 text-center text-xs text-slate-500">
        <Lock className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
        {trial ? `Aucun débit avant le ${firstChargeLabel} · ` : ""}Résiliable à tout moment · Paiement sécurisé
      </p>
    </form>
  );
}
