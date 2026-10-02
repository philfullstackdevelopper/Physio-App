import { CheckCircle2, Circle, Euro, ExternalLink, Info, Lock, ShieldCheck, Users } from "lucide-react";
import SubmitButton from "@/components/SubmitButton";
import { TIERS, TIER_KEYS, type TierKey } from "@/lib/billing/plans";
import type { PatientCounts } from "@/lib/billing/patientCounts";
import type { MonthlySplit } from "@/lib/billing/platformFee";
import { startConnectOnboarding } from "../connect/actions";

const EUR = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

export type ConnectStatus = "active" | "onboarding" | "not_started";

// Affichage seul de la page Tarif & paiements (les données sont chargées
// par page.tsx). Règle de Philippe : tout doit tenir sur un écran, sans
// défiler, quel que soit l'appareil — PC (y compris un portable zoomé à
// 150 %, soit ~550 px de haut utiles), iPad et, autant que possible,
// téléphone. D'où des cartes compactes (p-4/p-5), deux colonnes dès lg,
// et la roue à côté de sa légende même sur téléphone.
export default function FacturationView({
  counts,
  prices,
  connectStatus,
  split,
  error,
  saved,
}: {
  counts: PatientCounts;
  prices: Record<TierKey, number>;
  connectStatus: ConnectStatus;
  split: MonthlySplit;
  error?: string;
  saved?: string;
}) {
  // Deux parts seulement (Philippe, 2026-09-11) : ce que le kiné reçoit, et
  // "frais EasyPhysio" qui regroupe la commission plateforme ET les frais
  // Stripe — pour que ce chiffre-là corresponde quasi exactement à ce qui
  // arrive vraiment sur son compte, sans un 3e poste à recalculer soi-même.
  const feesCents = split.platformFeeCents + split.stripeFeeCents;
  const feesRatePct = split.totalCents > 0 ? Math.round((feesCents / split.totalCents) * 100) : 18;
  const hasRevenue = split.totalCents > 0;
  const r = 44;
  const c = 2 * Math.PI * r;
  const netLen = hasRevenue ? (c * split.netCents) / split.totalCents : 0;

  const status = {
    active: {
      box: "border-ok/30 bg-ok-soft",
      icon: <CheckCircle2 className="h-5 w-5 shrink-0 text-ok" strokeWidth={1.75} />,
      title: "Paiements activés",
      titleClass: "text-ok",
      text: "Vos patients peuvent payer leurs abonnements en ligne.",
    },
    onboarding: {
      box: "border-warn/30 bg-warn-soft",
      icon: <Circle className="h-5 w-5 shrink-0 text-warn" strokeWidth={1.75} />,
      title: "Inscription en cours",
      titleClass: "text-warn",
      text: "Terminez l'inscription Stripe pour commencer à encaisser.",
    },
    not_started: {
      box: "border-line bg-app-bg",
      icon: <Circle className="h-5 w-5 shrink-0 text-muted" strokeWidth={1.75} />,
      title: "Paiements non activés",
      titleClass: "text-ink",
      text: "Activez votre compte de paiement pour que vos patients puissent s'abonner.",
    },
  }[connectStatus];

  // Une ligne chacune (icône + phrase courte) plutôt que trois colonnes de
  // texte : même message, trois fois moins de hauteur.
  const reassurance = [
    { icon: ShieldCheck, text: "Paiement 100 % sécurisé par Stripe" },
    { icon: Euro, text: "L'argent arrive directement sur votre compte" },
    { icon: Lock, text: "EasyPhysio ne stocke aucune donnée bancaire" },
  ];

  const stats = [
    { value: counts.total, label: "Au total" },
    { value: counts.active, label: "Abonnés" },
    ...TIER_KEYS.map((key) => ({
      value: counts.byTier[key],
      label: `${TIERS[key].label} · ${EUR.format(prices[key] / 100)}`,
    })),
  ];

  // sm:min-h-dvh + content-center : centré verticalement quand ça tient,
  // défilement normal sinon (jamais de contenu coupé — l'ancien
  // h-dvh + overflow-hidden coupait le bas sur un écran plus petit).
  // Pas de min-h-dvh sur téléphone : la barre de navigation du haut
  // s'ajoute déjà à la hauteur de la page.
  return (
    <main>
      <div className="mx-auto grid max-w-6xl content-center gap-3 p-3 sm:min-h-dvh sm:gap-4 sm:p-6 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl font-semibold text-ink">Tarifs et paiements</h1>
            <p className="mt-0.5 text-sm text-muted">
              Vos abonnés par offre, ce que vous touchez, et l&apos;activation de vos paiements.
            </p>
          </div>

          {error && <p className="rounded-xl bg-danger-soft px-4 py-2 text-sm text-danger">{error}</p>}
          {saved === "1" && (
            <p className="flex items-center gap-1.5 rounded-xl bg-ok-soft px-4 py-2 text-sm text-ok">
              <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              Tarif enregistré.
            </p>
          )}

          <section className="rounded-2xl border border-line bg-surface p-4">
            <h2 className="flex items-center gap-2 text-sm font-medium text-muted">
              <Users className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              Vos patients
            </h2>
            <div className="mt-3 grid grid-cols-5 gap-2 sm:gap-4">
              {stats.map((s) => (
                <div key={s.label} className="min-w-0">
                  <p className="text-xl font-semibold text-ink">{s.value}</p>
                  <p className="text-[11px] leading-tight text-muted sm:text-xs">{s.label}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="flex min-w-0 flex-1 flex-col rounded-2xl border border-line bg-surface p-4">
            <h2 className="text-base font-semibold text-ink">Encaisser vos patients</h2>

            <ul className="mt-2 space-y-1.5">
              {reassurance.map((item) => (
                <li key={item.text} className="flex items-center gap-2 text-sm text-muted">
                  <item.icon className="h-4 w-4 shrink-0 text-brand" strokeWidth={1.75} />
                  {item.text}
                </li>
              ))}
            </ul>

            <div className={`mt-3 flex items-start gap-3 rounded-xl border px-3 py-2 ${status.box}`}>
              {status.icon}
              <div>
                <p className={`text-sm font-medium ${status.titleClass}`}>{status.title}</p>
                <p className="text-sm text-muted">{status.text}</p>
              </div>
            </div>

            <div className="mt-auto pt-3">
              {connectStatus === "active" ? (
                <a
                  href="https://dashboard.stripe.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-brand px-4 py-2 text-sm font-medium text-brand transition hover:bg-brand-soft"
                >
                  Gérer mon compte Stripe
                  <ExternalLink className="h-4 w-4" strokeWidth={1.75} />
                </a>
              ) : (
                <form action={startConnectOnboarding}>
                  <SubmitButton
                    pendingText="Redirection…"
                    className="w-full rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-dark"
                  >
                    {connectStatus === "onboarding" ? "Reprendre l'inscription" : "Activer les paiements"}
                  </SubmitButton>
                </form>
              )}
            </div>
          </section>
        </div>

        {/* Roue de répartition : qui touche quoi sur ce que paient vos
            patients actuels, un mois plein, sans prorata d'entrée/sortie. */}
        <section className="flex min-w-0 flex-col justify-center rounded-2xl border border-line bg-surface p-4 sm:p-5">
          <h2 className="flex items-center gap-1.5 text-base font-semibold text-ink">
            Répartition de vos revenus
            <span title="Estimation sur un mois complet, à partir de vos patients abonnés aujourd'hui. Les frais regroupent la commission EasyPhysio et les frais Stripe (≈1,5 % + 0,25 € par paiement).">
              <Info
                className="h-4 w-4 shrink-0 text-muted"
                strokeWidth={1.75}
                aria-label="Estimation sur un mois complet, à partir de vos patients abonnés aujourd'hui. Les frais regroupent la commission EasyPhysio et les frais Stripe."
              />
            </span>
          </h2>
          <p className="mt-0.5 text-sm text-muted">
            {`Pour ${counts.active} patient${counts.active > 1 ? "s" : ""} abonné${counts.active > 1 ? "s" : ""} aujourd'hui, sur un mois complet.`}
          </p>

          <div className="mt-4 flex items-center justify-center gap-4 sm:gap-6">
            <div className="relative h-28 w-28 shrink-0 sm:h-36 sm:w-36">
              <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden="true">
                <circle cx="50" cy="50" r={r} fill="none" stroke="var(--color-line)" strokeWidth="10" />
                {hasRevenue && (
                  <>
                    <circle
                      cx="50"
                      cy="50"
                      r={r}
                      fill="none"
                      stroke="var(--color-ok)"
                      strokeWidth="10"
                      strokeDasharray={`${netLen} ${c - netLen}`}
                      strokeLinecap="butt"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r={r}
                      fill="none"
                      stroke="var(--color-danger)"
                      strokeWidth="10"
                      strokeDasharray={`${c - netLen} ${netLen}`}
                      strokeDashoffset={-netLen}
                      strokeLinecap="butt"
                    />
                  </>
                )}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-base font-semibold text-ink sm:text-lg">
                  {hasRevenue ? EUR.format(split.netCents / 100) : "—"}
                </span>
                <span className="text-[11px] text-muted">vous recevez</span>
              </div>
            </div>

            <dl className="w-full max-w-[220px] space-y-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-1.5 text-muted">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-ok" />
                  Vous recevez
                </dt>
                <dd className="font-semibold text-ok">{hasRevenue ? EUR.format(split.netCents / 100) : "—"}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-1.5 text-muted">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-danger" />
                  Frais ({feesRatePct}&nbsp;%)
                </dt>
                <dd className="font-semibold text-danger">{hasRevenue ? EUR.format(feesCents / 100) : "—"}</dd>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-line pt-2">
                <dt className="text-muted">Total encaissé</dt>
                <dd className="font-semibold text-ink">{hasRevenue ? EUR.format(split.totalCents / 100) : "—"}</dd>
              </div>
            </dl>
          </div>

          {!hasRevenue && (
            <p className="mt-3 text-center text-xs text-muted">Aucun patient abonné pour l&apos;instant.</p>
          )}
          {/* Caché sur téléphone pour tenir sur un écran — la même
              explication reste dans l'infobulle du titre. */}
          <p className="mt-3 hidden text-center text-[11px] leading-snug text-muted sm:block">
            Les frais regroupent la commission EasyPhysio et les frais Stripe (≈1,5&nbsp;% + 0,25&nbsp;€ par
            paiement) : « vous recevez » est ce qui arrive réellement sur votre compte.
          </p>
        </section>
      </div>
    </main>
  );
}
