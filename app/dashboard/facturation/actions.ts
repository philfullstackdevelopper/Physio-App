"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { requireApprovedInstructor } from "@/lib/dashboard/requireApprovedInstructor";
import { pricingForCountry, FRANCE_PRICING, KINE_PRICE_MAX_CENTS, KINE_PRICE_MIN_CENTS, moneyLabel, parseKinePrice } from "@/lib/billing/patientPlans";
import type { Locale } from "@/i18n/locales";

// Tarif libre du kiné (Philippe, 2026-11-19) : 0 à 500 dans sa monnaie.
// Écrit par le kiné sur SA fiche (règle instructors_update_own) ; la base
// refuse elle-même un montant hors limites (contrainte de la migration 0077).
// Ses patients actuels paient le moins élevé entre leur tarif accepté et ce
// nouveau tarif (lib/billing/patientPlans.ts, chargeableKineCents).
export async function setKinePrice(formData: FormData) {
  const supabase = await createClient();
  const { user } = await requireApprovedInstructor(supabase);
  const t = await getTranslations("billing.facturation");
  const tf = await getTranslations("billing.format");
  const locale = (await getLocale()) as Locale;

  const { data: me } = await supabase.from("instructors").select("country").eq("id", user.id).maybeSingle();
  const pricing = pricingForCountry((me?.country as string | null) ?? null) ?? FRANCE_PRICING;
  const money = (c: number) => moneyLabel(c, pricing.currency, locale, (amount) => tf("eur", { amount }));

  const cents = parseKinePrice(formData.get("price"));
  if (cents === null) {
    redirect(`/dashboard/facturation?error=${encodeURIComponent(t("priceInvalid", { min: money(KINE_PRICE_MIN_CENTS), max: money(KINE_PRICE_MAX_CENTS) }))}`);
  }
  const { error } = await supabase.from("instructors").update({ review_price_cents: cents }).eq("id", user.id);
  if (error) {
    console.error("setKinePrice", error);
    redirect(`/dashboard/facturation?error=${encodeURIComponent(t("priceInvalid", { min: money(KINE_PRICE_MIN_CENTS), max: money(KINE_PRICE_MAX_CENTS) }))}`);
  }
  revalidatePath("/dashboard/facturation");
  redirect("/dashboard/facturation?tarif=ok");
}
