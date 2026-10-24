"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireApprovedInstructor } from "@/lib/dashboard/requireApprovedInstructor";
import { followUpForCharge, recordMonthlyReview } from "@/lib/db/admin";
import { chargeReview } from "@/lib/billing/followUp";
import { eurosFR, feeNoteNumber, periodLabel, periodOf } from "@/lib/billing/reviewModel";

// Bilan de suivi mensuel, côté kiné (nouveau modèle, 2026-10-24).
//
// Valider le bilan = l'acte réellement effectué (art. R.4321-98 CSP) : le
// retour écrit est enregistré (dossier + note d'honoraires numérotée), envoyé
// au patient dans sa messagerie, puis sa carte est prélevée du tarif qu'il a
// accepté — sur le compte Stripe du kiné, 0 % pour EasyPhysio. Un seul bilan
// par patient et par mois ; les échanges suivants du mois sont inclus.

const back = (patientId: string, q: string) => redirect(`/dashboard/patients/${patientId}?${q}#bilan`);

export async function validateMonthlyReview(formData: FormData) {
  const supabase = await createClient();
  const { user } = await requireApprovedInstructor(supabase);
  const patientId = String(formData.get("patient_id") ?? "");
  const feedback = String(formData.get("feedback") ?? "").trim();
  if (!patientId) redirect("/dashboard/patients");
  if (feedback.length < 10) back(patientId, `bilan_erreur=${encodeURIComponent("Écrivez votre retour au patient (quelques phrases).")}`);

  // Le patient doit être l'un des siens (RLS) et son suivi actif, carte enregistrée.
  const { data: patient } = await supabase.from("patients").select("id, instructor_id").eq("id", patientId).maybeSingle();
  if (!patient || patient.instructor_id !== user.id) redirect("/dashboard/patients");
  const followUp = await followUpForCharge(patientId);
  if (!followUp || followUp.instructor_id !== user.id || followUp.status !== "active" || !followUp.stripe_customer_id || !followUp.stripe_payment_method_id) {
    back(patientId, `bilan_erreur=${encodeURIComponent("Ce patient n'a pas (ou plus) de suivi mensuel actif avec une carte enregistrée.")}`);
  }
  const { data: connect } = await supabase
    .from("instructor_connect_accounts")
    .select("status, stripe_connect_account_id")
    .eq("instructor_id", user.id)
    .maybeSingle();
  const accountId = connect?.status === "active" ? ((connect.stripe_connect_account_id as string | null) ?? null) : null;
  if (!accountId || accountId !== followUp!.connect_account_id) {
    back(patientId, `bilan_erreur=${encodeURIComponent("Activez d'abord vos paiements (Suivi & facturation) pour encaisser vos bilans.")}`);
  }

  const period = periodOf(new Date());
  let review: { review_id: string; fee_note_year: number; fee_note_seq: number } | null = null;
  try {
    review = await recordMonthlyReview({
      patientId,
      instructorId: user.id,
      period,
      feedback,
      amountCents: followUp!.price_cents,
    });
  } catch (e) {
    const code = (e as { code?: string }).code;
    if (code === "23505") back(patientId, `bilan_erreur=${encodeURIComponent(`Le bilan de ${periodLabel(period)} est déjà validé.`)}`);
    console.error("validateMonthlyReview:", e);
    back(patientId, `bilan_erreur=${encodeURIComponent("Enregistrement du bilan impossible pour le moment. Réessayez dans un instant.")}`);
  }

  // Le retour arrive dans la messagerie du patient.
  await supabase.from("patient_messages").insert({
    patient_id: patientId,
    instructor_id: user.id,
    sender: "instructor",
    body: `Bilan de ${periodLabel(period)}\n\n${feedback}`,
  });

  const status = await chargeReview({
    reviewId: review!.review_id,
    amountCents: followUp!.price_cents,
    accountId: accountId!,
    customerId: followUp!.stripe_customer_id!,
    paymentMethodId: followUp!.stripe_payment_method_id!,
    description: `Bilan de suivi à distance — ${periodLabel(period)} — note n° ${feeNoteNumber(review!.fee_note_year, review!.fee_note_seq)} (${eurosFR(followUp!.price_cents)} €)`,
  });

  revalidatePath("/dashboard/facturation");
  revalidatePath(`/dashboard/patients/${patientId}`);
  back(patientId, `bilan=${status}`);
}

/** Envoie au patient un message lui proposant le suivi mensuel (il l'active lui-même, depuis son appli). */
export async function proposeFollowUp(formData: FormData) {
  const supabase = await createClient();
  const { user } = await requireApprovedInstructor(supabase);
  const patientId = String(formData.get("patient_id") ?? "");
  const priceCents = Number(formData.get("price_cents"));
  const { data: patient } = await supabase.from("patients").select("id, instructor_id").eq("id", patientId).maybeSingle();
  if (!patient || patient.instructor_id !== user.id) redirect("/dashboard/patients");
  await supabase.from("patient_messages").insert({
    patient_id: patientId,
    instructor_id: user.id,
    sender: "instructor",
    body:
      `Je vous propose de continuer votre suivi à distance : une fois par mois, je regarde vos séances et vos douleurs, j'ajuste votre programme et je vous écris.\n\n` +
      `Tarif : ${eurosFR(priceCents)} € par bilan (acte non remboursé), prélevé seulement le mois où le bilan est fait. Vous pouvez arrêter quand vous voulez.\n\n` +
      `Pour l'activer : Compte → Suivi mensuel.`,
  });
  revalidatePath(`/dashboard/patients/${patientId}`);
  back(patientId, "bilan=propose");
}
