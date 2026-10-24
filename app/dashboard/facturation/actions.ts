"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireApprovedInstructor } from "@/lib/dashboard/requireApprovedInstructor";
import { requestOrigin } from "@/lib/requestOrigin";
import { REVIEW_PRICE_MAX_CENTS, REVIEW_PRICE_MIN_CENTS, eurosFR, isValidReviewPrice } from "@/lib/billing/reviewModel";
import { createPlatformBillingSetupUrl } from "@/lib/billing/platformInvoice";

// Page « Suivi & facturation » du kiné (nouveau modèle, 2026-10-24).

/**
 * Le kiné fixe son tarif de bilan mensuel (entre 10 et 40 €). Le nouveau tarif
 * vaut pour les patients qui acceptent le suivi à partir de maintenant : un
 * patient déjà inscrit garde le tarif qu'il a accepté par écrit
 * (art. R.4321-98 CSP — information préalable sur le montant).
 */
export async function setReviewPrice(formData: FormData) {
  const supabase = await createClient();
  const { user } = await requireApprovedInstructor(supabase);
  const raw = String(formData.get("price_euros") ?? "").replace(",", ".").trim();
  const cents = Math.round(Number(raw) * 100);
  if (!isValidReviewPrice(cents)) {
    redirect(
      `/dashboard/facturation?error=${encodeURIComponent(
        `Le tarif doit être compris entre ${eurosFR(REVIEW_PRICE_MIN_CENTS, 0)} € et ${eurosFR(REVIEW_PRICE_MAX_CENTS, 0)} €.`,
      )}`,
    );
  }
  const { error } = await supabase.from("instructors").update({ review_price_cents: cents }).eq("id", user.id);
  if (error) {
    console.error("setReviewPrice:", error);
    redirect(`/dashboard/facturation?error=${encodeURIComponent("Enregistrement impossible pour le moment. Réessayez dans un instant.")}`);
  }
  redirect("/dashboard/facturation?saved=prix");
}

/** Ouvre la page Stripe (compte EasyPhysio) où le kiné enregistre sa carte ou son IBAN pour sa facture mensuelle. */
export async function startPlatformBillingSetup() {
  const supabase = await createClient();
  const { user } = await requireApprovedInstructor(supabase);
  const [{ data: kine }, { data: billing }] = await Promise.all([
    supabase.from("instructors").select("full_name, cabinet_name").eq("id", user.id).maybeSingle(),
    supabase.from("instructor_platform_billing").select("stripe_customer_id").eq("instructor_id", user.id).maybeSingle(),
  ]);
  let url: string | null = null;
  try {
    url = await createPlatformBillingSetupUrl({
      instructorId: user.id,
      email: user.email ?? null,
      name: ((kine?.cabinet_name as string | null) || (kine?.full_name as string | null)) ?? null,
      existingCustomerId: (billing?.stripe_customer_id as string | null) ?? null,
      baseUrl: await requestOrigin(),
    });
  } catch (e) {
    console.error("startPlatformBillingSetup:", e);
  }
  if (!url) redirect(`/dashboard/facturation?error=${encodeURIComponent("Le paiement est momentanément indisponible. Réessayez dans quelques minutes.")}`);
  redirect(url);
}
