import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { intlTag } from "@/lib/i18n/translator";
import type { Locale } from "@/i18n/locales";
import { CheckCircle2, ChevronRight, Circle, ExternalLink, Tag, Users } from "lucide-react";
import SubmitButton from "@/components/SubmitButton";
import PhoneFold from "@/components/PhoneFold";
import { HIGHEST_MONTHLY_TOTAL_CENTS, HIGHEST_PLATFORM_CENTS, LOWEST_MONTHLY_TOTAL_CENTS, LOWEST_PLATFORM_CENTS, KINE_FOLLOW_UP_CENTS, KINE_NET_CENTS, TRIAL_DAYS, eurosFR } from "@/lib/billing/patientPlans";
import { startConnectOnboarding } from "../connect/actions";

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
}: {
  connectStatus: ConnectStatus;
  subscribers: SubscriberRow[];
  /** Revenu mensuel moyen des formules en cours, pour le kiné (centimes). */
  monthlyCents: number;
  patientCount: number;
  error?: string;
}) {
  const active = subscribers.filter((s) => s.status !== "refused");
  const t = useTranslations("billing.facturation");
  const tf = useTranslations("billing.format");
  const locale = useLocale() as Locale;
  const eur = (cents: number) => tf("eur", { amount: eurosFR(cents, locale) });
  const shortDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(intlTag(locale), { day: "numeric", month: "short" }) : "");
  return (
    <main>
      <div className="mx-auto max-w-7xl p-3 max-sm:p-4 max-sm:pt-2 sm:p-5 short:sm:py-3">
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
              summary={t("patientPaysSummary", { amount: eur(KINE_FOLLOW_UP_CENTS) })}
            >
              <table className="mt-2 w-full text-left text-xs">
                <tbody className="divide-y divide-line">
                  <tr>
                    <td className="py-1.5 text-ink">{t("rowProgramme")}</td>
                    <td className="py-1.5 text-right font-semibold tabular-nums text-ok">{eur(KINE_FOLLOW_UP_CENTS)}</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 text-ink">{t("rowAccess")}</td>
                    <td className="py-1.5 text-right tabular-nums text-ink">
                      {tf("eurRange", { low: eurosFR(LOWEST_PLATFORM_CENTS, locale), high: eurosFR(HIGHEST_PLATFORM_CENTS, locale) })}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-1.5 font-medium text-ink">{t("rowTotal")}</td>
                    <td className="py-1.5 text-right font-medium tabular-nums text-ink">
                      {tf("eurRange", { low: eurosFR(LOWEST_MONTHLY_TOTAL_CENTS, locale), high: eurosFR(HIGHEST_MONTHLY_TOTAL_CENTS, locale) })}
                    </td>
                  </tr>
                </tbody>
              </table>
              <p className="mt-2 text-[11px] leading-snug text-muted">
                {t("patientPaysNote", { amount: eur(KINE_FOLLOW_UP_CENTS), net: eur(KINE_NET_CENTS), days: TRIAL_DAYS })}
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
