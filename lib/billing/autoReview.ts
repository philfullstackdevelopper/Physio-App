// Honoraires du kiné, prélevés AUTOMATIQUEMENT (modèle définitif, Philippe
// 2026-11-04 ; montants : lib/billing/patientPlans.ts). Le programme du mois
// compte comme « fait » la première fois dans le mois que le kiné travaille
// dessus : séance attribuée, séance ajustée, ou séance personnelle du patient
// enregistrée. Aucun bouton.
// (Dans le code et la base, ce mois facturé s'appelle encore « review ».)
//
// Ce qui se passe alors (une seule fois par patient et par mois) : le mois est
// enregistré avec son numéro de note d'honoraires, puis la carte du patient
// (copiée chez le kiné à la souscription) est prélevée de 6,00 € sur le compte
// Stripe du KINÉ, sans aucune part pour EasyPhysio (lib/billing/followUp.ts).
// Conditions : abonnement d'accès du patient actif et hors essai, kiné non
// suspendu, paiements du kiné actifs. Pendant l'essai, rien n'est prélevé.
//
// Ne bloque JAMAIS l'action du kiné : toute erreur est seulement journalisée.
import type { SupabaseClient } from "@supabase/supabase-js";
import { followUpForCharge, recordMonthlyReview } from "@/lib/db/admin";
import { chargeReview } from "./followUp";
import { feeNoteNumber, periodLabel, periodOf } from "./reviewModel";
import { KINE_FOLLOW_UP_CENTS, eurosFR, kineFollowUpChargeable, type SubscriptionRow } from "./patientPlans";
import { ensureKineCard } from "./patientSubscription";

/** Libellé du paiement chez Stripe (relevé du kiné, reçu du patient). */
export function reviewChargeDescription(period: string, feeNoteYear: number, feeNoteSeq: number, amountCents: number = KINE_FOLLOW_UP_CENTS): string {
  return `Programme mensuel hors nomenclature - ${periodLabel(period)} - note n° ${feeNoteNumber(feeNoteYear, feeNoteSeq)} (${eurosFR(amountCents)} €)`;
}

export async function recordMonthlyReviewIfDue(p: {
  supabase: SupabaseClient;
  instructorId: string;
  patientId: string;
  /** Ce que le kiné a fait, gardé dans le dossier (ex. « Séance ajustée : Genou, renforcement »). */
  note: string;
}): Promise<void> {
  try {
    const period = periodOf(new Date());
    // Déjà un mois facturé ce mois-ci : rien à faire (cas le plus fréquent, une seule lecture).
    const { data: existing } = await p.supabase
      .from("monthly_reviews")
      .select("id")
      .eq("patient_id", p.patientId)
      .eq("period", period)
      .maybeSingle();
    if (existing) return;

    const [{ data: sub }, { data: connect }, { data: kine }, { data: patient }] = await Promise.all([
      p.supabase
        .from("subscriptions")
        .select("plan, status, current_period_end, cancel_at_period_end, stripe_subscription_id, stripe_account_id")
        .eq("user_id", p.patientId)
        .maybeSingle(),
      p.supabase.from("instructor_connect_accounts").select("status, stripe_connect_account_id").eq("instructor_id", p.instructorId).maybeSingle(),
      p.supabase.from("instructors").select("status").eq("id", p.instructorId).maybeSingle(),
      p.supabase.from("patients").select("full_name, email").eq("id", p.patientId).maybeSingle(),
    ]);
    // Patient sans abonnement d'accès actif, ou encore en essai : rien à prélever.
    if (!kineFollowUpChargeable((sub as unknown as SubscriptionRow | null) ?? null)) return;
    if ((kine?.status as string | null) === "suspended") return;
    const accountId = connect?.status === "active" ? ((connect.stripe_connect_account_id as string | null) ?? null) : null;
    if (!accountId) return;

    // Carte du patient chez le kiné : copiée à la souscription ; sinon (ou si
    // le kiné a changé de compte Stripe), on la copie maintenant.
    let followUp = await followUpForCharge(p.patientId);
    const cardReady = (f: typeof followUp) =>
      !!f && f.instructor_id === p.instructorId && f.status === "active" && !!f.stripe_customer_id && !!f.stripe_payment_method_id && f.connect_account_id === accountId;
    if (!cardReady(followUp)) {
      const copied = await ensureKineCard({
        patientId: p.patientId,
        instructorId: p.instructorId,
        connectAccountId: accountId,
        platformSubscriptionId: sub!.stripe_subscription_id as string,
        email: (patient?.email as string | null) ?? null,
        name: (patient?.full_name as string | null) ?? null,
      });
      if (!copied) return;
      followUp = await followUpForCharge(p.patientId);
      if (!cardReady(followUp)) return;
    }

    let review: { review_id: string; fee_note_year: number; fee_note_seq: number };
    try {
      review = await recordMonthlyReview({
        patientId: p.patientId,
        instructorId: p.instructorId,
        period,
        feedback: p.note.slice(0, 2000) || "Programme mis à jour",
        amountCents: KINE_FOLLOW_UP_CENTS,
      });
    } catch (e) {
      // 23505 = un autre onglet vient d'enregistrer le mois : rien à faire.
      if ((e as { code?: string }).code !== "23505") console.error("[autoReview] mois non enregistré", e);
      return;
    }

    await chargeReview({
      reviewId: review.review_id,
      amountCents: KINE_FOLLOW_UP_CENTS,
      accountId,
      customerId: followUp!.stripe_customer_id!,
      paymentMethodId: followUp!.stripe_payment_method_id!,
      description: reviewChargeDescription(period, review.fee_note_year, review.fee_note_seq),
      receiptEmail: (patient?.email as string | null) ?? null,
    });
    // Refus ou validation demandée par la banque : le patient voit un bouton
    // « Payer » sur son appli (app/patient/suivi, ReviewPaymentNotice).
  } catch (e) {
    console.error("[autoReview] prélèvement automatique impossible", e);
  }
}
