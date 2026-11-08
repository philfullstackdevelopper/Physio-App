import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { intlTag } from "@/lib/i18n/translator";
import type { Locale } from "@/i18n/locales";
import type { ReactNode } from "react";
import { ArrowLeft, CalendarClock, CheckCircle2, CreditCard, FileText, RefreshCw } from "lucide-react";
import PaywallVideo from "./PaywallVideo";
import SubmitButton from "@/components/SubmitButton";
import {
  EARLY_ACCESS_PLAN_KEY,
  KINE_FOLLOW_UP_CENTS,
  TRIAL_DAYS,
  eurosFR,
  isPlatformOfferKey,
  monthlyTotalCents,
  platformOffer,
  type PlatformOffer,
} from "@/lib/billing/patientPlans";
import { cancelPlan, changeCard, openInvoices, resumePlan } from "./actions";

// « Mon suivi » (patient) — modèle définitif (Philippe, 2026-11-04 ;
// lib/billing/patientPlans.ts). Trois offres côte à côte (empilées sur
// téléphone), « Le plus avantageux » sur l'engagement 6 mois. Chaque offre
// affiche son total mensuel en grand, et juste en dessous l'origine des deux
// montants (Philippe : « put 12.99 and underneath we explain exactly the
// origin of the sum with the TWO different aspects ») : l'accès à la
// plateforme, payé à EasyPhysio chaque mois, et le suivi du kiné, payé au
// kiné seulement les mois où il met à jour le programme. Séparé de page.tsx
// pour la démo. Tient sur un écran.
export type SuiviSubscription = {
  plan: string;
  status: string;
  periodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  /** Formule de l'ancien modèle (compte du kiné), plus vendue. */
  legacy?: boolean;
  /** Fin d'engagement de l'accès (ISO), lue chez Stripe. */
  commitUntil?: string | null;
  /** Fin programmée de l'abonnement (résiliation pendant l'engagement), ISO. */
  endsAt?: string | null;
};

export type SuiviViewProps = {
  sp: { error?: string; ok?: string; attente?: string; arret?: string; reprise?: string; carte?: string; paye?: string };
  kineName: string;
  /** Le kiné a activé ses paiements en ligne (Stripe). */
  kineReady: boolean;
  /** Pas encore d'accès : l'appli s'ouvre une fois l'abonnement souscrit. */
  required?: boolean;
  subscription: SuiviSubscription | null;
  /** Le kiné a déjà attribué au moins une séance (titre du paywall). */
  programmeReady?: boolean;
  /** Démo : les boutons ne mènent nulle part. */
  demo?: boolean;
  /** Honoraires du kiné à régler par le patient (ReviewPaymentNotice), s'il y en a. */
  paymentNotice?: ReactNode;
  /** Abonnement d'accès EasyPhysio : « Changer de carte » et « Mes factures ». */
  canManageCard?: boolean;
};

const card = "rounded-2xl border border-line bg-surface p-5 shadow-sm max-sm:border-0 max-sm:p-4 max-sm:shadow-soft short:p-4";

function dateFR(iso: string | null | undefined, locale: Locale): string {
  return iso ? new Date(iso).toLocaleDateString(intlTag(locale), { day: "numeric", month: "long", year: "numeric" }) : "";
}

/** Les deux montants qui composent le total, tels qu'ils figurent sur les deux factures. */
function Breakdown({ offer, kineName, compact = false }: { offer: PlatformOffer; kineName: string; compact?: boolean }) {
  const t = useTranslations("billing.suivi");
  const tf = useTranslations("billing.format");
  const locale = useLocale() as Locale;
  return (
    <ul className={`space-y-1 text-xs text-muted ${compact ? "" : "mt-2"}`}>
      <li className="flex gap-2">
        <span className="w-14 shrink-0 text-right font-semibold tabular-nums text-ink">{tf("eur", { amount: eurosFR(offer.platformCents, locale) })}</span>
        <span>{t("breakdownPlatform")}</span>
      </li>
      <li className="flex gap-2">
        <span className="w-14 shrink-0 text-right font-semibold tabular-nums text-ink">{tf("eur", { amount: eurosFR(KINE_FOLLOW_UP_CENTS, locale) })}</span>
        <span>{t("breakdownKine", { kineName })}</span>
      </li>
    </ul>
  );
}

function commitmentText(offer: PlatformOffer, t: (key: string, values?: Record<string, string | number>) => string): string {
  return offer.commitmentMonths ? t("commitment", { months: offer.commitmentMonths }) : t("noCommitment");
}

// Hors du composant : la règle react-hooks/purity refuse Date.now() dans le rendu.
const daysFromNow = (n: number) => new Date(Date.now() + n * 86_400_000);
const shortDay = (d: Date, locale: Locale) => d.toLocaleDateString(intlTag(locale), { day: "numeric", month: "short" });

export default function SuiviView({
  sp,
  kineName,
  kineReady,
  required = false,
  subscription,
  programmeReady = false,
  demo = false,
  paymentNotice = null,
  canManageCard = false,
}: SuiviViewProps) {
  const t = useTranslations("billing.suivi");
  const tf = useTranslations("billing.format");
  const tOffer = useTranslations("billing.offers");
  const locale = useLocale() as Locale;
  const date = (iso: string | null | undefined) => dateFR(iso, locale);
  const known = !!subscription && (isPlatformOfferKey(subscription.plan) || subscription.plan === EARLY_ACCESS_PLAN_KEY);
  const legacy = known && !!subscription!.legacy;
  const offer = known && isPlatformOfferKey(subscription!.plan) && !legacy ? platformOffer(subscription!.plan) : null;
  const live = known && (subscription!.status === "active" || subscription!.status === "trialing") && !required;
  const trialing = live && subscription!.status === "trialing";
  const refused = known && ["past_due", "unpaid", "incomplete"].includes(subscription!.status);
  const committed = !!subscription?.commitUntil && new Date(subscription.commitUntil) > new Date(0) ? subscription.commitUntil : null;
  const ending = !!subscription && (subscription.cancelAtPeriodEnd || !!subscription.endsAt);

  if (!live && kineReady) {
    return (
      <PaywallVideo
        kineName={kineName}
        trial={!subscription}
        refused={refused}
        error={sp.error}
        reminderLabel={shortDay(daysFromNow(TRIAL_DAYS - 2), locale)}
        firstChargeLabel={shortDay(daysFromNow(TRIAL_DAYS), locale)}
        programmeReady={programmeReady}
        demo={demo}
      />
    );
  }

  return (
    <main className="bg-app-bg p-4 pt-5 max-sm:bg-transparent max-sm:pt-2 sm:min-h-dvh sm:p-8 short:sm:py-5">
      <div className="mx-auto max-w-3xl">
        {!required && (
          <Link href="/patient/compte" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
            <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
            {t("back")}
          </Link>
        )}
        <h1 className="mt-1 text-2xl font-semibold text-ink">{t("title")}</h1>
        {required && !refused && (
          <p className="mt-1 text-sm text-muted">
            {t("lastStep")}{" "}
            <Link href="/patient/compte" className="underline">
              {t("myData")}
            </Link>
          </p>
        )}

        {sp.error && <p className="mt-3 rounded-xl bg-danger-soft p-3 text-sm text-danger">{sp.error}</p>}
        {sp.ok === "1" && (
          <p className="mt-3 flex items-center gap-1.5 rounded-xl bg-ok-soft p-3 text-sm text-ok">
            <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            {t("ok")}
            {/* Vrai chargement de page : on quitte l'écran plein écran du paiement pour l'appli. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/patient" className="ml-auto shrink-0 font-semibold underline">
              {t("seeProgramme")}
            </a>
          </p>
        )}
        {sp.attente === "1" && (
          <p className="mt-3 rounded-xl bg-warn-soft p-3 text-sm text-warn">{t("waiting")}</p>
        )}
        {sp.arret === "1" && <p className="mt-3 rounded-xl bg-ok-soft p-3 text-sm text-ok">{t("cancelled")}</p>}
        {sp.reprise === "1" && <p className="mt-3 rounded-xl bg-ok-soft p-3 text-sm text-ok">{t("resumed")}</p>}
        {sp.carte === "1" && <p className="mt-3 rounded-xl bg-ok-soft p-3 text-sm text-ok">{t("cardChanged")}</p>}
        {sp.paye === "1" && <p className="mt-3 rounded-xl bg-ok-soft p-3 text-sm text-ok">{t("reviewPaid")}</p>}
        {paymentNotice && <div className="mt-3">{paymentNotice}</div>}

        <section className={`mt-4 ${card}`}>
          {live ? (
            <div>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-muted">{trialing ? t("trialRunning") : t("myOffer")}</p>
                  <p className="mt-0.5 text-xl font-semibold text-ink">
                    {legacy
                      ? t("legacyPlan")
                      : offer
                        ? t("offerLine", { label: tOffer(offer.key), total: tf("eur", { amount: eurosFR(monthlyTotalCents(offer), locale) }) })
                        : t("platformAccess")}
                  </p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-ok-soft px-3 py-1 text-sm font-medium text-ok">
                  <CheckCircle2 className="h-4 w-4" strokeWidth={1.75} />
                  {t("accessOpen")}
                </span>
              </div>
              {offer && <Breakdown offer={offer} kineName={kineName} />}
              <p className="mt-3 flex items-center gap-2 text-sm text-ink">
                <CalendarClock className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.75} />
                {legacy
                  ? t("legacyUntil", { date: date(subscription!.periodEnd) })
                  : ending
                    ? t("endingUntil", { date: date(subscription!.endsAt ?? subscription!.periodEnd) })
                    : trialing
                      ? t("trialFirstCharge", { date: date(subscription!.periodEnd) })
                      : committed && new Date(committed) > new Date(subscription!.periodEnd ?? 0)
                        ? t("committedUntil", { date: date(committed) })
                        : offer
                          ? commitmentText({ ...offer, commitmentMonths: 0 }, t)
                          : t("cancelAnytime")}
              </p>
              {!legacy && canManageCard && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <form action={demo ? undefined : changeCard}>
                    <SubmitButton pendingText={t("opening")} className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-sm font-medium text-ink hover:bg-app-bg">
                      <CreditCard className="h-4 w-4" strokeWidth={1.75} />
                      {t("changeCard")}
                    </SubmitButton>
                  </form>
                  <form action={demo ? undefined : openInvoices}>
                    <SubmitButton pendingText={t("opening")} className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-sm font-medium text-ink hover:bg-app-bg">
                      <FileText className="h-4 w-4" strokeWidth={1.75} />
                      {t("invoices")}
                    </SubmitButton>
                  </form>
                </div>
              )}
              {!legacy && (
                <div className="mt-4 border-t border-line pt-4">
                  {ending ? (
                    <form action={demo ? undefined : resumePlan}>
                      <SubmitButton pendingText={t("saving")} className="inline-flex items-center gap-1.5 rounded-full border border-brand px-4 py-1.5 text-sm font-semibold text-brand hover:bg-brand-soft">
                        <RefreshCw className="h-4 w-4" strokeWidth={1.75} />
                        {t("undoCancel")}
                      </SubmitButton>
                    </form>
                  ) : (
                    <details>
                      <summary className="cursor-pointer list-none text-sm font-medium text-muted hover:text-danger [&::-webkit-details-marker]:hidden">
                        {t("cancelSummary")}
                      </summary>
                      <div className="mt-2 rounded-xl bg-danger-soft p-3">
                        <p className="text-sm text-ink">
                          {committed && new Date(committed) > new Date(subscription!.periodEnd ?? 0)
                            ? t("cancelCommitted", { date: date(committed) })
                            : t("cancelNow", { date: date(subscription!.periodEnd) })}
                        </p>
                        <form action={demo ? undefined : cancelPlan} className="mt-2">
                          <SubmitButton pendingText={t("cancelling")} className="w-full rounded-full bg-danger py-2 text-sm font-semibold text-white hover:brightness-95">
                            {t("confirmCancel")}
                          </SubmitButton>
                        </form>
                      </div>
                    </details>
                  )}
                </div>
              )}
            </div>
          ) : !kineReady ? (
            <p className="rounded-xl bg-app-bg px-3 py-2 text-sm text-muted">
              {t("kineNotReady", { kineName })}
            </p>
          ) : (
            <p className="text-sm text-muted">{t("none")}</p>
          )}
        </section>
      </div>
    </main>
  );
}
