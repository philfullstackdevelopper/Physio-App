import Link from "next/link";
import { AlertTriangle, ArrowLeft, Bell, CalendarClock, CheckCircle2, CreditCard, LockOpen, RefreshCw } from "lucide-react";
import OfferPicker from "./OfferPicker";
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
import { cancelPlan, resumePlan } from "./actions";

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
  sp: { error?: string; ok?: string; attente?: string; arret?: string; reprise?: string };
  kineName: string;
  /** Le kiné a activé ses paiements en ligne (Stripe). */
  kineReady: boolean;
  /** Pas encore d'accès : l'appli s'ouvre une fois l'abonnement souscrit. */
  required?: boolean;
  subscription: SuiviSubscription | null;
  /** Démo : les boutons ne mènent nulle part. */
  demo?: boolean;
};

const card = "rounded-2xl border border-line bg-surface p-5 shadow-sm max-sm:border-0 max-sm:p-4 max-sm:shadow-soft short:p-4";

function dateFR(iso: string | null | undefined): string {
  return iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "";
}

/** Les deux montants qui composent le total, tels qu'ils figurent sur les deux factures. */
function Breakdown({ offer, kineName, compact = false }: { offer: PlatformOffer; kineName: string; compact?: boolean }) {
  return (
    <ul className={`space-y-1 text-xs text-muted ${compact ? "" : "mt-2"}`}>
      <li className="flex gap-2">
        <span className="w-14 shrink-0 text-right font-semibold tabular-nums text-ink">{eurosFR(offer.platformCents)} €</span>
        <span>accès à la plateforme EasyPhysio, chaque mois (payé à EasyPhysio)</span>
      </li>
      <li className="flex gap-2">
        <span className="w-14 shrink-0 text-right font-semibold tabular-nums text-ink">{eurosFR(KINE_FOLLOW_UP_CENTS)} €</span>
        <span>suivi par {kineName}, uniquement les mois où il met à jour votre programme (payé à votre kiné)</span>
      </li>
    </ul>
  );
}

function commitmentText(offer: PlatformOffer): string {
  return offer.commitmentMonths
    ? `Accès engagé ${offer.commitmentMonths} mois, puis au même prix, résiliable à tout moment.`
    : "Sans engagement, résiliable à tout moment.";
}

// Hors du composant : la règle react-hooks/purity refuse Date.now() dans le rendu.
const daysFromNow = (n: number) => new Date(Date.now() + n * 86_400_000);
const shortDay = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "K") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

/**
 * Paywall (proposition A retenue par Philippe le 2026-11-04, inspirée des
 * paywalls Blinkist / Strava) : ce que voit TOUT patient juste après avoir
 * rejoint son kiné. Ordinateur : à gauche son kiné et le déroulé de l'essai,
 * à droite les offres ; téléphone : l'un sous l'autre, frise de l'essai en une
 * ligne. Tient sur un écran (règle « pas de défilement »).
 */
function Paywall({
  kineName,
  trial,
  refused,
  error,
  demo,
}: {
  kineName: string;
  trial: boolean;
  refused: boolean;
  error?: string;
  demo: boolean;
}) {
  const reminder = shortDay(daysFromNow(TRIAL_DAYS - 2));
  const firstCharge = shortDay(daysFromNow(TRIAL_DAYS));
  const steps = [
    { icon: LockOpen, title: "Aujourd'hui", text: "Accès complet, gratuit" },
    { icon: Bell, title: reminder, text: "On vous prévient" },
    { icon: CreditCard, title: firstCharge, text: "1er paiement" },
  ];
  return (
    <main className="min-h-dvh bg-[#f6f8fd] px-4 py-3 sm:px-8 sm:py-8 short:sm:py-4">
      <div className="mx-auto grid max-w-4xl items-center gap-3 md:grid-cols-[0.9fr_1.1fr] md:gap-10">
        {/* Qui, et comment se passe l'essai */}
        <div>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
              {initials(kineName)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">{kineName}</p>
              <p className="text-xs text-slate-500">vous a préparé votre programme</p>
            </div>
          </div>
          <h1 className="font-display mt-4 text-2xl font-semibold leading-tight tracking-tight text-slate-900 max-sm:mt-2 max-sm:text-xl sm:text-3xl short:sm:text-2xl">
            {trial ? `${TRIAL_DAYS} jours offerts pour démarrer` : "Reprenez votre programme"}
          </h1>
          {trial ? (
            <ol className="mt-5 space-y-4 max-md:mt-3 max-md:grid max-md:grid-cols-3 max-md:gap-2 max-md:space-y-0 short:md:mt-3 short:md:space-y-3">
              {steps.map(({ icon: Icon, title, text }) => (
                <li key={text} className="flex items-center gap-3 max-md:flex-col max-md:items-start max-md:gap-1.5 max-md:rounded-xl max-md:bg-white max-md:p-2">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 max-md:h-7 max-md:w-7">
                    <Icon className="h-4 w-4" strokeWidth={2} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-slate-900 max-md:text-xs">{title}</span>
                    <span className="block text-sm text-slate-500 max-md:text-[11px] max-md:leading-tight">{text}</span>
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-2 text-sm text-slate-500">Choisissez une offre pour retrouver vos exercices.</p>
          )}
        </div>

        {/* Les offres */}
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70 max-sm:p-3">
          {(refused || error) && (
            <p role="alert" className="mb-3 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
              {error ?? "Le dernier paiement a été refusé. Choisissez à nouveau une offre."}
            </p>
          )}
          <OfferPicker kineName={kineName} trial={trial} firstChargeLabel={firstCharge} demo={demo} />
        </div>
      </div>
      <p className="mx-auto mt-4 max-w-4xl text-center text-xs text-slate-400 max-sm:mt-2">
        <Link href="/patient/compte" className="hover:text-slate-600 hover:underline">
          Mes données (export, suppression)
        </Link>
      </p>
    </main>
  );
}

export default function SuiviView({ sp, kineName, kineReady, required = false, subscription, demo = false }: SuiviViewProps) {
  const known = !!subscription && (isPlatformOfferKey(subscription.plan) || subscription.plan === EARLY_ACCESS_PLAN_KEY);
  const legacy = known && !!subscription!.legacy;
  const offer = known && isPlatformOfferKey(subscription!.plan) && !legacy ? platformOffer(subscription!.plan) : null;
  const live = known && (subscription!.status === "active" || subscription!.status === "trialing") && !required;
  const trialing = live && subscription!.status === "trialing";
  const refused = known && ["past_due", "unpaid", "incomplete"].includes(subscription!.status);
  const committed = !!subscription?.commitUntil && new Date(subscription.commitUntil) > new Date(0) ? subscription.commitUntil : null;
  const ending = !!subscription && (subscription.cancelAtPeriodEnd || !!subscription.endsAt);

  if (!live && kineReady) {
    return <Paywall kineName={kineName} trial={!subscription} refused={refused} error={sp.error} demo={demo} />;
  }

  return (
    <main className="bg-app-bg p-4 pt-5 max-sm:bg-transparent max-sm:pt-2 sm:min-h-dvh sm:p-8 short:sm:py-5">
      <div className="mx-auto max-w-3xl">
        {!required && (
          <Link href="/patient/compte" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
            <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
            Paramètres
          </Link>
        )}
        <h1 className="mt-1 text-2xl font-semibold text-ink">Mon suivi</h1>
        {required && !refused && (
          <p className="mt-1 text-sm text-muted">
            Dernière étape avant votre programme.{" "}
            <Link href="/patient/compte" className="underline">
              Mes données (export, suppression)
            </Link>
          </p>
        )}

        {sp.error && <p className="mt-3 rounded-xl bg-danger-soft p-3 text-sm text-danger">{sp.error}</p>}
        {sp.ok === "1" && (
          <p className="mt-3 flex items-center gap-1.5 rounded-xl bg-ok-soft p-3 text-sm text-ok">
            <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            C&apos;est fait : votre suivi est actif.
            {/* Vrai chargement de page : on quitte l'écran plein écran du paiement pour l'appli. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/patient" className="ml-auto shrink-0 font-semibold underline">
              Voir mon programme
            </a>
          </p>
        )}
        {sp.attente === "1" && (
          <p className="mt-3 rounded-xl bg-warn-soft p-3 text-sm text-warn">Votre inscription est en cours de validation. Rechargez la page dans un instant.</p>
        )}
        {sp.arret === "1" && <p className="mt-3 rounded-xl bg-ok-soft p-3 text-sm text-ok">Résiliation enregistrée.</p>}
        {sp.reprise === "1" && <p className="mt-3 rounded-xl bg-ok-soft p-3 text-sm text-ok">C&apos;est noté : votre suivi continue.</p>}

        <section className={`mt-4 ${card}`}>
          {live ? (
            <div>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-muted">{trialing ? "Essai gratuit en cours" : "Mon offre"}</p>
                  <p className="mt-0.5 text-xl font-semibold text-ink">
                    {legacy ? "Formule de lancement" : offer ? `${offer.label} · ${eurosFR(monthlyTotalCents(offer))} € / mois` : "Accès à la plateforme"}
                  </p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-ok-soft px-3 py-1 text-sm font-medium text-ok">
                  <CheckCircle2 className="h-4 w-4" strokeWidth={1.75} />
                  Accès ouvert
                </span>
              </div>
              {offer && <Breakdown offer={offer} kineName={kineName} />}
              <p className="mt-3 flex items-center gap-2 text-sm text-ink">
                <CalendarClock className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.75} />
                {legacy
                  ? `Valable jusqu'au ${dateFR(subscription!.periodEnd)}, sans renouvellement. Vous pourrez ensuite choisir une offre.`
                  : ending
                    ? `Résilié : accès jusqu'au ${dateFR(subscription!.endsAt ?? subscription!.periodEnd)}, puis plus aucun prélèvement.`
                    : trialing
                      ? `Premier prélèvement de l'accès le ${dateFR(subscription!.periodEnd)}. Rien n'est prélevé avant.`
                      : committed && new Date(committed) > new Date(subscription!.periodEnd ?? 0)
                        ? `Engagé jusqu'au ${dateFR(committed)}, puis au même prix, résiliable à tout moment.`
                        : offer
                          ? commitmentText({ ...offer, commitmentMonths: 0 })
                          : "Résiliable à tout moment."}
              </p>
              {!legacy && (
                <div className="mt-4 border-t border-line pt-4">
                  {ending ? (
                    <form action={demo ? undefined : resumePlan}>
                      <SubmitButton pendingText="Enregistrement…" className="inline-flex items-center gap-1.5 rounded-full border border-brand px-4 py-1.5 text-sm font-semibold text-brand hover:bg-brand-soft">
                        <RefreshCw className="h-4 w-4" strokeWidth={1.75} />
                        Annuler la résiliation
                      </SubmitButton>
                    </form>
                  ) : (
                    <details>
                      <summary className="cursor-pointer list-none text-sm font-medium text-muted hover:text-danger [&::-webkit-details-marker]:hidden">
                        Résilier mon suivi
                      </summary>
                      <div className="mt-2 rounded-xl bg-danger-soft p-3">
                        <p className="text-sm text-ink">
                          {committed && new Date(committed) > new Date(subscription!.periodEnd ?? 0)
                            ? `Votre accès est engagé jusqu'au ${dateFR(committed)} : la résiliation prendra effet à cette date (l'accès reste dû jusque-là). Votre kiné, lui, ne prélève rien les mois sans mise à jour.`
                            : `Vous gardez l'accès jusqu'au ${dateFR(subscription!.periodEnd)}, puis plus aucun prélèvement, ni par EasyPhysio ni par votre kiné.`}
                        </p>
                        <form action={demo ? undefined : cancelPlan} className="mt-2">
                          <SubmitButton pendingText="Résiliation…" className="w-full rounded-full bg-danger py-2 text-sm font-semibold text-white hover:brightness-95">
                            Confirmer la résiliation
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
              {kineName} n&apos;a pas encore activé ses paiements en ligne. Le suivi sera disponible dès que ce sera fait.
            </p>
          ) : (
            <p className="text-sm text-muted">Aucun abonnement en cours.</p>
          )}
        </section>
      </div>
    </main>
  );
}
