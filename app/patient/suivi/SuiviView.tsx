import Link from "next/link";
import { AlertTriangle, ArrowLeft, CalendarClock, CheckCircle2, RefreshCw, ShieldCheck, Video } from "lucide-react";
import SubmitButton from "@/components/SubmitButton";
import { PATIENT_PLANS, eurosFR, isPatientPlanKey, patientPlan, perMonthCents } from "@/lib/billing/patientPlans";
import { cancelPlan, resumePlan, startPlan } from "./actions";

// « Mon suivi » (patient) — formules 1, 3 ou 6 mois (Philippe, 2026-11-02).
// Séparé de page.tsx pour être montré avec des données fictives dans la démo
// (/demo/patient?ecran=suivi). Tient sur un écran : les trois formules côte à
// côte sur ordinateur, l'une sous l'autre sur téléphone.
export type SuiviSubscription = {
  plan: string;
  status: string;
  periodEnd: string | null;
  cancelAtPeriodEnd: boolean;
};

export type SuiviViewProps = {
  sp: { error?: string; ok?: string; attente?: string; arret?: string; reprise?: string };
  kineName: string;
  /** Le kiné a activé les paiements en ligne (Stripe). */
  kineReady: boolean;
  /** Pas encore d'accès : l'appli s'ouvre une fois la formule payée. */
  required?: boolean;
  subscription: SuiviSubscription | null;
  /** Démo : les boutons ne mènent nulle part. */
  demo?: boolean;
};

const card = "rounded-2xl border border-line bg-surface p-5 shadow-sm max-sm:border-0 max-sm:p-4 max-sm:shadow-soft short:p-4";

function dateFR(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "";
}

function PlanChoice({ kineName, demo }: { kineName: string; demo: boolean }) {
  return (
    <form action={demo ? undefined : startPlan} className="mt-4">
      <fieldset>
        <legend className="sr-only">Choisissez votre formule</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          {PATIENT_PLANS.map((p, i) => (
            <label
              key={p.key}
              className="relative flex cursor-pointer flex-col rounded-2xl border-2 border-line bg-surface p-4 transition has-[:checked]:border-brand has-[:checked]:bg-brand-soft/40 max-sm:flex-row max-sm:items-center max-sm:gap-3 max-sm:p-3"
            >
              <input type="radio" name="plan" value={p.key} defaultChecked={i === 0} required className="sr-only" />
              {p.months === 6 && (
                <span className="absolute -top-2.5 right-3 rounded-full bg-brand px-2 py-0.5 text-[11px] font-semibold text-white">
                  Le plus avantageux
                </span>
              )}
              <span className="text-sm font-semibold text-ink max-sm:w-16 max-sm:shrink-0">{p.label}</span>
              <span className="mt-1 text-2xl font-semibold tabular-nums text-ink max-sm:mt-0 max-sm:text-xl">{eurosFR(p.priceCents)} €</span>
              <span className="text-xs text-muted max-sm:ml-auto">
                {p.months === 1 ? "par mois" : `soit ${eurosFR(perMonthCents(p))} € / mois`}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="mt-4 flex items-start gap-2 text-sm text-ink">
        <input type="checkbox" name="consent" required className="mt-1 h-4 w-4 shrink-0 accent-[var(--color-brand)]" />
        <span>
          J&apos;accepte le suivi de rééducation avec {kineName} au tarif de la formule choisie, renouvelée automatiquement à la
          fin de chaque période. Je peux résilier à tout moment depuis cette page.
        </span>
      </label>
      <SubmitButton
        pendingText="Redirection…"
        className="mt-3 w-full rounded-full bg-brand py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark"
      >
        Payer et accéder à mon programme
      </SubmitButton>
      <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-xs text-muted">
        <ShieldCheck className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
        Paiement sécurisé par Stripe, versé à votre kiné. Acte non remboursé par l&apos;Assurance Maladie.
      </p>
    </form>
  );
}

export default function SuiviView({ sp, kineName, kineReady, required = false, subscription, demo = false }: SuiviViewProps) {
  const plan = subscription && isPatientPlanKey(subscription.plan) ? patientPlan(subscription.plan) : null;
  const live = !!plan && (subscription!.status === "active" || subscription!.status === "trialing");
  const refused = !!plan && ["past_due", "unpaid", "incomplete"].includes(subscription!.status);

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
        <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted">
          <Video className="h-4 w-4 shrink-0 text-brand" strokeWidth={1.75} />
          Votre programme d&apos;exercices en vidéo, ajusté par {kineName} au fil de vos séances.
        </p>
        {required && !refused && (
          <p className="mt-3 rounded-xl bg-brand-soft p-3 text-sm text-ink">
            Dernière étape : choisissez votre formule pour accéder à votre programme.{" "}
            <Link href="/patient/compte" className="text-muted underline">
              Mes données (export, suppression)
            </Link>
          </p>
        )}

        {sp.error && <p className="mt-3 rounded-xl bg-danger-soft p-3 text-sm text-danger">{sp.error}</p>}
        {sp.ok === "1" && (
          <p className="mt-3 flex items-center gap-1.5 rounded-xl bg-ok-soft p-3 text-sm text-ok">
            <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            Paiement validé : votre suivi est actif.
            {/* Vrai chargement de page (pas une navigation interne) : on quitte
                l'écran plein écran du paiement pour l'appli. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/patient" className="ml-auto shrink-0 font-semibold underline">
              Voir mon programme
            </a>
          </p>
        )}
        {sp.attente === "1" && (
          <p className="mt-3 rounded-xl bg-warn-soft p-3 text-sm text-warn">Votre paiement est en cours de validation. Rechargez la page dans un instant.</p>
        )}
        {sp.arret === "1" && <p className="mt-3 rounded-xl bg-ok-soft p-3 text-sm text-ok">Résiliation enregistrée : plus aucun prélèvement après la période en cours.</p>}
        {sp.reprise === "1" && <p className="mt-3 rounded-xl bg-ok-soft p-3 text-sm text-ok">C&apos;est noté : votre formule continue.</p>}

        <section className={`mt-4 ${card}`}>
          {live ? (
            <div>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-muted">Ma formule</p>
                  <p className="mt-0.5 text-2xl font-semibold text-ink">
                    {plan!.label} · <span className="tabular-nums">{eurosFR(plan!.priceCents)} €</span>
                  </p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-ok-soft px-3 py-1 text-sm font-medium text-ok">
                  <CheckCircle2 className="h-4 w-4" strokeWidth={1.75} />
                  Actif
                </span>
              </div>
              <p className="mt-3 flex items-center gap-2 text-sm text-ink">
                <CalendarClock className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.75} />
                {subscription!.cancelAtPeriodEnd
                  ? `Résiliée : accès jusqu'au ${dateFR(subscription!.periodEnd)}, plus aucun prélèvement.`
                  : `Renouvelée automatiquement le ${dateFR(subscription!.periodEnd)}.`}
              </p>
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
                      Résilier ma formule
                    </summary>
                    <div className="mt-2 rounded-xl bg-danger-soft p-3">
                      <p className="text-sm text-ink">
                        Vous gardez l&apos;accès jusqu&apos;au {dateFR(subscription!.periodEnd)}, puis plus aucun prélèvement.
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
            </div>
          ) : !kineReady ? (
            <p className="rounded-xl bg-app-bg px-3 py-2 text-sm text-muted">
              {kineName} n&apos;a pas encore activé les paiements en ligne. Le suivi sera disponible dès que ce sera fait.
            </p>
          ) : (
            <div>
              {refused && (
                <p className="flex items-start gap-2 rounded-xl bg-danger-soft p-3 text-sm text-danger">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
                  Le dernier paiement de votre formule a été refusé. Choisissez à nouveau une formule pour retrouver votre programme.
                </p>
              )}
              <p className="text-base font-semibold text-ink max-sm:text-sm">Choisissez votre formule</p>
              <PlanChoice kineName={kineName} demo={demo} />
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
