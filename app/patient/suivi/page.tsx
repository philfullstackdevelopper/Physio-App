import Link from "next/link";
import { ArrowLeft, CheckCircle2, ClipboardCheck, CreditCard, FileText, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import SubmitButton from "@/components/SubmitButton";
import { effectiveReviewPrice, eurosFR, feeNoteNumber, periodLabel } from "@/lib/billing/reviewModel";
import { startFollowUp, stopFollowUp } from "./actions";

// « Suivi mensuel » côté patient (nouveau modèle, 2026-10-24). Le patient y
// accepte le tarif de son kiné (information préalable, art. R.4321-98 CSP),
// enregistre sa carte, l'arrête quand il veut, et retrouve ses bilans et
// notes d'honoraires. L'appli elle-même reste ouverte sans ce suivi.
export default async function SuiviPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string; attente?: string; arret?: string; checkout?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const { data: patient } = await supabase.from("patients").select("instructor_id").eq("id", user.id).maybeSingle();
  const instructorId = (patient?.instructor_id as string | null) ?? null;
  const [{ data: kine }, { data: connect }, { data: followUp }, { data: reviews }] = await Promise.all([
    instructorId
      ? supabase.from("instructors").select("full_name, status, review_price_cents").eq("id", instructorId).maybeSingle()
      : Promise.resolve({ data: null }),
    instructorId
      ? supabase.from("instructor_connect_accounts").select("status").eq("instructor_id", instructorId).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("patient_follow_ups").select("status, price_cents, card_label").eq("patient_id", user.id).maybeSingle(),
    supabase
      .from("monthly_reviews")
      .select("id, period, amount_cents, payment_status, fee_note_year, fee_note_seq")
      .eq("patient_id", user.id)
      .order("period", { ascending: false })
      .limit(24),
  ]);

  const kineName = (kine?.full_name as string | null) ?? "votre kiné";
  const kineReady = ((kine?.status as string | null) ?? "approved") === "approved" && connect?.status === "active";
  const status = (followUp?.status as "pending_card" | "active" | "stopped" | undefined) ?? "none";
  const currentPrice = effectiveReviewPrice((kine?.review_price_cents as number | null) ?? null);
  const acceptedPrice = (followUp?.price_cents as number | undefined) ?? currentPrice;
  const price = status === "active" ? acceptedPrice : currentPrice;

  return (
    <main className="bg-app-bg p-4 pt-5 max-sm:bg-transparent max-sm:pt-2 sm:min-h-dvh sm:p-8">
      <div className="mx-auto max-w-2xl">
        <Link href="/patient/compte" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
          Paramètres
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-ink">Suivi mensuel</h1>
        <p className="mt-1 text-sm text-muted">
          Une fois par mois, {kineName} regarde vos séances et vos douleurs, ajuste votre programme et vous écrit.
        </p>

        {sp.error && <p className="mt-4 rounded-xl bg-danger-soft p-3 text-sm text-danger">{sp.error}</p>}
        {sp.ok === "1" && (
          <p className="mt-4 flex items-center gap-1.5 rounded-xl bg-ok-soft p-3 text-sm text-ok">
            <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            Carte enregistrée : votre suivi mensuel est actif.
          </p>
        )}
        {sp.attente === "1" && (
          <p className="mt-4 rounded-xl bg-warn-soft p-3 text-sm text-warn">Votre carte est en cours de vérification. Rechargez la page dans un instant.</p>
        )}
        {sp.arret === "1" && <p className="mt-4 rounded-xl bg-ok-soft p-3 text-sm text-ok">Votre suivi mensuel est arrêté. Plus aucun prélèvement.</p>}

        <section className="mt-5 rounded-2xl border border-line bg-surface p-5 shadow-sm max-sm:border-0 max-sm:shadow-soft">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm font-medium text-ink">Tarif par bilan</p>
            <p className="text-2xl font-semibold tabular-nums text-ink">{eurosFR(price)} €</p>
          </div>
          <ul className="mt-4 space-y-2 border-t border-line pt-4 text-sm text-muted">
            <li className="flex gap-2"><ClipboardCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand" strokeWidth={1.75} />Un bilan par mois : analyse de vos séances et ressentis, programme ajusté, retour écrit de votre kiné.</li>
            <li className="flex gap-2"><CreditCard className="mt-0.5 h-4 w-4 shrink-0 text-brand" strokeWidth={1.75} />Prélevé seulement le mois où le bilan est fait. Pas de bilan, pas de prélèvement.</li>
            <li className="flex gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand" strokeWidth={1.75} />Payé directement à votre kiné, par Stripe. Acte non remboursé par l&apos;Assurance Maladie. Arrêt à tout moment.</li>
          </ul>

          {status === "active" ? (
            <div className="mt-5 space-y-3">
              <p className="flex items-center gap-2 rounded-xl bg-ok-soft px-3 py-2 text-sm text-ok">
                <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                Suivi actif · {(followUp?.card_label as string | null) ?? "carte enregistrée"}
              </p>
              {acceptedPrice !== currentPrice && (
                <p className="text-xs text-muted">
                  Vous avez accepté {eurosFR(acceptedPrice)} € par bilan ; ce tarif reste le vôtre tant que vous ne réacceptez pas le nouveau ({eurosFR(currentPrice)} €).
                </p>
              )}
              {kineReady && (
                <form action={startFollowUp}>
                  <input type="hidden" name="consent" value="on" />
                  <input type="hidden" name="price_cents" value={currentPrice} />
                  <SubmitButton pendingText="Redirection…" className="w-full rounded-full border border-brand py-2.5 text-sm font-semibold text-brand transition hover:bg-brand-soft">
                    Changer de carte{acceptedPrice !== currentPrice ? ` (et accepter ${eurosFR(currentPrice)} €)` : ""}
                  </SubmitButton>
                </form>
              )}
              <details className="text-center">
                <summary className="cursor-pointer list-none text-sm font-medium text-muted hover:text-danger [&::-webkit-details-marker]:hidden">
                  Arrêter le suivi mensuel
                </summary>
                <div className="mt-2 rounded-xl bg-danger-soft p-3 text-left">
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
            <p className="mt-5 rounded-xl bg-app-bg px-3 py-2 text-sm text-muted">
              {kineName} n&apos;a pas encore activé les paiements en ligne. Le suivi mensuel sera disponible dès que ce sera fait.
            </p>
          ) : (
            <form action={startFollowUp} className="mt-5 space-y-3">
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

        {(reviews ?? []).length > 0 && (
          <section className="mt-4 rounded-2xl border border-line bg-surface p-5 shadow-sm max-sm:border-0 max-sm:shadow-soft">
            <h2 className="text-base font-semibold text-ink">Mes bilans</h2>
            <ul className="mt-3 divide-y divide-line">
              {(reviews ?? []).map((r) => (
                <li key={r.id as string} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="min-w-0">
                    <span className="block font-medium text-ink">Bilan de {periodLabel(r.period as string)}</span>
                    <span className="block text-xs text-muted">
                      {eurosFR(r.amount_cents as number)} € ·{" "}
                      {r.payment_status === "paid" ? "payé" : r.payment_status === "pending" ? "paiement en cours" : "paiement refusé"}
                    </span>
                  </span>
                  <Link
                    href={`/documents/honoraires?review=${r.id as string}`}
                    target="_blank"
                    className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-brand hover:underline"
                  >
                    <FileText className="h-4 w-4" strokeWidth={1.75} />
                    Note n° {feeNoteNumber(r.fee_note_year as number, r.fee_note_seq as number)}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted">Le retour écrit de chaque bilan est aussi dans votre messagerie.</p>
          </section>
        )}
      </div>
    </main>
  );
}
