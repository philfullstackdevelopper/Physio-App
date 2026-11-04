import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { PATIENT_PLANS, eurosFR, isPatientPlanKey, patientPlan, perMonthCents } from "@/lib/billing/patientPlans";
import CompteView, { type FollowUpSummary } from "./CompteView";

// « Paramètres » du patient. Formules 1 / 3 / 6 mois (2026-11-02) : la carte
// « Mon suivi » résume la formule et mène à /patient/suivi. Le reste (compte,
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
    supabase.from("patients").select("full_name, instructors ( full_name, review_price_cents )").eq("id", user.id).maybeSingle(),
    supabase.from("subscriptions").select("plan, status, current_period_end, cancel_at_period_end").eq("user_id", user.id).maybeSingle(),
  ]);
  const kine = patient?.instructors as unknown as { full_name: string | null; review_price_cents: number | null } | null;
  const kineName = kine?.full_name ?? "votre kiné";
  const free = kine?.review_price_cents === 0;
  const plan = sub && isPatientPlanKey(sub.plan) ? patientPlan(sub.plan) : null;
  const live = !!plan && (sub!.status === "active" || sub!.status === "trialing");
  const refused = !!plan && ["past_due", "unpaid", "incomplete"].includes(sub!.status as string);
  const date = sub?.current_period_end
    ? new Date(sub.current_period_end as string).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })
    : "";
  const cheapest = Math.min(...PATIENT_PLANS.map(perMonthCents));

  const summary: FollowUpSummary = {
    status: live ? "active" : refused ? "pending_card" : "none",
    priceCents: plan?.priceCents ?? 0,
    cardLabel: null,
    kineName,
    free,
    line: free
      ? `Offert par ${kineName} : rien à payer`
      : live
        ? `${plan!.label} · ${sub!.cancel_at_period_end ? `accès jusqu'au ${date}` : `renouvelée le ${date}`}`
        : refused
          ? "Le dernier paiement a été refusé"
          : `Formules dès ${eurosFR(cheapest)} € par mois (non remboursé)`,
  };

  return <CompteView fullName={(patient?.full_name as string | null) ?? null} error={error} followUp={summary} />;
}
