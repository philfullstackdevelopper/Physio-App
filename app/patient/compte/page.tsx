import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { LOWEST_MONTHLY_TOTAL_CENTS, TRIAL_DAYS, eurosFR, isLegacySubscription, isPlatformOfferKey, isPlatformSubscription, platformOffer, type SubscriptionRow } from "@/lib/billing/patientPlans";
import { nativeAppPlatform } from "@/lib/app/nativeAppServer";
import { getLocale, getTranslations } from "next-intl/server";
import { intlTag } from "@/lib/i18n/translator";
import type { Locale } from "@/i18n/locales";
import CompteView, { type FollowUpSummary } from "./CompteView";

// « Paramètres » du patient. Modèle définitif (2026-11-04, lib/billing/patientPlans.ts) :
// la carte « Mon suivi » résume l'abonnement et mène à /patient/suivi. Le reste (compte,
// export des données, suppression — droits RGPD) ne change pas.
export default async function CompteePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("patient.compte");
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const [{ data: patient }, { data: sub }] = await Promise.all([
    supabase.from("patients").select("full_name").eq("id", user.id).maybeSingle(),
    supabase.from("subscriptions").select("plan, status, current_period_end, cancel_at_period_end, stripe_account_id").eq("user_id", user.id).maybeSingle(),
  ]);
  const row = (sub as unknown as SubscriptionRow | null) ?? null;
  const legacy = isLegacySubscription(row);
  const known = legacy || isPlatformSubscription(row);
  const offer = known && !legacy && isPlatformOfferKey(sub!.plan) ? platformOffer(sub!.plan) : null;
  const live = known && (sub!.status === "active" || sub!.status === "trialing");
  const refused = known && ["past_due", "unpaid", "incomplete"].includes(sub!.status as string);
  const date = sub?.current_period_end
    ? new Date(sub.current_period_end as string).toLocaleDateString(intlTag(locale), { day: "numeric", month: "long" })
    : "";

  const summary: FollowUpSummary = {
    status: live ? "active" : refused ? "pending_card" : "none",
    line: live
        ? sub!.cancel_at_period_end || legacy
          ? t("lineAccessUntil", { date })
          : sub!.status === "trialing"
            ? t("lineTrialUntil", { date })
            : t("lineNextMonth", { offer: offer ? t(`offers.${offer.key}`) : t("lineActive"), date })
        : refused
          ? t("lineRefused")
          : t("lineNone", { days: TRIAL_DAYS, price: eurosFR(LOWEST_MONTHLY_TOTAL_CENTS, locale) }),
  };

  // Appli mobile : pas de carte « Mon suivi » avec ses prix (règles d'Apple / Google).
  const inApp = !!(await nativeAppPlatform());
  return <CompteView fullName={(patient?.full_name as string | null) ?? null} error={error} followUp={summary} inApp={inApp} />;
}
