import Link from "next/link";
import { AlertTriangle, ArrowLeft, CalendarClock, CheckCircle2, RefreshCw, ShieldCheck, Smartphone, UserRound } from "lucide-react";
import SubmitButton from "@/components/SubmitButton";
import {
  ACCESS_PLAN_KEY,
  KINE_FOLLOW_UP_CENTS,
  PATIENT_MONTHLY_TOTAL_CENTS,
  PLATFORM_ACCESS_TTC_CENTS,
  TRIAL_DAYS,
  eurosFR,
  isLegacyPlanKey,
} from "@/lib/billing/patientPlans";
import { cancelPlan, resumePlan, startPlan } from "./actions";

// « Mon suivi » (patient) — modèle définitif (Philippe, 2026-11-04 ;
// lib/billing/patientPlans.ts) : 9,99 € par mois = 3,99 € d'accès à la
// plateforme (EasyPhysio, chaque mois) + 6,00 € de programme du kiné (le kiné,
// seulement les mois où il met à jour le programme). Deux vendeurs, deux
// paiements, deux factures, affichés AVANT l'engagement. 10 jours d'essai la
// première fois. Séparé de page.tsx pour être montré avec des données
// fictives dans la démo. Tient sur un écran.
export type SuiviSubscription = {
  plan: string;
  status: string;
  periodEnd: string | null;
  cancelAtPeriodEnd: boolean;
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

function dateFR(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "";
}

/** Les deux lignes qui composent les 9,99 €, telles qu'elles figurent sur les factures. */
function Breakdown({ kineName }: { kineName: string }) {
  return (
    <ul className="mt-3 divide-y divide-line rounded-xl border border-line text-sm">
      <li className="flex items-start gap-3 p-3">
        <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-brand" strokeWidth={1.75} />
        <span className="min-w-0 flex-1">
          <span className="font-medium text-ink">Accès à la plateforme EasyPhysio</span>
          <span className="block text-xs text-muted">Chaque mois : application, vidéos, messagerie, hébergement sécurisé de vos données de santé. Facturé par EasyPhysio, TVA incluse.</span>
        </span>
        <span className="shrink-0 font-semibold tabular-nums text-ink">{eurosFR(PLATFORM_ACCESS_TTC_CENTS)} €</span>
      </li>
      <li className="flex items-start gap-3 p-3">
        <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-brand" strokeWidth={1.75} />
        <span className="min-w-0 flex-1">
          <span className="font-medium text-ink">Programme de {kineName}</span>
          <span className="block text-xs text-muted">Seulement les mois où {kineName} met à jour votre programme. Payé directement à votre kiné, note d&apos;honoraires à son nom.</span>
        </span>
        <span className="shrink-0 font-semibold tabular-nums text-ink">{eurosFR(KINE_FOLLOW_UP_CENTS)} €</span>
      </li>
    </ul>
  );
}

// Hors du composant : la règle react-hooks/purity refuse Date.now() dans le rendu.
const trialEndISO = () => new Date(Date.now() + TRIAL_DAYS * 86_400_000).toISOString();

function Subscribe({ kineName, trial, demo }: { kineName: string; trial: boolean; demo: boolean }) {
  const start = trialEndISO();
  return (
    <form action={demo ? undefined : startPlan}>
      <p className="flex flex-wrap items-baseline gap-x-2">
        {trial && <span className="text-2xl font-semibold text-ink max-sm:text-xl">{TRIAL_DAYS} jours offerts,</span>}
        <span className="text-base text-ink">
          {trial ? "puis " : ""}
          <span className="font-semibold tabular-nums">{eurosFR(PATIENT_MONTHLY_TOTAL_CENTS)} € par mois</span> au plus
        </span>
      </p>
      <Breakdown kineName={kineName} />
      <label className="mt-3 flex items-start gap-2 text-sm text-ink">
        <input type="checkbox" name="consent" required className="mt-1 h-4 w-4 shrink-0 accent-[var(--color-brand)]" />
        <span>
          J&apos;accepte l&apos;accès à la plateforme EasyPhysio à {eurosFR(PLATFORM_ACCESS_TTC_CENTS)} € TTC par mois, prélevé par
          EasyPhysio{trial ? ` à partir du ${dateFR(start)}` : ""}, et les honoraires de {kineName} de {eurosFR(KINE_FOLLOW_UP_CENTS)} € les
          mois où il met à jour mon programme, prélevés par lui. Je peux résilier à tout moment depuis cette page.
        </span>
      </label>
      <SubmitButton
        pendingText="Redirection…"
        className="mt-3 w-full rounded-full bg-brand py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark"
      >
        {trial ? `Commencer mes ${TRIAL_DAYS} jours gratuits` : "Activer mon suivi"}
      </SubmitButton>
      <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-xs text-muted">
        <ShieldCheck className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
        {trial ? "Rien n'est prélevé pendant l'essai. " : ""}Paiement sécurisé par Stripe. Acte non remboursé par l&apos;Assurance Maladie.
      </p>
    </form>
  );
}

export default function SuiviView({ sp, kineName, kineReady, required = false, subscription, demo = false }: SuiviViewProps) {
  const known = !!subscription && (subscription.plan === ACCESS_PLAN_KEY || isLegacyPlanKey(subscription.plan));
  const legacy = known && isLegacyPlanKey(subscription!.plan);
  const live = known && (subscription!.status === "active" || subscription!.status === "trialing") && !required;
  const trialing = live && subscription!.status === "trialing";
  const refused = known && ["past_due", "unpaid", "incomplete"].includes(subscription!.status);

  return (
    <main className="bg-app-bg p-4 pt-5 max-sm:bg-transparent max-sm:pt-2 sm:min-h-dvh sm:p-8 short:sm:py-5">
      <div className="mx-auto max-w-2xl">
        {!required && (
          <Link href="/patient/compte" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
            <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
            Paramètres
          </Link>
        )}
        <h1 className="mt-1 text-2xl font-semibold text-ink">Mon suivi</h1>
        {required && !refused && (
          <p className="mt-2 text-sm text-muted">
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
        {sp.arret === "1" && <p className="mt-3 rounded-xl bg-ok-soft p-3 text-sm text-ok">Résiliation enregistrée : plus aucun prélèvement après la période en cours.</p>}
        {sp.reprise === "1" && <p className="mt-3 rounded-xl bg-ok-soft p-3 text-sm text-ok">C&apos;est noté : votre suivi continue.</p>}

        <section className={`mt-4 ${card}`}>
          {live ? (
            <div>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-muted">Mon suivi</p>
                  <p className="mt-0.5 text-xl font-semibold text-ink">
                    {legacy ? "Formule de lancement" : trialing ? "Essai gratuit en cours" : "Actif"}
                  </p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-ok-soft px-3 py-1 text-sm font-medium text-ok">
                  <CheckCircle2 className="h-4 w-4" strokeWidth={1.75} />
                  Accès ouvert
                </span>
              </div>
              <p className="mt-3 flex items-center gap-2 text-sm text-ink">
                <CalendarClock className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.75} />
                {legacy
                  ? `Valable jusqu'au ${dateFR(subscription!.periodEnd)}, sans renouvellement. Vous pourrez ensuite passer au suivi mensuel.`
                  : subscription!.cancelAtPeriodEnd
                    ? `Résilié : accès jusqu'au ${dateFR(subscription!.periodEnd)}, plus aucun prélèvement.`
                    : trialing
                      ? `Premier prélèvement le ${dateFR(subscription!.periodEnd)}. Rien n'est prélevé avant.`
                      : `Prochain prélèvement de l'accès le ${dateFR(subscription!.periodEnd)}.`}
              </p>
              {!legacy && <Breakdown kineName={kineName} />}
              {!legacy && (
                <div className="mt-4 border-t border-line pt-4">
                  {subscription!.cancelAtPeriodEnd ? (
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
                          Vous gardez l&apos;accès jusqu&apos;au {dateFR(subscription!.periodEnd)}, puis plus aucun prélèvement, ni par EasyPhysio ni
                          par votre kiné.
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
            <div>
              {refused && (
                <p className="mb-3 flex items-start gap-2 rounded-xl bg-danger-soft p-3 text-sm text-danger">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
                  Le dernier paiement a été refusé. Enregistrez une carte valide pour retrouver votre programme.
                </p>
              )}
              <Subscribe kineName={kineName} trial={!subscription} demo={demo} />
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
