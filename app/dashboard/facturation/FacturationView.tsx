import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { intlTag } from "@/lib/i18n/translator";
import type { Locale } from "@/i18n/locales";
import { Check, CheckCircle2, ChevronRight, Circle, ExternalLink, Tag, Users } from "lucide-react";
import SubmitButton from "@/components/SubmitButton";
import PhoneFold from "@/components/PhoneFold";
import {
  FRANCE_PRICING,
  TRIAL_DAYS,
  eurosFR,
  moneyLabel,
  monthlyTotalIn,
  platformOffersIn,
  stripeFeeCents,
  type CountryPricing,
} from "@/lib/billing/patientPlans";
import { startConnectOnboarding } from "../connect/actions";
import { setKinePrice } from "./actions";
import { KINE_PRICE_MAX_CENTS } from "@/lib/billing/patientPlans";

// Page « Suivi & facturation » du kiné — modèle définitif (Philippe,
// 2026-11-04 ; lib/billing/patientPlans.ts) : l'appli est GRATUITE pour le
// kiné. Chaque patient paie une formule mensuelle : les honoraires du kiné,
// versés directement sur son compte Stripe (les mois où il met à jour le
// programme), et l'accès à la plateforme, payé à EasyPhysio. Montants : jamais
// ici, toujours dans lib/billing/patientPlans.ts. Tient sur un écran : trois
// colonnes sur ordinateur, cartes repliables sur téléphone.

export type ConnectStatus = "active" | "onboarding" | "not_started";

export type SubscriberRow = {
  patientId: string;
  name: string;
  planLabel: string;
  status: "active" | "cancelled" | "refused";
  periodEnd: string | null;
};


const CARD = "rounded-2xl border border-line bg-surface p-4 sm:p-5 max-sm:border-0 max-sm:shadow-soft max-sm:short:p-3";

export default function FacturationView({
  connectStatus,
  subscribers,
  monthlyCents,
  patientCount,
  error,
  pricing = FRANCE_PRICING,
  priceSaved = false,
  demo = false,
}: {
  /** Démo (/demo/kine) : le tarif s'affiche, rien n'est enregistré. */
  demo?: boolean;
  /** Le tarif vient d'être enregistré (petite coche à côté de l'aide). */
  priceSaved?: boolean;
  connectStatus: ConnectStatus;
  subscribers: SubscriberRow[];
  /** Revenu mensuel moyen des formules en cours, pour le kiné (centimes). */
  monthlyCents: number;
  patientCount: number;
  error?: string;
  /** Monnaie et montants du pays du kiné (2026-11-18) ; défaut : France. */
  pricing?: CountryPricing;
}) {
  const active = subscribers.filter((s) => s.status !== "refused");
  const t = useTranslations("billing.facturation");
  const tf = useTranslations("billing.format");
  const locale = useLocale() as Locale;
  const eur = (cents: number) => moneyLabel(cents, pricing.currency, locale, (amount) => tf("eur", { amount }));
  // Fourchettes et net dans la monnaie du pays (en euros : mêmes chiffres qu'avant).
  const offers = platformOffersIn(pricing);
  const KINE_FOLLOW_UP_CENTS = pricing.kineFollowUp;
  const KINE_NET_CENTS = pricing.kineFollowUp - stripeFeeCents(pricing.kineFollowUp);
  const LOWEST_PLATFORM_CENTS = Math.min(...offers.map((o) => o.platformCents));
  const HIGHEST_PLATFORM_CENTS = Math.max(...offers.map((o) => o.platformCents));
  const LOWEST_MONTHLY_TOTAL_CENTS = Math.min(...offers.map((o) => monthlyTotalIn(o, pricing)));
  const HIGHEST_MONTHLY_TOTAL_CENTS = Math.max(...offers.map((o) => monthlyTotalIn(o, pricing)));
  const range = (low: number, high: number) =>
    pricing.currency === "eur" ? tf("eurRange", { low: eurosFR(low, locale), high: eurosFR(high, locale) }) : `${eur(low)} – ${eur(high)}`;
  const free = KINE_FOLLOW_UP_CENTS === 0;
  // « 500 € » / « CHF 500 » (montant rond, sans décimales) pour l'aide.
  const wholeMoney = (cents: number) =>
    new Intl.NumberFormat(intlTag(locale), { style: "currency", currency: pricing.currency.toUpperCase(), maximumFractionDigits: 0 }).format(cents / 100);
  // Champ du tarif : « 6,00 » / « 6.00 » selon la langue, symbole à droite.
  const priceInput = (KINE_FOLLOW_UP_CENTS / 100).toLocaleString(intlTag(locale), { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: false });
  const currencySymbol =
    new Intl.NumberFormat(intlTag(locale), { style: "currency", currency: pricing.currency.toUpperCase(), currencyDisplay: "narrowSymbol" })
      .formatToParts(0)
      .find((p) => p.type === "currency")?.value ?? pricing.currency.toUpperCase();
  const shortDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(intlTag(locale), { day: "numeric", month: "short" }) : "");
  return (
    <main>
      <div className="mx-auto w-full p-3 max-sm:p-4 max-sm:pt-2 sm:p-5 short:sm:py-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
          <h1 className="text-xl font-semibold text-ink max-sm:text-2xl">{t("title")}</h1>
          <p className="text-sm text-muted max-sm:text-xs max-sm:short:hidden">{t("subtitle")}</p>
        </div>

        {error && <p className="mt-2 rounded-xl bg-danger-soft px-4 py-2 text-sm text-danger">{error}</p>}

        <div className="mt-3 grid grid-cols-1 gap-3 max-sm:mt-2 max-sm:gap-2 md:grid-cols-2 lg:grid-cols-3">
          {/* ── Colonne 1 : patients abonnés ─────────────────────────── */}
          <section className={`${CARD} flex min-h-0 flex-col md:col-span-2 lg:col-span-1`}>
            <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
              <Users className="h-5 w-5 shrink-0 text-brand" strokeWidth={1.75} />
              {t("subscribersTitle")}
            </h2>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-app-bg px-3 py-2">
                <p className="text-lg font-semibold tabular-nums text-ink">
                  {active.length}
                  <span className="text-sm font-normal text-muted"> / {patientCount}</span>
                </p>
                <p className="text-[11px] leading-tight text-muted">{t("subscribersTile")}</p>
              </div>
              <div className="rounded-xl bg-ok-soft px-3 py-2">
                <p className="text-lg font-semibold tabular-nums text-ok">{eur(monthlyCents)}</p>
                <p className="text-[11px] leading-tight text-muted">{t("monthlyTile")}</p>
              </div>
            </div>

            {subscribers.length === 0 ? (
              <div className="mt-3 rounded-xl border border-dashed border-line px-4 py-4 text-center">
                <p className="text-sm font-medium text-ink">{t("emptyTitle")}</p>
                <p className="mx-auto mt-1 max-w-md text-xs text-muted">{t("emptyText", { days: TRIAL_DAYS })}</p>
              </div>
            ) : (
              <ul className="mt-3 min-h-0 divide-y divide-line overflow-y-auto max-sm:max-h-32 sm:max-h-[calc(100dvh-17rem)]">
                {subscribers.map((s) => (
                  <li key={s.patientId}>
                    <Link
                      href={`/dashboard/patients/${s.patientId}`}
                      className="flex items-center gap-3 py-2 transition hover:bg-app-bg max-sm:-mx-1 max-sm:px-1"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-ink">{s.name}</span>
                        <span className="block truncate text-xs text-muted">
                          {s.planLabel} ·{" "}
                          {s.status === "refused"
                            ? t("rowRefused")
                            : s.status === "cancelled"
                              ? t("rowCancelled", { date: shortDate(s.periodEnd) })
                              : t("rowNext", { date: shortDate(s.periodEnd) })}
                        </span>
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          s.status === "active" ? "bg-ok-soft text-ok" : s.status === "cancelled" ? "bg-app-bg text-muted" : "bg-danger-soft text-danger"
                        }`}
                      >
                        {s.status === "active" ? t("badgeActive") : s.status === "cancelled" ? t("badgeCancelled") : t("badgeRefused")}
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.75} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ── Colonne 2 : accès de mes patients ───────────────────── */}
          <div className="flex min-w-0 flex-col gap-3">
            <PhoneFold
              className={CARD}
              title={
                <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
                  <Tag className="h-5 w-5 shrink-0 text-brand" strokeWidth={1.75} />
                  {t("patientPaysTitle")}
                </h2>
              }
              summary={free ? t("patientPaysSummaryFree") : t("patientPaysSummary", { amount: eur(KINE_FOLLOW_UP_CENTS) })}
            >
              {/* Tarif libre (2026-11-19) : le montant de « Votre programme »
                  est lui-même le champ ; une coche l'enregistre. */}
              <form action={demo ? undefined : setKinePrice}>
              <table className="mt-2 w-full text-left text-xs">
                <tbody className="divide-y divide-line">
                  <tr>
                    <td className="py-1.5 pr-2 text-ink">
                      <label htmlFor="kine-price">{t("rowProgramme")}</label>
                    </td>
                    <td className="py-1 text-right">
                      <span className="inline-flex items-center gap-1">
                        <span className="relative">
                          <input
                            id="kine-price"
                            name="price"
                            inputMode="decimal"
                            autoComplete="off"
                            defaultValue={priceInput}
                            aria-label={t("priceAria")}
                            className="w-[5.5rem] rounded-lg border border-line bg-surface py-1 pl-2 pr-6 text-right text-xs font-semibold tabular-nums text-ok focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                          />
                          <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs font-semibold text-ok">{currencySymbol}</span>
                        </span>
                        <SubmitButton
                          pendingText="…"
                          aria-label={t("priceSave")}
                          title={t("priceSave")}
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand text-white transition hover:bg-brand-dark"
                        >
                          <Check className="h-4 w-4" strokeWidth={2.25} />
                        </SubmitButton>
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-1.5 text-ink">{t("rowAccess")}</td>
                    <td className="py-1.5 text-right tabular-nums text-ink">
                      {range(LOWEST_PLATFORM_CENTS, HIGHEST_PLATFORM_CENTS)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-1.5 font-medium text-ink">{t("rowTotal")}</td>
                    <td className="py-1.5 text-right font-medium tabular-nums text-ink">
                      {range(LOWEST_MONTHLY_TOTAL_CENTS, HIGHEST_MONTHLY_TOTAL_CENTS)}
                    </td>
                  </tr>
                </tbody>
              </table>
              </form>
              <p className="mt-2 text-[11px] leading-snug text-muted">
                {priceSaved && (
                  <span className="mr-1 inline-flex items-center gap-1 font-medium text-ok">
                    <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} />
                    {t("priceSaved")} ·
                  </span>
                )}
                {t("priceHelp", { max: wholeMoney(KINE_PRICE_MAX_CENTS) })}
              </p>
              <p className="mt-1 text-[11px] leading-snug text-muted">
                {free
                  ? t("patientPaysNoteFree", { days: TRIAL_DAYS })
                  : t("patientPaysNote", { amount: eur(KINE_FOLLOW_UP_CENTS), net: eur(Math.max(0, KINE_NET_CENTS)), days: TRIAL_DAYS })}
              </p>
            </PhoneFold>
          </div>

          {/* ── Colonne 3 : encaissement ───────────────────────────── */}
          <div className="flex min-w-0 flex-col gap-3">
            <ConnectCard status={connectStatus} />
          </div>
        </div>
      </div>
    </main>
  );
}

function ConnectCard({ status }: { status: ConnectStatus }) {
  const t = useTranslations("billing.facturation.connect");
  const s = {
    active: {
      box: "border-ok/30 bg-ok-soft",
      icon: <CheckCircle2 className="h-5 w-5 shrink-0 text-ok" strokeWidth={1.75} />,
      title: t("activeTitle"),
      titleClass: "text-ok",
      text: t("activeText"),
    },
    onboarding: {
      box: "border-warn/30 bg-warn-soft",
      icon: <Circle className="h-5 w-5 shrink-0 text-warn" strokeWidth={1.75} />,
      title: t("onboardingTitle"),
      titleClass: "text-warn",
      text: t("onboardingText"),
    },
    not_started: {
      box: "border-line bg-app-bg",
      icon: <Circle className="h-5 w-5 shrink-0 text-muted" strokeWidth={1.75} />,
      title: t("notStartedTitle"),
      titleClass: "text-ink",
      text: t("notStartedText"),
    },
  }[status];
  return (
    <PhoneFold
      className={CARD}
      title={<h2 className="text-base font-semibold text-ink">{t("cardTitle")}</h2>}
      summary={<span className={s.titleClass}>{status === "active" ? t("summaryActive") : status === "onboarding" ? t("summaryOnboarding") : t("summaryNotStarted")}</span>}
    >
      <div className={`mt-2 flex items-start gap-3 rounded-xl border px-3 py-2 ${s.box}`}>
        {s.icon}
        <div>
          <p className={`text-sm font-medium ${s.titleClass}`}>{s.title}</p>
          <p className="text-xs text-muted">{s.text}</p>
        </div>
      </div>
      <div className="mt-2">
        {status === "active" ? (
          <a
            href="https://dashboard.stripe.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-brand px-4 py-2 text-sm font-medium text-brand transition hover:bg-brand-soft"
          >
            {t("payouts")}
            <ExternalLink className="h-4 w-4" strokeWidth={1.75} />
          </a>
        ) : (
          <form action={startConnectOnboarding}>
            <SubmitButton pendingText={t("redirecting")} className="w-full rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-dark">
              {status === "onboarding" ? t("resume") : t("activate")}
            </SubmitButton>
          </form>
        )}
      </div>
    </PhoneFold>
  );
}
