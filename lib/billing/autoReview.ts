// Bilan du mois validé AUTOMATIQUEMENT (Philippe, 2026-10-27) : pour un patient
// en suivi mensuel, le bilan compte comme « fait » la première fois dans le
// mois que le kiné travaille sur son programme : séance attribuée, séance
// ajustée, ou séance personnelle du patient enregistrée. Plus de bouton
// « Faire le bilan ».
//
// Ce qui se passe alors (une seule fois par patient et par mois) : le bilan est
// enregistré avec son numéro de note d'honoraires, puis la carte du patient est
// prélevée du tarif qu'il a accepté, sur le compte Stripe du kiné, sans frais
// EasyPhysio (lib/billing/followUp.ts).
//
// Ne bloque JAMAIS l'action du kiné : toute erreur est seulement journalisée.
import type { SupabaseClient } from "@supabase/supabase-js";
import { followUpForCharge, recordMonthlyReview } from "@/lib/db/admin";
import { chargeReview } from "./followUp";
import { eurosFR, feeNoteNumber, periodLabel, periodOf } from "./reviewModel";

export async function recordMonthlyReviewIfDue(p: {
  supabase: SupabaseClient;
  instructorId: string;
  patientId: string;
  /** Ce que le kiné a fait, gardé dans le dossier (ex. « Séance ajustée : Genou, renforcement »). */
  note: string;
}): Promise<void> {
  try {
    const period = periodOf(new Date());
    // Déjà un bilan ce mois-ci : rien à faire (cas le plus fréquent, une seule lecture).
    const { data: existing } = await p.supabase
      .from("monthly_reviews")
      .select("id")
      .eq("patient_id", p.patientId)
      .eq("period", period)
      .maybeSingle();
    if (existing) return;

    const followUp = await followUpForCharge(p.patientId);
    if (
      !followUp ||
      followUp.instructor_id !== p.instructorId ||
      followUp.status !== "active" ||
      !followUp.stripe_customer_id ||
      !followUp.stripe_payment_method_id ||
      !followUp.connect_account_id
    ) {
      return; // Patient sans suivi mensuel actif : l'appli seule, rien à facturer.
    }
    const { data: connect } = await p.supabase
      .from("instructor_connect_accounts")
      .select("status, stripe_connect_account_id")
      .eq("instructor_id", p.instructorId)
      .maybeSingle();
    if (connect?.status !== "active" || connect.stripe_connect_account_id !== followUp.connect_account_id) return;

    let review: { review_id: string; fee_note_year: number; fee_note_seq: number };
    try {
      review = await recordMonthlyReview({
        patientId: p.patientId,
        instructorId: p.instructorId,
        period,
        feedback: p.note.slice(0, 2000) || "Programme ajusté",
        amountCents: followUp.price_cents,
      });
    } catch (e) {
      // 23505 = un autre onglet vient d'enregistrer le bilan du mois : rien à faire.
      if ((e as { code?: string }).code !== "23505") console.error("[autoReview] bilan non enregistré", e);
      return;
    }

    await chargeReview({
      reviewId: review.review_id,
      amountCents: followUp.price_cents,
      accountId: followUp.connect_account_id,
      customerId: followUp.stripe_customer_id,
      paymentMethodId: followUp.stripe_payment_method_id,
      description: `Bilan de suivi à distance - ${periodLabel(period)} - note n° ${feeNoteNumber(review.fee_note_year, review.fee_note_seq)} (${eurosFR(followUp.price_cents)} €)`,
    });
  } catch (e) {
    console.error("[autoReview] bilan automatique impossible", e);
  }
}
