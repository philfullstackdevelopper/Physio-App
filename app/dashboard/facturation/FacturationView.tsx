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
  Users,
} from "lucide-react";
import SubmitButton from "@/components/SubmitButton";
import PhoneFold from "@/components/PhoneFold";
import type { KineBillingData } from "@/lib/billing/kineBillingData";
import type { CabinetLink } from "@/lib/db/admin";
import {
  CABINET_SHARES,
  KINE_PLANS,
  RECOMMENDED_REVIEW_PRICE_CENTS,
  REVIEW_PRICE_MAX_CENTS,
  REVIEW_PRICE_MIN_CENTS,
  eurosFR,
  periodLabel,
  subscriptionPrice,
} from "@/lib/billing/reviewModel";
import { startConnectOnboarding } from "../connect/actions";
import {
  inviteToCabinet,
  removeFromCabinet,
  respondToCabinet,
  setPlanMonths,
  setReviewPrice,
  startPlatformBillingSetup,
} from "./actions";

export type ConnectStatus = "active" | "onboarding" | "not_started";

const eur = (cents: number) => `${eurosFR(cents)} €`;
const longDate = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
// « 2027-01-31 » → « janvier 2027 ».
const monthOf = (iso: string) => periodLabel(`${iso.slice(0, 8)}01`);
const pct = (share: number) => `−${Math.round((1 - share) * 100)} %`;

export type CabinetInfo = {
  /** false tant que la migration 0078 n'est pas appliquée : section cachée. */
  ready: boolean;
  meId: string;
  links: CabinetLink[];
};

const SAVED: Record<string, string> = {
  prix: "Tarif enregistré.",
  moyen: "Moyen de paiement enregistré.",
  duree: "Durée enregistrée : elle vaudra pour votre prochaine échéance.",
  cabinet: "Invitation envoyée : votre collègue la verra sur sa page « Suivi & facturation ».",
  "cabinet-rejoint": "Vous avez rejoint le cabinet : votre abonnement est désormais réglé par son payeur.",
  "cabinet-refuse": "Invitation refusée.",
  "cabinet-retire": "Le lien avec le cabinet est défait.",
};

// Carte façon appli téléphone : blanche, sans bordure, ombre douce.
const CARD = "rounded-2xl border border-line bg-surface p-4 sm:p-5 max-sm:border-0 max-sm:shadow-soft max-sm:short:p-3";

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
  cabinet = { ready: false, meId: "", links: [] },
}: {
  data: KineBillingData;
  connectStatus: ConnectStatus;
  error?: string;
  saved?: string;
  notice?: string;
  cabinet?: CabinetInfo;
}) {
  // Cabinet : suis-je un collègue (réglé par un payeur, ou invité), ou le payeur ?
  const asMember = cabinet.links.find((l) => l.member_id === cabinet.meId) ?? null;
  const invitation = asMember?.status === "pending" ? asMember : null;
  const paidByCabinet = asMember?.status === "active" ? asMember : null;
  const myMembers = cabinet.links.filter((l) => l.payer_id === cabinet.meId);
  const cabinetKines = 1 + myMembers.filter((l) => l.status === "active").length;
  const next = data.monthEstimate;
  const nextPrice = subscriptionPrice(data.planMonths, cabinetKines);
  const todo = data.followUps.filter((f) => !f.review && f.status === "active");
  const done = data.followUps.filter((f) => f.review);
  const waitingCard = data.followUps.filter((f) => !f.review && f.status === "pending_card");
  const pendingCents = done.filter((f) => f.review?.paymentStatus === "pending").reduce((n, f) => n + (f.review?.amountCents ?? 0), 0);
  const todoCents = todo.reduce((n, f) => n + f.priceCents, 0);

  return (
    <main>
      {/* Tient sur un écran (Philippe, 2026-10-28 : « we should be able to see
          everything in one go ») : sur ordinateur, trois colonnes — les bilans,
          vos honoraires (tarif + encaissement), votre facture EasyPhysio +
          documents. Textes d'aide resserrés, aucun élément retiré. */}
      <div className="mx-auto max-w-7xl p-3 max-sm:p-4 max-sm:pt-2 sm:p-5 short:sm:py-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
          <h1 className="text-xl font-semibold text-ink max-sm:text-2xl">Suivi &amp; facturation</h1>
          <p className="text-sm text-muted max-sm:text-xs max-sm:short:hidden">Vos programmes mensuels et ce que vous encaissez, puis votre abonnement EasyPhysio : deux paiements séparés.</p>
        </div>

        {error && <p className="mt-2 rounded-xl bg-danger-soft px-4 py-2 text-sm text-danger">{error}</p>}
        {saved && (
          <p className="mt-2 flex items-center gap-1.5 rounded-xl bg-ok-soft px-4 py-2 text-sm text-ok">
            <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            {SAVED[saved] ?? "Enregistré."}
          </p>
        )}
        {notice === "attente" && (
          <p className="mt-2 rounded-xl bg-warn-soft px-4 py-2 text-sm text-warn">
            Votre moyen de paiement est en cours de vérification chez Stripe. Rechargez la page dans un instant.
          </p>
        )}

        <div className="mt-3 grid grid-cols-1 gap-3 max-sm:mt-2 max-sm:gap-2 md:grid-cols-2 lg:grid-cols-3">
          {/* ── Colonne 1 : bilans du mois ─────────────────────────── */}
          <section className={`${CARD} flex min-h-0 flex-col md:col-span-2 lg:col-span-1`}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
                <ClipboardCheck className="h-5 w-5 shrink-0 text-brand" strokeWidth={1.75} />
                Suivis de {periodLabel(data.period)}
              </h2>
              <p className="text-xs text-muted">{data.priceCents === 0 ? "Accès gratuit pour vos patients" : `${eur(data.priceCents)} par mois`}</p>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-app-bg px-3 py-2">
                <p className="text-lg font-semibold tabular-nums text-ink">{todo.length}</p>
                <p className="text-[11px] leading-tight text-muted">à faire · {eur(todoCents)}</p>
              </div>
              <div className="rounded-xl bg-app-bg px-3 py-2">
                <p className="text-lg font-semibold tabular-nums text-ink">{done.length}</p>
                <p className="text-[11px] leading-tight text-muted">faits</p>
              </div>
              <div className="rounded-xl bg-ok-soft px-3 py-2">
                <p className="text-lg font-semibold tabular-nums text-ok">{eur(data.collectedCents)}</p>
                <p className="text-[11px] leading-tight text-muted">encaissés{pendingCents > 0 ? ` · ${eur(pendingCents)} en cours` : ""}</p>
              </div>
            </div>

            {data.followUps.length === 0 ? (
              <div className="mt-3 rounded-xl border border-dashed border-line px-4 py-4 text-center">
                <p className="text-sm font-medium text-ink">Aucun patient en suivi mensuel pour l&apos;instant.</p>
                <p className="mx-auto mt-1 max-w-md text-xs text-muted">
                  Le patient l&apos;active dans son appli (Compte, puis Suivi mensuel). Le mois est facturé
                  tout seul dès que vous ajustez son programme.
                </p>
              </div>
            ) : (
              // La liste défile dans la carte si elle est longue : la page, elle, ne défile pas.
              <ul className="mt-3 min-h-0 divide-y divide-line overflow-y-auto max-sm:max-h-28 max-sm:short:max-h-20 sm:max-h-[calc(100dvh-17rem)]">
                {[...todo, ...waitingCard, ...done].map((f) => (
                  <li key={f.patientId}>
                    <Link
                      href={`/dashboard/patients/${f.patientId}`}
                      className="flex items-center gap-3 py-2 transition hover:bg-app-bg max-sm:-mx-1 max-sm:px-1"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-ink">{f.name}</span>
                        <span className="block truncate text-xs text-muted">
                          {f.review
                            ? `Facturé le ${new Date(f.review.validatedAt).toLocaleDateString("fr-FR")} · ${eur(f.review.amountCents)}`
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

          </section>

          {/* ── Colonne 2 : vos honoraires — tarif et encaissement ── */}
          <div className="flex min-w-0 flex-col gap-3">
            <PhoneFold
              className={CARD}
              title={
                <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
                  <Tag className="h-5 w-5 shrink-0 text-brand" strokeWidth={1.75} />
                  Mon tarif de suivi
                </h2>
              }
              summary={data.priceCents === 0 ? "Gratuit" : eur(data.priceCents)}
            >
              <form action={setReviewPrice} className="mt-2 flex items-end gap-2">
                <label className="min-w-0 flex-1">
                  <span className="text-xs font-medium text-muted">Programme mensuel hors nomenclature (€)</span>
                  <input
                    name="price_euros"
                    type="number"
                    inputMode="decimal"
                    min={0}
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
              <p className="mt-2 text-[11px] leading-snug text-muted">
                0 € : vos patients entrent gratuitement dans l&apos;appli. Au-dessus (entre {eurosFR(REVIEW_PRICE_MIN_CENTS, 0)} et {eurosFR(REVIEW_PRICE_MAX_CENTS, 0)} €, conseillé :{" "}
                {eurosFR(RECOMMENDED_REVIEW_PRICE_CENTS, 0)} €), chaque patient accepte ce tarif et enregistre sa carte avant d&apos;accéder à l&apos;appli. Acte non remboursé. Un patient déjà en suivi garde le tarif accepté. 100 % pour vous :
                EasyPhysio ne prend rien sur vos honoraires.
              </p>
            </PhoneFold>

            <ConnectCard status={connectStatus} free={data.priceCents === 0} />
          </div>

          {/* ── Colonne 3 : votre facture EasyPhysio et vos documents ── */}
          <div className="flex min-w-0 flex-col gap-3">
            <PhoneFold
              className={CARD}
              title={
                <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
                  <Receipt className="h-5 w-5 shrink-0 text-brand" strokeWidth={1.75} />
                  Mon abonnement EasyPhysio
                </h2>
              }
              summary={
                paidByCabinet ? "réglé par le cabinet" : data.paidUntil ? `réglé → ${monthOf(data.paidUntil)}` : next.free ? "offert" : eur(next.ttcCents)
              }
            >
              {invitation && (
                <div className="mt-2 rounded-xl border border-brand/30 bg-brand-soft px-3 py-2">
                  <p className="text-sm text-ink">
                    <span className="font-medium">{invitation.payer_name ?? "Un collègue"}</span> vous invite dans son cabinet : il
                    réglera votre abonnement EasyPhysio. Vous gardez vos patients, il ne les voit pas.
                  </p>
                  <div className="mt-2 flex gap-2">
                    <form action={respondToCabinet}>
                      <input type="hidden" name="accept" value="1" />
                      <SubmitButton pendingText="…" className="rounded-xl bg-brand px-3 py-1 text-sm font-medium text-white hover:bg-brand-dark">
                        Accepter
                      </SubmitButton>
                    </form>
                    <form action={respondToCabinet}>
                      <input type="hidden" name="accept" value="0" />
                      <SubmitButton pendingText="…" className="rounded-xl border border-line px-3 py-1 text-sm font-medium text-muted hover:text-ink">
                        Refuser
                      </SubmitButton>
                    </form>
                  </div>
                </div>
              )}

              {paidByCabinet ? (
                <div className="mt-2 rounded-xl bg-app-bg px-3 py-2">
                  <p className="text-sm text-ink">
                    Réglé par le cabinet de <span className="font-medium">{paidByCabinet.payer_name ?? "votre collègue"}</span>.
                  </p>
                  <form action={removeFromCabinet} className="mt-1">
                    <input type="hidden" name="member_id" value={cabinet.meId} />
                    <SubmitButton pendingText="…" className="text-xs font-medium text-muted underline hover:text-danger">
                      Quitter le cabinet
                    </SubmitButton>
                  </form>
                </div>
              ) : (
                <div className="mt-2 rounded-xl bg-app-bg px-3 py-2">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm text-ink">
                      {data.paidUntil ? `Réglé jusqu'au ${longDate(data.paidUntil)}` : periodLabel(data.period)}
                    </span>
                    {!data.paidUntil && (
                      <span className="text-sm font-semibold tabular-nums text-ink">{next.free ? "offert" : `${eur(next.ttcCents)} TTC`}</span>
                    )}
                  </div>
                  <form action={setPlanMonths} className="mt-1.5 flex items-center gap-2">
                    <label className="min-w-0 flex-1">
                      <span className="sr-only">Durée de l&apos;abonnement</span>
                      <select
                        name="months"
                        defaultValue={data.planMonths}
                        className="w-full rounded-lg border border-line bg-surface px-2 py-1 text-xs text-ink focus:border-brand focus:outline-none"
                      >
                        {KINE_PLANS.map((p) => {
                          const price = subscriptionPrice(p.months, cabinetKines);
                          return (
                            <option key={p.months} value={p.months}>
                              {p.months} mois : {eur(price.ttcCents)} ({eur(price.perKinePerMonthCents)} / mois{cabinetKines > 1 ? " par kiné" : ""})
                            </option>
                          );
                        })}
                      </select>
                    </label>
                    <SubmitButton pendingText="…" className="shrink-0 rounded-lg border border-brand px-2.5 py-1 text-xs font-medium text-brand hover:bg-brand-soft">
                      Choisir
                    </SubmitButton>
                  </form>
                  <p className="mt-1 text-[11px] leading-snug text-muted">
                    Prochaine échéance : {data.planMonths} mois{cabinetKines > 1 ? `, ${cabinetKines} kinés` : ""},{" "}
                    {eur(nextPrice.ttcCents)} TTC payés d&apos;avance. Patients illimités.
                    {data.firstBilledMonth && data.planMonths === 1 ? " Premier mois offert." : ""}
                  </p>
                </div>
              )}

              <div className="mt-2 flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2 text-sm">
                  <CreditCard className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.75} />
                  <span className={`truncate ${data.platformPaymentLabel ? "text-ink" : "text-warn"}`}>
                    {data.platformPaymentLabel ?? "Aucun moyen de paiement"}
                  </span>
                </span>
                <form action={startPlatformBillingSetup}>
                  <SubmitButton pendingText="Redirection…" className="shrink-0 rounded-xl border border-brand px-3 py-1 text-sm font-medium text-brand transition hover:bg-brand-soft">
                    {data.platformPaymentLabel ? "Modifier" : "Ajouter"}
                  </SubmitButton>
                </form>
              </div>

              {data.invoices.length > 0 && (
                <ul className="mt-2 divide-y divide-line border-t border-line">
                  {data.invoices.slice(0, 3).map((i) => (
                    <li key={i.periodStart} className="flex items-center justify-between gap-3 py-1 text-sm">
                      <span className="text-ink">
                        {periodLabel(i.periodStart)}
                        {i.periodEnd && monthOf(i.periodEnd) !== periodLabel(i.periodStart) ? ` → ${monthOf(i.periodEnd)}` : ""}
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="tabular-nums text-muted">{i.amountCents === 0 ? "offert" : eur(i.amountCents)}</span>
                        <InvoiceBadge status={i.status} />
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {/* Cabinet (migration 0078) : un payeur règle l'abonnement de
                  collègues kinés, à tarif dégressif. Chacun garde ses patients. */}
              {cabinet.ready && !asMember && (
                <details className="group mt-2 border-t border-line pt-2">
                  <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium text-ink [&::-webkit-details-marker]:hidden">
                    <Users className="h-4 w-4 shrink-0 text-brand" strokeWidth={1.75} />
                    {myMembers.length > 0 ? `Mon cabinet · ${cabinetKines} kiné${cabinetKines > 1 ? "s" : ""}` : "Cabinet : réglez pour vos collègues"}
                    <ChevronRight className="ml-auto h-4 w-4 text-muted transition-transform group-open:rotate-90" strokeWidth={1.75} />
                  </summary>
                  <p className="mt-1 text-[11px] leading-snug text-muted">
                    Vous réglez l&apos;abonnement de collègues kinés : 2e kiné {pct(CABINET_SHARES[1])}, à partir du 3e{" "}
                    {pct(CABINET_SHARES[2])}. Chacun garde ses patients ; le cabinet ne sert qu&apos;à la facture. Pris en compte à
                    votre prochaine échéance.
                  </p>
                  {myMembers.length > 0 && (
                    <ul className="mt-1.5 divide-y divide-line">
                      {myMembers.map((m) => (
                        <li key={m.member_id} className="flex items-center justify-between gap-2 py-1 text-sm">
                          <span className="min-w-0 truncate text-ink">
                            {m.member_name ?? m.member_email}
                            {m.status === "pending" && <span className="ml-1.5 text-xs text-warn">invitation envoyée</span>}
                          </span>
                          <form action={removeFromCabinet}>
                            <input type="hidden" name="member_id" value={m.member_id} />
                            <SubmitButton pendingText="…" className="shrink-0 text-xs font-medium text-muted underline hover:text-danger">
                              Retirer
                            </SubmitButton>
                          </form>
                        </li>
                      ))}
                    </ul>
                  )}
                  <form action={inviteToCabinet} className="mt-1.5 flex items-center gap-2">
                    <input
                      name="email"
                      type="email"
                      required
                      placeholder="E-mail d'un collègue kiné"
                      aria-label="E-mail d'un collègue kiné"
                      className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-2 py-1 text-xs text-ink placeholder:text-muted focus:border-brand focus:outline-none"
                    />
                    <SubmitButton pendingText="…" className="shrink-0 rounded-lg border border-brand px-2.5 py-1 text-xs font-medium text-brand hover:bg-brand-soft">
                      Inviter
                    </SubmitButton>
                  </form>
                </details>
              )}
            </PhoneFold>

            <PhoneFold
              className={CARD}
              title={
                <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
                  <FileText className="h-5 w-5 shrink-0 text-brand" strokeWidth={1.75} />
                  Mes documents
                </h2>
              }
              summary="Récap · CSV · Notes"
            >
              <form method="get" action="/documents/honoraires" target="_blank" className="mt-2 space-y-2">
                <select
                  name="period"
                  defaultValue={data.period}
                  aria-label="Mois"
                  className="w-full rounded-xl border border-line bg-surface px-3 py-1.5 text-sm text-ink outline-none focus:border-brand"
                >
                  {data.reviewMonths.map((p) => (
                    <option key={p} value={p}>
                      {periodLabel(p)}
                    </option>
                  ))}
                </select>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    name="type"
                    value="recap"
                    title="Récapitulatif de vos recettes du mois, prêt à imprimer ou à enregistrer en PDF"
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-brand px-2 py-2 text-sm font-medium text-white transition hover:bg-brand-dark"
                  >
                    <FileText className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                    Récap
                  </button>
                  <button
                    formAction="/documents/honoraires/export"
                    formTarget="_self"
                    title="Tableur pour votre comptable"
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-line px-2 py-2 text-sm font-medium text-ink transition hover:bg-app-bg"
                  >
                    <Download className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                    CSV
                  </button>
                  <button
                    name="type"
                    value="notes"
                    title="Toutes vos notes d'honoraires du mois, prêtes à imprimer ou à enregistrer en PDF"
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-line px-2 py-2 text-sm font-medium text-ink transition hover:bg-app-bg"
                  >
                    <Receipt className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                    Notes
                  </button>
                </div>
              </form>
              <p className="mt-2 text-[11px] leading-snug text-muted">
                Pour votre déclaration et votre comptable : récapitulatif des recettes, tableur et notes d&apos;honoraires du mois.
              </p>
            </PhoneFold>
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

function ConnectCard({ status, free }: { status: ConnectStatus; free: boolean }) {
  const s = {
    active: {
      box: "border-ok/30 bg-ok-soft",
      icon: <CheckCircle2 className="h-5 w-5 shrink-0 text-ok" strokeWidth={1.75} />,
      title: "Paiements activés",
      titleClass: "text-ok",
      text: "Vos patients vous paient leur programme mensuel directement, sur votre compte.",
    },
    onboarding: {
      box: "border-warn/30 bg-warn-soft",
      icon: <Circle className="h-5 w-5 shrink-0 text-warn" strokeWidth={1.75} />,
      title: "Inscription en cours",
      titleClass: "text-warn",
      text: "Terminez l'inscription Stripe pour commencer à encaisser vos programmes.",
    },
    not_started: {
      box: "border-line bg-app-bg",
      icon: <Circle className="h-5 w-5 shrink-0 text-muted" strokeWidth={1.75} />,
      title: "Paiements non activés",
      titleClass: "text-ink",
      text: "Activez votre compte de paiement (Stripe) pour que vos patients puissent régler leur programme en ligne.",
    },
  }[status];
  return (
    <PhoneFold
      className={CARD}
      title={<h2 className="text-base font-semibold text-ink">Encaisser vos programmes</h2>}
      summary={<span className={s.titleClass}>{status === "active" ? "Activés" : status === "onboarding" ? "En cours" : "À activer"}</span>}
    >
      <div className={`mt-2 flex items-start gap-3 rounded-xl border px-3 py-2 ${s.box}`}>
        {s.icon}
        <div>
          <p className={`text-sm font-medium ${s.titleClass}`}>{s.title}</p>
          <p className="text-xs text-muted">{s.text}</p>
          {status !== "active" && (
            <p className="mt-1 text-xs text-muted">
              {free
                ? "Votre tarif est à 0 € : rien à encaisser, vos patients entrent gratuitement."
                : "En attendant, vos patients entrent dans l'appli sans payer."}
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
    </PhoneFold>
  );
}
