"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@/i18n/locales";
import { AlertTriangle, Bell, Lock } from "lucide-react";
import LoopVideo from "@/components/LoopVideo";
import SubmitButton from "@/components/SubmitButton";
import {
  DEFAULT_OFFER_KEY,
  FRANCE_PRICING,
  TRIAL_DAYS,
  moneyLabel,
  monthlyTotalIn,
  platformOffersIn,
  savingsPercentIn,
  type CountryPricing,
  type PlatformOfferKey,
} from "@/lib/billing/patientPlans";
import { startPlan } from "./actions";

// Paywall patient, direction 2 « le programme en vidéo d'abord » (Philippe,
// 2026-11-04, après le rejet de la version « générique » selon les règles
// anti-slop de taste-skill). Ce que voit TOUT patient juste après avoir
// rejoint son kiné.
//   - Ordinateur : à gauche Jules qui fait l'exercice, toute la hauteur ; à
//     droite le choix de la durée et le prix.
//   - Téléphone : la vidéo en haut, le choix dessous.
// Le choix de l'offre : les trois formules en liste (2026-11-19, à la place du
// curseur « Libre / 3 mois / 6 mois »), comparables d'un coup d'œil ; dessous,
// UNE ligne dit l'origine des deux montants. Tient sur un écran.
//
// Les vidéos (Philippe, 2026-11-04 : « les exos qui coulissent du haut vers le
// bas … celle où la caméra reste le plus stable ») : deux bandes qui
// descendent à des vitesses différentes, les exercices en salle (filmés
// debout) d'un côté, les exercices au sol de l'autre. Seulement les six
// extraits où la caméra bouge le moins (mesuré avec vidstabdetect de ffmpeg ;
// le Pallof press, ancienne vidéo de cet écran, était le moins stable).
// `label` : clé du nom de l'exercice dans messages/<langue>/billing.json (paywall.clips).
type Clip = { file: string; label: string };
const STANDING: Clip[] = [
  { file: "salle-v-seated-external-rotation-elbow-on-knee", label: "seatedExternalRotation" },
  { file: "salle-v-band-shoulder-external-rotation", label: "bandShoulderExternalRotation" },
  { file: "salle-v-y-balance", label: "yBalance" },
];
const FLOOR: Clip[] = [
  { file: "glute-bridge", label: "gluteBridge" },
  { file: "cat-cow-stretch", label: "catCow" },
  { file: "banded-clamshell", label: "bandedClamshell" },
];

// La liste est doublée et descend d'une demi-hauteur : la boucle ne se voit
// pas. L'espace entre vidéos est un padding (pas un « gap ») pour que les deux
// moitiés aient exactement la même hauteur. Immobile si « réduire les animations ».
function Strip({ clips, tile, motion }: { clips: Clip[]; tile: string; motion: string }) {
  const t = useTranslations("billing.paywall");
  return (
    <div className="h-full overflow-hidden">
      <ul data-loop-group className={`${motion} motion-reduce:[animation:none]`}>
        {[...clips, ...clips].map((c, i) => (
          <li key={i} className="pb-2" aria-hidden={i >= clips.length || undefined}>
            <div className={`overflow-hidden rounded-2xl bg-slate-800 ${tile}`}>
              <LoopVideo
                src={`/videos-demo/${c.file}.mp4`}
                poster={`/videos-demo/${c.file}.jpg`}
                label={t("videoLabel", { label: t(`clips.${c.label}`) })}
                className="h-full w-full object-cover"
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

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
  programmeReady,
  demo,
  pricing = FRANCE_PRICING,
}: {
  kineName: string;
  trial: boolean;
  refused: boolean;
  error?: string;
  /** « 12 nov. » : rappel avant la fin de l'essai. */
  reminderLabel: string;
  /** « 14 nov. » : premier prélèvement. */
  firstChargeLabel: string;
  /** Le kiné a déjà attribué une séance : sinon, pas de « programme prêt ». */
  programmeReady: boolean;
  demo: boolean;
  /** Monnaie et montants du pays du kiné (2026-11-18) ; défaut : France. */
  pricing?: CountryPricing;
}) {
  const [offerKey, setOfferKey] = useState<PlatformOfferKey>(DEFAULT_OFFER_KEY);
  const offers = platformOffersIn(pricing);
  const offer = offers.find((o) => o.key === offerKey) ?? offers[0];
  const t = useTranslations("billing.paywall");
  const tf = useTranslations("billing.format");
  const tOffer = useTranslations("billing.offers");
  const tc = useTranslations("common");
  const locale = useLocale() as Locale;
  const eur = (cents: number) => moneyLabel(cents, pricing.currency, locale, (amount) => tf("eur", { amount }));

  return (
    <main className="min-h-dvh bg-slate-950 text-white md:grid md:h-dvh md:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      {/* Jules fait les exercices : ce que le patient va recevoir. */}
      <div className="relative h-[24dvh] overflow-hidden md:h-full">
        <style>{`@keyframes paywall-descend{from{transform:translateY(-50%)}to{transform:translateY(0)}}`}</style>
        <div className="absolute inset-0 grid grid-cols-[1fr_1.1fr] gap-2 px-2">
          <Strip clips={STANDING} tile="aspect-[9/16]" motion="[animation:paywall-descend_48s_linear_infinite]" />
          <Strip clips={FLOOR} tile="aspect-[4/3]" motion="[animation:paywall-descend_34s_linear_-11s_infinite]" />
        </div>
        {/* Fondu haut et bas ; ordinateur : fondu vers la colonne du prix. */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-950/70 via-transparent to-slate-950 md:to-slate-950/70" />
        <div className="pointer-events-none absolute inset-0 hidden bg-gradient-to-r from-transparent via-transparent to-slate-950/70 md:block" />
        <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-slate-950/55 py-1 pl-1 pr-3 backdrop-blur-sm sm:left-6 sm:top-6">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-[11px] font-semibold">{initials(kineName)}</span>
          <span className="text-xs font-medium">{t("preparedBy", { kineName })}</span>
        </div>
      </div>

      {/* Le choix */}
      <div className="flex flex-col justify-center px-5 pb-5 max-md:-mt-6 md:px-12 md:py-8 short:md:py-4">
        <form action={demo ? undefined : startPlan} className="relative mx-auto w-full max-w-md">
          <h1 className="font-display text-2xl font-semibold leading-tight tracking-tight sm:text-3xl short:md:text-2xl">
            {/* (Philippe, 2026-11-06 : audit, on allège) « prêt » seulement si
                le kiné a déjà attribué une séance ; sinon un titre neutre. */}
            {programmeReady ? t("titleReady") : t("titleWith", { kineName })}
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {trial ? t("trialSubtitle", { days: TRIAL_DAYS }) : t("chooseSubtitle")}
          </p>

          {(refused || error) && (
            <p role="alert" className="mt-3 flex items-start gap-2 rounded-xl bg-red-500/15 p-3 text-sm text-red-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
              {error ?? t("refused")}
            </p>
          )}

          {/* Les trois formules côte à côte (Philippe, 2026-11-19 : le curseur
              ne permettait pas de comparer d'un coup d'œil). Une ligne par
              formule : total par mois, accès par mois × durée, économie. */}
          <fieldset className="mt-4 short:md:mt-3">
            <legend className="sr-only">{t("plansLegend")}</legend>
            <div className="grid gap-1.5">
              {offers.map((o) => {
                const pct = savingsPercentIn(o, pricing);
                const selected = o.key === offer.key;
                return (
                  <label
                    key={o.key}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 transition short:md:py-1.5 ${
                      selected ? "border-blue-500 bg-blue-500/10" : "border-slate-700 hover:border-slate-500"
                    }`}
                  >
                    <input
                      type="radio"
                      name="plan"
                      value={o.key}
                      checked={selected}
                      onChange={() => setOfferKey(o.key)}
                      className="h-4 w-4 shrink-0 accent-blue-500"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 text-sm font-semibold">
                        {tOffer(o.key)}
                        {pct > 0 && <span className="rounded-full bg-emerald-400/15 px-1.5 py-px text-[11px] font-semibold text-emerald-300">{tf("pct", { n: pct })}</span>}
                      </span>
                      <span className="block text-[11px] leading-snug text-slate-400">
                        {o.commitmentMonths
                          ? t("planAccessCommit", { access: eur(o.platformCents), months: o.commitmentMonths, total: eur(o.platformCents * o.commitmentMonths) })
                          : t("planAccessFree", { access: eur(o.platformCents) })}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block font-display text-lg font-semibold tabular-nums leading-tight">{eur(monthlyTotalIn(o, pricing))}</span>
                      <span className="block text-[11px] text-slate-400">{t("perMonth")}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {/* L'origine du total : deux paiements séparés. */}
          <p className="mt-2 text-[11px] leading-snug text-slate-400" aria-live="polite">
            {pricing.kineFollowUp === 0
              ? t("originFree", { platform: eur(offer.platformCents), kineName })
              : t("origin", { platform: eur(offer.platformCents), kine: eur(pricing.kineFollowUp), kineName })}{" "}
            {t("afterCommitment")}
          </p>

          {trial && (
            <p className="mt-2 flex items-start gap-2 text-xs text-slate-300">
              <Bell className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-400" strokeWidth={2} />
              {t("trialLine", { days: TRIAL_DAYS, reminder: reminderLabel, first: firstChargeLabel })}
            </p>
          )}

          <label className="mt-4 flex items-start gap-2.5 text-[11px] leading-snug text-slate-400 short:md:mt-3">
            <input type="checkbox" name="consent" required className="mt-0.5 h-4 w-4 shrink-0 rounded accent-blue-500" />
            <span>
              {pricing.kineFollowUp === 0 ? t("consentFree") : t("consent")}{" "}
              <Link href="/cgu" target="_blank" className="underline hover:text-white">
                {t("conditions")}
              </Link>
            </span>
          </label>
          {/* Texte d'acceptation traduit à faire relire : le français fait foi. */}
          {locale !== "fr" && <p className="mt-1.5 text-[11px] leading-snug text-amber-300">{tc("reviewBanner")}</p>}

          <SubmitButton
            pendingText={t("redirecting")}
            className="mt-4 w-full rounded-full bg-blue-600 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 active:scale-[0.98] short:md:mt-3"
          >
            {trial ? t("startFree") : t("activate")}
          </SubmitButton>
          <p className="mt-2.5 flex items-center justify-center gap-1.5 text-center text-[11px] text-slate-500">
            <Lock className="h-3 w-3 shrink-0" strokeWidth={2} />
            {/* « Aucun débit avant le … » : déjà dit dans la ligne de l'essai. */}
            <Link href="/patient/compte" className="hover:text-slate-300 hover:underline">
              {t("myData")}
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
