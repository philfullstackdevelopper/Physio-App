import Link from "next/link";
import { ArrowLeft, CheckCircle2, ClipboardCheck, CreditCard, FileText, ShieldCheck } from "lucide-react";
import SubmitButton from "@/components/SubmitButton";
import { eurosFR, feeNoteNumber, periodLabel } from "@/lib/billing/reviewModel";
import { startFollowUp, stopFollowUp } from "./actions";

// Affichage de « Suivi mensuel » (patient) — séparé de page.tsx pour être
// montré avec des données fictives dans la démo (/demo/patient?ecran=suivi).
// Mise en page (Philippe, 2026-10-28 : « le display pourrait être amélioré ») :
// tient sur un écran — sur ordinateur, deux colonnes (le suivi à gauche, les
// bilans à droite) ; sur téléphone, l'un sous l'autre. Mêmes éléments qu'avant.
export type SuiviViewProps = {
  sp: { error?: string; ok?: string; attente?: string; arret?: string };
  kineName: string;
  kineReady: boolean;
  status: "none" | "pending_card" | "active" | "stopped";
  currentPrice: number;
  acceptedPrice: number;
  price: number;
  cardLabel: string | null;
  reviews: { id: string; period: string; amount_cents: number; payment_status: string; fee_note_year: number; fee_note_seq: number }[];
};

const card = "rounded-2xl border border-line bg-surface p-5 shadow-sm max-sm:border-0 max-sm:p-4 max-sm:shadow-soft short:p-4";

export default function SuiviView({ sp, kineName, kineReady, status, currentPrice, acceptedPrice, price, cardLabel, reviews }: SuiviViewProps) {
  return (
    <main className="bg-app-bg p-4 pt-5 max-sm:bg-transparent max-sm:pt-2 sm:min-h-dvh sm:p-8 short:sm:py-5">
      <div className="mx-auto max-w-4xl">
        <Link href="/patient/compte" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
          Paramètres
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-ink">Suivi mensuel</h1>
        <p className="mt-0.5 text-sm text-muted">
          Une fois par mois, {kineName} regarde vos séances et vos douleurs, et ajuste votre programme.
        </p>

        {sp.error && <p className="mt-3 rounded-xl bg-danger-soft p-3 text-sm text-danger">{sp.error}</p>}
        {sp.ok === "1" && (
          <p className="mt-3 flex items-center gap-1.5 rounded-xl bg-ok-soft p-3 text-sm text-ok">
            <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            Carte enregistrée : votre suivi mensuel est actif.
          </p>
        )}
        {sp.attente === "1" && (
          <p className="mt-3 rounded-xl bg-warn-soft p-3 text-sm text-warn">Votre carte est en cours de vérification. Rechargez la page dans un instant.</p>
        )}
        {sp.arret === "1" && <p className="mt-3 rounded-xl bg-ok-soft p-3 text-sm text-ok">Votre suivi mensuel est arrêté. Plus aucun prélèvement.</p>}

        <div className="mt-4 grid gap-4 md:grid-cols-[1.15fr_1fr] md:items-start">
          {/* Colonne 1 : le suivi — état, tarif, ce que ça comprend, actions. */}
          <section className={card}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-muted">Tarif par bilan</p>
                <p className="mt-0.5 text-3xl font-semibold tabular-nums text-ink">{eurosFR(price)} €</p>
              </div>
              {status === "active" && (
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-ok-soft px-3 py-1 text-sm font-medium text-ok">
                  <CheckCircle2 className="h-4 w-4" strokeWidth={1.75} />
                  Suivi actif
                </span>
              )}
            </div>

            <ul className="mt-4 space-y-2 border-t border-line pt-4 text-sm text-muted">
              <li className="flex gap-2"><ClipboardCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand" strokeWidth={1.75} />Un bilan par mois : votre kiné analyse vos séances et vos ressentis, et ajuste votre programme.</li>
              <li className="flex gap-2"><CreditCard className="mt-0.5 h-4 w-4 shrink-0 text-brand" strokeWidth={1.75} />Prélevé seulement le mois où le bilan est fait. Pas de bilan, pas de prélèvement.</li>
              <li className="flex gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand" strokeWidth={1.75} />Payé directement à votre kiné, par Stripe. Acte non remboursé par l&apos;Assurance Maladie. Arrêt à tout moment.</li>
            </ul>

            {status === "active" ? (
              <div className="mt-4 space-y-3 border-t border-line pt-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="flex min-w-0 items-center gap-2 text-sm text-ink">
                    <CreditCard className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.75} />
                    <span className="truncate">{cardLabel ?? "Carte enregistrée"}</span>
                  </p>
                  {kineReady && (
                    <form action={startFollowUp}>
                      <input type="hidden" name="consent" value="on" />
                      <input type="hidden" name="price_cents" value={currentPrice} />
                      <SubmitButton pendingText="Redirection…" className="shrink-0 rounded-full border border-brand px-4 py-1.5 text-sm font-semibold text-brand transition hover:bg-brand-soft">
                        Changer de carte{acceptedPrice !== currentPrice ? ` (et accepter ${eurosFR(currentPrice)} €)` : ""}
                      </SubmitButton>
                    </form>
                  )}
                </div>
                {acceptedPrice !== currentPrice && (
                  <p className="text-xs text-muted">
                    Vous avez accepté {eurosFR(acceptedPrice)} € par bilan ; ce tarif reste le vôtre tant que vous ne réacceptez pas le nouveau ({eurosFR(currentPrice)} €).
                  </p>
                )}
                <details>
                  <summary className="cursor-pointer list-none text-sm font-medium text-muted hover:text-danger [&::-webkit-details-marker]:hidden">
                    Arrêter le suivi mensuel
                  </summary>
                  <div className="mt-2 rounded-xl bg-danger-soft p-3">
                    <p className="text-sm text-ink">Plus aucun prélèvement. Vous gardez votre programme et l&apos;appli.</p>
                    <form action={stopFollowUp} className="mt-2">
                      <SubmitButton pendingText="Arrêt…" className="w-full rounded-full bg-danger py-2 text-sm font-semibold text-white hover:brightness-95">
                        Confirmer l&apos;arrêt
                      </SubmitButton>
                    </form>
                  </div>
                </details>
              </div>
            ) : !kineReady ? (
              <p className="mt-4 rounded-xl bg-app-bg px-3 py-2 text-sm text-muted">
                {kineName} n&apos;a pas encore activé les paiements en ligne. Le suivi mensuel sera disponible dès que ce sera fait.
              </p>
            ) : (
              <form action={startFollowUp} className="mt-4 space-y-3 border-t border-line pt-4">
                <input type="hidden" name="price_cents" value={currentPrice} />
                <label className="flex items-start gap-2 text-sm text-ink">
                  <input type="checkbox" name="consent" required className="mt-1 h-4 w-4 shrink-0 accent-[var(--color-brand)]" />
                  <span>
                    J&apos;accepte le suivi mensuel avec {kineName} au tarif de {eurosFR(currentPrice)} € par bilan, prélevé sur ma carte
                    seulement le mois où le bilan est fait. Je peux arrêter à tout moment.
                  </span>
                </label>
                <SubmitButton pendingText="Redirection…" className="w-full rounded-full bg-brand py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark">
                  {status === "stopped" ? "Reprendre le suivi" : status === "pending_card" ? "Terminer : enregistrer ma carte" : "Activer : enregistrer ma carte"}
                </SubmitButton>
                <p className="text-center text-xs text-muted">Aucun prélèvement maintenant. Carte enregistrée de façon sécurisée par Stripe.</p>
              </form>
            )}
          </section>

          {/* Colonne 2 : les bilans déjà faits, avec leur note d'honoraires. */}
          <section className={card}>
            <h2 className="text-base font-semibold text-ink">Mes bilans</h2>
            {reviews.length === 0 ? (
              <p className="mt-2 text-sm text-muted">
                Aucun bilan pour l&apos;instant. Chaque bilan apparaîtra ici avec sa note d&apos;honoraires.
              </p>
            ) : (
              <ul className="mt-2 max-h-72 divide-y divide-line overflow-y-auto short:max-h-56">
                {reviews.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <span className="min-w-0">
                      <span className="block font-medium text-ink">Bilan de {periodLabel(r.period)}</span>
                      <span className="block text-xs text-muted">
                        {eurosFR(r.amount_cents)} € ·{" "}
                        {r.payment_status === "paid" ? "payé" : r.payment_status === "pending" ? "paiement en cours" : "paiement refusé"}
                      </span>
                    </span>
                    <Link
                      href={`/documents/honoraires?review=${r.id}`}
                      target="_blank"
                      className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-brand hover:underline"
                    >
                      <FileText className="h-4 w-4" strokeWidth={1.75} />
                      Note n° {feeNoteNumber(r.fee_note_year, r.fee_note_seq)}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
