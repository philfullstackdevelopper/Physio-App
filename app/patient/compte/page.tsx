import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { ACCESS_PLAN_KEY, PATIENT_MONTHLY_TOTAL_CENTS, TRIAL_DAYS, eurosFR, isLegacyPlanKey } from "@/lib/billing/patientPlans";
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
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const [{ data: patient }, { data: sub }] = await Promise.all([
    supabase.from("patients").select("full_name, instructors ( full_name )").eq("id", user.id).maybeSingle(),
    supabase.from("subscriptions").select("plan, status, current_period_end, cancel_at_period_end").eq("user_id", user.id).maybeSingle(),
  ]);
  const kine = patient?.instructors as unknown as { full_name: string | null } | null;
  const kineName = kine?.full_name ?? "votre kiné";
  const known = !!sub && (sub.plan === ACCESS_PLAN_KEY || isLegacyPlanKey(sub.plan));
  const live = known && (sub!.status === "active" || sub!.status === "trialing");
  const refused = known && ["past_due", "unpaid", "incomplete"].includes(sub!.status as string);
  const date = sub?.current_period_end
    ? new Date(sub.current_period_end as string).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })
    : "";

  const summary: FollowUpSummary = {
    status: live ? "active" : refused ? "pending_card" : "none",
    priceCents: PATIENT_MONTHLY_TOTAL_CENTS,
    cardLabel: null,
    kineName,
    line: live
        ? sub!.cancel_at_period_end || isLegacyPlanKey(sub!.plan)
          ? `Accès jusqu'au ${date}`
          : sub!.status === "trialing"
            ? `Essai gratuit jusqu'au ${date}`
            : `Actif · prochain mois le ${date}`
        : refused
          ? "Le dernier paiement a été refusé"
          : `${TRIAL_DAYS} jours offerts, puis ${eurosFR(PATIENT_MONTHLY_TOTAL_CENTS)} € par mois au plus (non remboursé)`,
  };

  return <CompteView fullName={(patient?.full_name as string | null) ?? null} error={error} followUp={summary} />;
}
