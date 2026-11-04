import Link from "next/link";
import { CheckCircle2, ChevronRight, Circle, ExternalLink, Gift, Tag, Users, Wallet } from "lucide-react";
import SubmitButton from "@/components/SubmitButton";
import PhoneFold from "@/components/PhoneFold";
import { PATIENT_PLANS, eurosFR, perMonthCents } from "@/lib/billing/patientPlans";
import { startConnectOnboarding } from "../connect/actions";
import { setAccessMode } from "./actions";

// Page « Suivi & facturation » du kiné — modèle du 2026-11-02 (Philippe) :
// l'appli est GRATUITE pour le kiné ; ses patients paient une formule
// 1 / 3 / 6 mois, versée sur son compte Stripe (6,99 € / 13,99 € / 20,99 €
// pour lui). Il peut aussi offrir l'accès (gratuit). Tient sur un écran :
// trois colonnes sur ordinateur, cartes repliables sur téléphone.

export type ConnectStatus = "active" | "onboarding" | "not_started";

export type SubscriberRow = {
  patientId: string;
  name: string;
  planLabel: string;
  status: "active" | "cancelled" | "refused";
  periodEnd: string | null;
};

const eur = (cents: number) => `${eurosFR(cents)} €`;
const shortDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : "");

const SAVED: Record<string, string> = {
  acces: "Accès de vos patients enregistré.",
};

const CARD = "rounded-2xl border border-line bg-surface p-4 sm:p-5 max-sm:border-0 max-sm:shadow-soft max-sm:short:p-3";

export default function FacturationView({
  free,
  connectStatus,
  subscribers,
  monthlyCents,
  patientCount,
  error,
  saved,
}: {
  /** Le kiné offre l'accès à ses patients (tarif 0 €). */
  free: boolean;
  connectStatus: ConnectStatus;
  subscribers: SubscriberRow[];
  /** Revenu mensuel moyen des formules en cours, pour le kiné (centimes). */
  monthlyCents: number;
  patientCount: number;
  error?: string;
  saved?: string;
}) {
  const active = subscribers.filter((s) => s.status !== "refused");
  return (
    <main>
      <div className="mx-auto max-w-7xl p-3 max-sm:p-4 max-sm:pt-2 sm:p-5 short:sm:py-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
          <h1 className="text-xl font-semibold text-ink max-sm:text-2xl">Suivi &amp; facturation</h1>
          <p className="text-sm text-muted max-sm:text-xs max-sm:short:hidden">
            EasyPhysio est gratuit pour vous. Vos patients paient leur formule, versée sur votre compte.
          </p>
        </div>

        {error && <p className="mt-2 rounded-xl bg-danger-soft px-4 py-2 text-sm text-danger">{error}</p>}
        {saved && (
          <p className="mt-2 flex items-center gap-1.5 rounded-xl bg-ok-soft px-4 py-2 text-sm text-ok">
            <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            {SAVED[saved] ?? "Enregistré."}
          </p>
        )}

        <div className="mt-3 grid grid-cols-1 gap-3 max-sm:mt-2 max-sm:gap-2 md:grid-cols-2 lg:grid-cols-3">
          {/* ── Colonne 1 : patients abonnés ─────────────────────────── */}
          <section className={`${CARD} flex min-h-0 flex-col md:col-span-2 lg:col-span-1`}>
            <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
              <Users className="h-5 w-5 shrink-0 text-brand" strokeWidth={1.75} />
              Mes patients abonnés
            </h2>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-app-bg px-3 py-2">
                <p className="text-lg font-semibold tabular-nums text-ink">
                  {active.length}
                  <span className="text-sm font-normal text-muted"> / {patientCount}</span>
                </p>
                <p className="text-[11px] leading-tight text-muted">patients abonnés</p>
              </div>
              <div className="rounded-xl bg-ok-soft px-3 py-2">
                <p className="text-lg font-semibold tabular-nums text-ok">{eur(monthlyCents)}</p>
                <p className="text-[11px] leading-tight text-muted">pour vous, par mois en moyenne</p>
              </div>
            </div>

            {subscribers.length === 0 ? (
              <div className="mt-3 rounded-xl border border-dashed border-line px-4 py-4 text-center">
                <p className="text-sm font-medium text-ink">Aucun patient abonné pour l&apos;instant.</p>
                <p className="mx-auto mt-1 max-w-md text-xs text-muted">
                  {free
                    ? "Vous offrez l'accès : vos patients entrent sans payer."
                    : "Vos patients choisissent leur formule dans l'appli, juste après leur inscription."}
                </p>
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
                            ? "paiement refusé"
                            : s.status === "cancelled"
                              ? `résiliée, fin le ${shortDate(s.periodEnd)}`
                              : `renouvelée le ${shortDate(s.periodEnd)}`}
                        </span>
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          s.status === "active" ? "bg-ok-soft text-ok" : s.status === "cancelled" ? "bg-app-bg text-muted" : "bg-danger-soft text-danger"
                        }`}
                      >
                        {s.status === "active" ? "Actif" : s.status === "cancelled" ? "Résiliée" : "Refusé"}
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
                  Accès de mes patients
                </h2>
              }
              summary={free ? "Gratuit" : "Formules payantes"}
            >
              <form action={setAccessMode} className="mt-2 grid grid-cols-2 gap-2">
                <button
                  name="mode"
                  value="paid"
                  className={`rounded-xl border-2 px-3 py-2 text-left text-sm transition ${
                    !free ? "border-brand bg-brand-soft/50 text-ink" : "border-line bg-surface text-muted hover:border-brand/40"
                  }`}
                >
                  <span className="flex items-center gap-1.5 font-semibold">
                    <Wallet className="h-4 w-4" strokeWidth={1.75} />
                    Payant
                  </span>
                  <span className="block text-[11px] leading-tight">Vos patients choisissent une formule</span>
                </button>
                <button
                  name="mode"
                  value="free"
                  className={`rounded-xl border-2 px-3 py-2 text-left text-sm transition ${
                    free ? "border-brand bg-brand-soft/50 text-ink" : "border-line bg-surface text-muted hover:border-brand/40"
                  }`}
                >
                  <span className="flex items-center gap-1.5 font-semibold">
                    <Gift className="h-4 w-4" strokeWidth={1.75} />
                    Gratuit
                  </span>
                  <span className="block text-[11px] leading-tight">Vous offrez l&apos;accès</span>
                </button>
              </form>
              <table className="mt-3 w-full text-left text-xs">
                <thead className="text-muted">
                  <tr>
                    <th className="pb-1 font-medium">Formule</th>
                    <th className="pb-1 font-medium">Le patient paie</th>
                    <th className="pb-1 text-right font-medium">Vous recevez</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {PATIENT_PLANS.map((p) => (
                    <tr key={p.key}>
                      <td className="py-1.5 font-medium text-ink">{p.label}</td>
                      <td className="py-1.5 tabular-nums text-ink">
                        {eur(p.priceCents)}
                        {p.months > 1 && <span className="text-muted"> ({eur(perMonthCents(p))}/mois)</span>}
                      </td>
                      <td className="py-1.5 text-right font-semibold tabular-nums text-ok">{eur(p.kineCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-[11px] leading-snug text-muted">
                Renouvelée automatiquement, résiliable par le patient à tout moment. Versé sur votre compte Stripe, frais de
                paiement déjà déduits. Acte non remboursé par l&apos;Assurance Maladie.
              </p>
            </PhoneFold>
          </div>

          {/* ── Colonne 3 : encaissement ───────────────────────────── */}
          <div className="flex min-w-0 flex-col gap-3">
            <ConnectCard status={connectStatus} free={free} />
          </div>
        </div>
      </div>
    </main>
  );
}

function ConnectCard({ status, free }: { status: ConnectStatus; free: boolean }) {
  const s = {
    active: {
      box: "border-ok/30 bg-ok-soft",
      icon: <CheckCircle2 className="h-5 w-5 shrink-0 text-ok" strokeWidth={1.75} />,
      title: "Paiements activés",
      titleClass: "text-ok",
      text: "Les formules de vos patients sont versées directement sur votre compte.",
    },
    onboarding: {
      box: "border-warn/30 bg-warn-soft",
      icon: <Circle className="h-5 w-5 shrink-0 text-warn" strokeWidth={1.75} />,
      title: "Inscription en cours",
      titleClass: "text-warn",
      text: "Terminez l'inscription Stripe pour commencer à encaisser les formules.",
    },
    not_started: {
      box: "border-line bg-app-bg",
      icon: <Circle className="h-5 w-5 shrink-0 text-muted" strokeWidth={1.75} />,
      title: "Paiements non activés",
      titleClass: "text-ink",
      text: "Activez votre compte de paiement (Stripe) pour que vos patients puissent payer leur formule.",
    },
  }[status];
  return (
    <PhoneFold
      className={CARD}
      title={<h2 className="text-base font-semibold text-ink">Encaisser les formules</h2>}
      summary={<span className={s.titleClass}>{status === "active" ? "Activés" : status === "onboarding" ? "En cours" : "À activer"}</span>}
    >
      <div className={`mt-2 flex items-start gap-3 rounded-xl border px-3 py-2 ${s.box}`}>
        {s.icon}
        <div>
          <p className={`text-sm font-medium ${s.titleClass}`}>{s.title}</p>
          <p className="text-xs text-muted">{s.text}</p>
          {status !== "active" && (
            <p className="mt-1 text-xs text-muted">
              {free ? "Vous offrez l'accès : rien à encaisser." : "En attendant, vos patients entrent dans l'appli sans payer."}
            </p>
          )}
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
            Mes versements (Stripe)
            <ExternalLink className="h-4 w-4" strokeWidth={1.75} />
          </a>
        ) : (
          <form action={startConnectOnboarding}>
            <SubmitButton pendingText="Redirection…" className="w-full rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-dark">
              {status === "onboarding" ? "Reprendre l'inscription" : "Activer les paiements"}
            </SubmitButton>
          </form>
        )}
      </div>
    </PhoneFold>
  );
}
