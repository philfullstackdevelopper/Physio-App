import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Circle,
  ClipboardCheck,
  CreditCard,
  Download,
  ExternalLink,
  FileText,
  Hourglass,
  Receipt,
  Tag,
} from "lucide-react";
import SubmitButton from "@/components/SubmitButton";
import type { KineBillingData } from "@/lib/billing/kineBillingData";
import {
  KINE_FEE_PER_ACTIVE_PATIENT_CENTS,
  KINE_FEE_PER_ACTIVE_PATIENT_TTC_CENTS,
  RECOMMENDED_REVIEW_PRICE_CENTS,
  REVIEW_PRICE_MAX_CENTS,
  REVIEW_PRICE_MIN_CENTS,
  eurosFR,
  periodLabel,
} from "@/lib/billing/reviewModel";
import { startConnectOnboarding } from "../connect/actions";
import { setReviewPrice, startPlatformBillingSetup } from "./actions";

export type ConnectStatus = "active" | "onboarding" | "not_started";

const eur = (cents: number) => `${eurosFR(cents)} €`;

// Carte façon appli téléphone : blanche, sans bordure, ombre douce.
const CARD = "rounded-2xl border border-line bg-surface p-4 sm:p-5 max-sm:border-0 max-sm:shadow-soft";

// Page « Suivi & facturation » du kiné (nouveau modèle, 2026-10-24). Un seul
// endroit pour tout ce qui touche à l'argent, sur ordinateur comme sur
// téléphone : les bilans du mois (ce qu'il reste à faire, ce qui est
// encaissé), son tarif, l'activation de ses paiements, ses documents pour la
// comptabilité, et sa facture EasyPhysio. Les deux flux restent séparés à
// l'écran comme dans les faits : « vos honoraires » d'un côté, « votre
// facture EasyPhysio » de l'autre.
export default function FacturationView({
  data,
  connectStatus,
  error,
  saved,
  notice,
}: {
  data: KineBillingData;
  connectStatus: ConnectStatus;
  error?: string;
  saved?: string;
  notice?: string;
}) {
  const todo = data.followUps.filter((f) => !f.review && f.status === "active");
  const done = data.followUps.filter((f) => f.review);
  const waitingCard = data.followUps.filter((f) => !f.review && f.status === "pending_card");
  const pendingCents = done.filter((f) => f.review?.paymentStatus === "pending").reduce((n, f) => n + (f.review?.amountCents ?? 0), 0);
  const todoCents = todo.reduce((n, f) => n + f.priceCents, 0);

  return (
    <main>
      <div className="mx-auto max-w-6xl p-3 max-sm:p-4 max-sm:pt-2 sm:p-6">
        <div>
          <h1 className="text-xl font-semibold text-ink max-sm:text-2xl">Suivi &amp; facturation</h1>
          <p className="mt-0.5 text-sm text-muted">
            Vos bilans de suivi mensuel, ce que vous encaissez, et votre facture EasyPhysio — deux paiements séparés.
          </p>
        </div>

        {error && <p className="mt-3 rounded-xl bg-danger-soft px-4 py-2 text-sm text-danger">{error}</p>}
        {saved && (
          <p className="mt-3 flex items-center gap-1.5 rounded-xl bg-ok-soft px-4 py-2 text-sm text-ok">
            <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            {saved === "prix" ? "Tarif enregistré." : saved === "moyen" ? "Moyen de paiement enregistré." : "Enregistré."}
          </p>
        )}
        {notice === "attente" && (
          <p className="mt-3 rounded-xl bg-warn-soft px-4 py-2 text-sm text-warn">
            Votre moyen de paiement est en cours de vérification chez Stripe. Rechargez la page dans un instant.
          </p>
        )}

        <div className="mt-4 grid gap-3 sm:gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          {/* ── Bilans du mois ─────────────────────────────────────── */}
          <section className={CARD}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
                <ClipboardCheck className="h-5 w-5 shrink-0 text-brand" strokeWidth={1.75} />
                Bilans de {periodLabel(data.period)}
              </h2>
              <p className="text-sm text-muted">Tarif : {eur(data.priceCents)} le bilan</p>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-app-bg px-3 py-2">
                <p className="text-xl font-semibold tabular-nums text-ink">{todo.length}</p>
                <p className="text-xs text-muted">à faire · {eur(todoCents)}</p>
              </div>
              <div className="rounded-xl bg-app-bg px-3 py-2">
                <p className="text-xl font-semibold tabular-nums text-ink">{done.length}</p>
                <p className="text-xs text-muted">faits</p>
              </div>
              <div className="rounded-xl bg-ok-soft px-3 py-2">
                <p className="text-xl font-semibold tabular-nums text-ok">{eur(data.collectedCents)}</p>
                <p className="text-xs text-muted">encaissés{pendingCents > 0 ? ` · ${eur(pendingCents)} en cours` : ""}</p>
              </div>
            </div>

            {data.followUps.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-line px-4 py-6 text-center">
                <p className="text-sm font-medium text-ink">Aucun patient en suivi mensuel pour l&apos;instant.</p>
                <p className="mx-auto mt-1 max-w-md text-sm text-muted">
                  Après les soins, proposez le suivi à un patient depuis sa fiche : il accepte votre tarif et enregistre
                  sa carte dans son appli. Vous faites ensuite un bilan par mois.
                </p>
              </div>
            ) : (
              <ul className="mt-4 divide-y divide-line">
                {[...todo, ...waitingCard, ...done].map((f) => (
                  <li key={f.patientId}>
                    <Link
                      href={`/dashboard/patients/${f.patientId}#bilan`}
                      className="flex items-center gap-3 py-2.5 transition hover:bg-app-bg max-sm:-mx-1 max-sm:px-1"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-ink">{f.name}</span>
                        <span className="block text-xs text-muted">
                          {f.review
                            ? `Bilan validé le ${new Date(f.review.validatedAt).toLocaleDateString("fr-FR")} · ${eur(f.review.amountCents)}`
                            : f.status === "pending_card"
                              ? "A accepté le suivi, carte pas encore enregistrée"
                              : `${eur(f.priceCents)} · ${f.cardLabel ?? "carte enregistrée"}`}
                        </span>
                      </span>
                      <ReviewBadge row={f} />
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.75} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            {data.notInFollowUp > 0 && (
              <p className="mt-3 text-xs text-muted">
                {data.notInFollowUp} patient{data.notInFollowUp > 1 ? "s" : ""} sans suivi mensuel. Proposez-le depuis
                leur fiche quand leurs séances prescrites sont terminées.
              </p>
            )}
          </section>

          <div className="flex min-w-0 flex-col gap-3 sm:gap-4">
            {/* ── Mon tarif ───────────────────────────────────────── */}
            <section className={CARD}>
              <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
                <Tag className="h-5 w-5 shrink-0 text-brand" strokeWidth={1.75} />
                Mon tarif de suivi
              </h2>
              <p className="mt-1 text-sm text-muted">
                Le prix d&apos;un bilan mensuel, acte non remboursé. Tarif conseillé : {eurosFR(RECOMMENDED_REVIEW_PRICE_CENTS, 0)} €.
              </p>
              <form action={setReviewPrice} className="mt-3 flex items-end gap-2">
                <label className="min-w-0 flex-1">
                  <span className="text-xs font-medium text-muted">Tarif du bilan (€)</span>
                  <input
                    name="price_euros"
                    type="number"
                    inputMode="decimal"
                    min={REVIEW_PRICE_MIN_CENTS / 100}
                    max={REVIEW_PRICE_MAX_CENTS / 100}
                    step="1"
                    defaultValue={data.priceCents / 100}
                    required
                    className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand"
                  />
                </label>
                <SubmitButton pendingText="…" className="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-dark">
                  Enregistrer
                </SubmitButton>
              </form>
              <p className="mt-2 text-xs text-muted">
                Entre {eurosFR(REVIEW_PRICE_MIN_CENTS, 0)} et {eurosFR(REVIEW_PRICE_MAX_CENTS, 0)} €. Un patient déjà en suivi garde le
                tarif qu&apos;il a accepté. 100 % pour vous : EasyPhysio ne prend rien sur vos honoraires.
              </p>
            </section>

            {/* ── Encaisser ───────────────────────────────────────── */}
            <ConnectCard status={connectStatus} />

            {/* ── Facture EasyPhysio ──────────────────────────────── */}
            <section className={CARD}>
              <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
                <Receipt className="h-5 w-5 shrink-0 text-brand" strokeWidth={1.75} />
                Ma facture EasyPhysio
              </h2>
              <p className="mt-1 text-sm text-muted">
                {eurosFR(KINE_FEE_PER_ACTIVE_PATIENT_CENTS, 0)} € HT ({eur(KINE_FEE_PER_ACTIVE_PATIENT_TTC_CENTS)} TTC) par patient
                actif et par mois, en une seule facture. Sans lien avec vos honoraires.
              </p>
              <div className="mt-3 rounded-xl bg-app-bg px-3 py-2">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm text-ink">
                    {periodLabel(data.period)} : {data.activePatients} patient{data.activePatients > 1 ? "s" : ""} actif
                    {data.activePatients > 1 ? "s" : ""}
                  </span>
                  <span className="text-sm font-semibold tabular-nums text-ink">
                    {data.monthEstimate.free ? "offert" : `≈ ${eur(data.monthEstimate.ttcCents)} TTC`}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-muted">
                  Actif = invitation acceptée et, dans le mois, une séance faite, un ressenti noté ou un bilan validé.
                  {data.firstBilledMonth ? " Votre premier mois est offert." : ""}
                </p>
              </div>

              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2 text-sm">
                  <CreditCard className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.75} />
                  <span className={`truncate ${data.platformPaymentLabel ? "text-ink" : "text-warn"}`}>
                    {data.platformPaymentLabel ?? "Aucun moyen de paiement"}
                  </span>
                </span>
                <form action={startPlatformBillingSetup}>
                  <SubmitButton pendingText="Redirection…" className="shrink-0 rounded-xl border border-brand px-3 py-1.5 text-sm font-medium text-brand transition hover:bg-brand-soft">
                    {data.platformPaymentLabel ? "Modifier" : "Ajouter"}
                  </SubmitButton>
                </form>
              </div>

              {data.invoices.length > 0 && (
                <ul className="mt-3 divide-y divide-line border-t border-line">
                  {data.invoices.slice(0, 4).map((i) => (
                    <li key={i.periodStart} className="flex items-center justify-between gap-3 py-1.5 text-sm">
                      <span className="text-ink">{periodLabel(i.periodStart)}</span>
                      <span className="flex items-center gap-2">
                        <span className="tabular-nums text-muted">{i.amountCents === 0 ? "offert" : eur(i.amountCents)}</span>
                        <InvoiceBadge status={i.status} />
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* ── Documents ───────────────────────────────────────── */}
            <section className={CARD}>
              <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
                <FileText className="h-5 w-5 shrink-0 text-brand" strokeWidth={1.75} />
                Mes documents
              </h2>
              <p className="mt-1 text-sm text-muted">
                Pour votre déclaration : le récapitulatif de vos recettes, le tableur pour votre comptable, et toutes vos
                notes d&apos;honoraires du mois.
              </p>
              <form method="get" action="/documents/honoraires" target="_blank" className="mt-3 space-y-2">
                <select
                  name="period"
                  defaultValue={data.period}
                  aria-label="Mois"
                  className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand"
                >
                  {data.reviewMonths.map((p) => (
                    <option key={p} value={p}>
                      {periodLabel(p)}
                    </option>
                  ))}
                </select>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                  <button name="type" value="recap" className="flex items-center justify-center gap-1.5 rounded-xl bg-brand px-3 py-2 text-sm font-medium text-white transition hover:bg-brand-dark">
                    <FileText className="h-4 w-4" strokeWidth={1.75} />
                    Récapitulatif
                  </button>
                  <button
                    formAction="/documents/honoraires/export"
                    formTarget="_self"
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-line px-3 py-2 text-sm font-medium text-ink transition hover:bg-app-bg"
                  >
                    <Download className="h-4 w-4" strokeWidth={1.75} />
                    Tableur (CSV)
                  </button>
                  <button name="type" value="notes" className="flex items-center justify-center gap-1.5 rounded-xl border border-line px-3 py-2 text-sm font-medium text-ink transition hover:bg-app-bg">
                    <Receipt className="h-4 w-4" strokeWidth={1.75} />
                    Notes d&apos;honoraires
                  </button>
                </div>
              </form>
              <p className="mt-2 text-[11px] text-muted">
                Le récapitulatif et les notes s&apos;ouvrent prêts à imprimer ou à enregistrer en PDF.
              </p>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

function ReviewBadge({ row }: { row: KineBillingData["followUps"][number] }) {
  if (!row.review) {
    if (row.status === "pending_card") {
      return <span className="shrink-0 rounded-full bg-app-bg px-2 py-0.5 text-[11px] font-medium text-muted">Carte attendue</span>;
    }
    return <span className="shrink-0 rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-medium text-brand">À faire</span>;
  }
  const s = row.review.paymentStatus;
  if (s === "paid") {
    return (
      <span className="flex shrink-0 items-center gap-1 rounded-full bg-ok-soft px-2 py-0.5 text-[11px] font-medium text-ok">
        <CheckCircle2 className="h-3 w-3" strokeWidth={2} /> Payé
      </span>
    );
  }
  if (s === "pending") {
    return (
      <span className="flex shrink-0 items-center gap-1 rounded-full bg-warn-soft px-2 py-0.5 text-[11px] font-medium text-warn">
        <Hourglass className="h-3 w-3" strokeWidth={2} /> En cours
      </span>
    );
  }
  return (
    <span className="flex shrink-0 items-center gap-1 rounded-full bg-danger-soft px-2 py-0.5 text-[11px] font-medium text-danger">
      <AlertCircle className="h-3 w-3" strokeWidth={2} /> Refusé
    </span>
  );
}

function InvoiceBadge({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    paid: ["Payée", "bg-ok-soft text-ok"],
    open: ["En cours", "bg-warn-soft text-warn"],
    draft: ["À régler", "bg-warn-soft text-warn"],
    uncollectible: ["Impayée", "bg-danger-soft text-danger"],
    void: ["Annulée", "bg-app-bg text-muted"],
  };
  const [label, cls] = map[status] ?? [status, "bg-app-bg text-muted"];
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${cls}`}>{label}</span>;
}

function ConnectCard({ status }: { status: ConnectStatus }) {
  const s = {
    active: {
      box: "border-ok/30 bg-ok-soft",
      icon: <CheckCircle2 className="h-5 w-5 shrink-0 text-ok" strokeWidth={1.75} />,
      title: "Paiements activés",
      titleClass: "text-ok",
      text: "Vos patients vous paient leurs bilans directement, sur votre compte.",
    },
    onboarding: {
      box: "border-warn/30 bg-warn-soft",
      icon: <Circle className="h-5 w-5 shrink-0 text-warn" strokeWidth={1.75} />,
      title: "Inscription en cours",
      titleClass: "text-warn",
      text: "Terminez l'inscription Stripe pour commencer à encaisser vos bilans.",
    },
    not_started: {
      box: "border-line bg-app-bg",
      icon: <Circle className="h-5 w-5 shrink-0 text-muted" strokeWidth={1.75} />,
      title: "Paiements non activés",
      titleClass: "text-ink",
      text: "Activez votre compte de paiement (Stripe) pour que vos patients puissent régler leurs bilans en ligne.",
    },
  }[status];
  return (
    <section className={CARD}>
      <h2 className="text-base font-semibold text-ink">Encaisser vos bilans</h2>
      <div className={`mt-3 flex items-start gap-3 rounded-xl border px-3 py-2 ${s.box}`}>
        {s.icon}
        <div>
          <p className={`text-sm font-medium ${s.titleClass}`}>{s.title}</p>
          <p className="text-sm text-muted">{s.text}</p>
        </div>
      </div>
      <div className="mt-3">
        {status === "active" ? (
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
            <SubmitButton pendingText="Redirection…" className="w-full rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-dark">
              {status === "onboarding" ? "Reprendre l'inscription" : "Activer les paiements"}
            </SubmitButton>
          </form>
        )}
      </div>
    </section>
  );
}
