import Link from "next/link";
import { ArrowLeft, CalendarClock, CheckCircle2, RefreshCw } from "lucide-react";
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
  /** Le kiné a déjà attribué au moins une séance (titre du paywall). */
  programmeReady?: boolean;
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

export default function SuiviView({ sp, kineName, kineReady, required = false, subscription, programmeReady = false, demo = false }: SuiviViewProps) {
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
        reminderLabel={shortDay(daysFromNow(TRIAL_DAYS - 2))}
        firstChargeLabel={shortDay(daysFromNow(TRIAL_DAYS))}
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
              {kineName} ne propose pas de suivi pour le moment.
            </p>
          ) : (
            <p className="text-sm text-muted">Aucun abonnement en cours.</p>
          )}
        </section>
      </div>
    </main>
  );
}
