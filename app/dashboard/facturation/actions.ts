"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireApprovedInstructor } from "@/lib/dashboard/requireApprovedInstructor";
import { requestOrigin } from "@/lib/requestOrigin";
import { REVIEW_PRICE_MAX_CENTS, REVIEW_PRICE_MIN_CENTS, eurosFR, isPlanMonths, isValidReviewPrice } from "@/lib/billing/reviewModel";
import { cabinetInvite, cabinetRemove, cabinetRespond } from "@/lib/db/admin";
import { createPlatformBillingSetupUrl } from "@/lib/billing/platformInvoice";

// Page « Suivi & facturation » du kiné (nouveau modèle, 2026-10-24).

/**
 * Le kiné fixe son tarif de bilan mensuel (0 € = accès gratuit, sinon entre 10 et 40 €). Le nouveau tarif
 * vaut pour les patients qui acceptent le suivi à partir de maintenant : un
 * patient déjà inscrit garde le tarif qu'il a accepté par écrit
 * (art. R.4321-98 CSP — information préalable sur le montant).
 */
export async function setReviewPrice(formData: FormData) {
  const supabase = await createClient();
  const { user } = await requireApprovedInstructor(supabase);
  const raw = String(formData.get("price_euros") ?? "").replace(",", ".").trim();
  // Case vide : refusée (Number("") vaudrait 0, soit « gratuit » par erreur).
  const cents = raw === "" ? Number.NaN : Math.round(Number(raw) * 100);
  if (!isValidReviewPrice(cents)) {
    redirect(
      `/dashboard/facturation?error=${encodeURIComponent(
        `Le tarif doit être 0 € (accès gratuit) ou compris entre ${eurosFR(REVIEW_PRICE_MIN_CENTS, 0)} € et ${eurosFR(REVIEW_PRICE_MAX_CENTS, 0)} €.`,
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

const back = (q: string): never => redirect(`/dashboard/facturation?${q}`);
const fail = (msg: string): never => back(`error=${encodeURIComponent(msg)}`);

/**
 * Durée de l'abonnement EasyPhysio (1, 3, 6 ou 12 mois, payés d'avance) :
 * vaut pour la prochaine échéance, jamais pour la période déjà réglée.
 */
export async function setPlanMonths(formData: FormData) {
  const supabase = await createClient();
  const { user } = await requireApprovedInstructor(supabase);
  const months = Number(formData.get("months"));
  if (!isPlanMonths(months)) fail("Durée inconnue.");
  const { error } = await supabase.from("instructors").update({ platform_plan_months: months }).eq("id", user.id);
  if (error) {
    console.error("setPlanMonths:", error);
    fail("Enregistrement impossible pour le moment. Réessayez dans un instant.");
  }
  back("saved=duree");
}

const CABINET_ERRORS: Record<string, string> = {
  NOT_FOUND: "Aucun kiné validé sur EasyPhysio avec cette adresse. Votre collègue doit d'abord avoir son compte.",
  SELF: "C'est votre propre adresse.",
  PAYER_IS_MEMBER: "Votre abonnement est déjà réglé par un cabinet : seul son payeur peut inviter des collègues.",
  ALREADY_IN_CABINET: "Ce kiné est déjà dans un cabinet (ou a déjà une invitation en attente).",
  MEMBER_IS_PAYER: "Ce kiné règle déjà l'abonnement d'autres collègues : il ne peut pas rejoindre un autre cabinet.",
  FULL: "Votre cabinet a atteint le nombre maximum de kinés.",
  PAYER_NOT_APPROVED: "Votre compte doit être validé pour inviter des collègues.",
};

/** Le payeur invite un collègue kiné (par son e-mail) ; le collègue devra accepter. */
export async function inviteToCabinet(formData: FormData) {
  const supabase = await createClient();
  const { user } = await requireApprovedInstructor(supabase);
  const email = String(formData.get("email") ?? "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail("Adresse e-mail invalide.");
  let code: string;
  try {
    code = await cabinetInvite(user.id, email);
  } catch (e) {
    console.error("inviteToCabinet:", e);
    return fail("Invitation impossible pour le moment. Réessayez dans un instant.");
  }
  if (code !== "OK") fail(CABINET_ERRORS[code] ?? "Invitation impossible.");
  back("saved=cabinet");
}

/** Le collègue accepte ou refuse l'invitation d'un cabinet. */
export async function respondToCabinet(formData: FormData) {
  const supabase = await createClient();
  const { user } = await requireApprovedInstructor(supabase);
  const accept = formData.get("accept") === "1";
  let code: string;
  try {
    code = await cabinetRespond(user.id, accept);
  } catch (e) {
    console.error("respondToCabinet:", e);
    return fail("Réponse impossible pour le moment. Réessayez dans un instant.");
  }
  if (code !== "OK") fail(CABINET_ERRORS[code] ?? "Réponse impossible.");
  back(accept ? "saved=cabinet-rejoint" : "saved=cabinet-refuse");
}

/** Défaire un lien : le payeur retire un collègue, ou le collègue quitte le cabinet. */
export async function removeFromCabinet(formData: FormData) {
  const supabase = await createClient();
  const { user } = await requireApprovedInstructor(supabase);
  const memberId = String(formData.get("member_id") ?? "");
  if (!memberId) fail("Kiné introuvable.");
  try {
    await cabinetRemove(user.id, memberId);
  } catch (e) {
    console.error("removeFromCabinet:", e);
    fail("Action impossible pour le moment. Réessayez dans un instant.");
  }
  back("saved=cabinet-retire");
}
