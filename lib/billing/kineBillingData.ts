// Données de la page « Suivi & facturation » du kiné (nouveau modèle,
// 2026-10-24). Tout passe par la session du kiné (RLS) : il ne lit que SES
// patients, SES bilans, SA facture EasyPhysio. Si la migration 0071 n'est pas
// encore appliquée, les nouvelles tables manquent : chaque lecture renvoie
// alors une liste vide plutôt que de casser la page.
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  effectiveReviewPrice,
  isActivePatient,
  nextPeriod,
  periodOf,
  platformFeeForMonth,
} from "./reviewModel";

export type FollowUpRow = {
  patientId: string;
  name: string;
  status: "pending_card" | "active" | "stopped";
  priceCents: number;
  cardLabel: string | null;
  review: { id: string; paymentStatus: "pending" | "paid" | "failed"; amountCents: number; validatedAt: string } | null;
};

export type KineBillingData = {
  period: string;
  kinePriceCents: number | null;
  priceCents: number;
  followUps: FollowUpRow[];
  notInFollowUp: number;
  activePatients: number;
  monthEstimate: ReturnType<typeof platformFeeForMonth>;
  firstBilledMonth: boolean;
  platformPaymentLabel: string | null;
  platformCustomerId: string | null;
  invoices: { periodStart: string; amountCents: number; status: string; patientCount: number }[];
  reviewMonths: string[];
  collectedCents: number;
};

export async function loadKineBillingData(supabase: SupabaseClient, instructorId: string, now = new Date()): Promise<KineBillingData> {
  const period = periodOf(now);
  const periodEnd = nextPeriod(period);

  const [
    { data: kine },
    { data: patients },
    { data: followUps },
    { data: reviews },
    { data: logs },
    { data: feedback },
    { data: platformBilling },
    { data: invoices },
    { data: allReviewPeriods },
  ] = await Promise.all([
    supabase.from("instructors").select("review_price_cents").eq("id", instructorId).maybeSingle(),
    supabase.from("patients").select("id, full_name, terms_accepted_at").eq("instructor_id", instructorId),
    supabase.from("patient_follow_ups").select("patient_id, status, price_cents, card_label").eq("instructor_id", instructorId),
    supabase.from("monthly_reviews").select("id, patient_id, payment_status, amount_cents, validated_at").eq("instructor_id", instructorId).eq("period", period),
    supabase.from("workout_logs").select("patient_id").gte("completed_at", period).lt("completed_at", periodEnd),
    supabase.from("patient_feedback").select("patient_id").gte("created_at", period).lt("created_at", periodEnd),
    supabase.from("instructor_platform_billing").select("stripe_customer_id, payment_method_label").eq("instructor_id", instructorId).maybeSingle(),
    supabase.from("platform_invoices").select("period_start, amount_cents, status, patient_count").eq("instructor_id", instructorId).order("period_start", { ascending: false }).limit(12),
    supabase.from("monthly_reviews").select("period").eq("instructor_id", instructorId),
  ]);

  const nameOf = new Map((patients ?? []).map((p) => [p.id as string, ((p.full_name as string | null) ?? "Patient").trim()]));
  const reviewOf = new Map((reviews ?? []).map((r) => [r.patient_id as string, r]));

  const rows: FollowUpRow[] = (followUps ?? [])
    .filter((f) => f.status !== "stopped" || reviewOf.has(f.patient_id as string))
    .map((f) => {
      const r = reviewOf.get(f.patient_id as string);
      return {
        patientId: f.patient_id as string,
        name: nameOf.get(f.patient_id as string) ?? "Patient",
        status: f.status as FollowUpRow["status"],
        priceCents: f.price_cents as number,
        cardLabel: (f.card_label as string | null) ?? null,
        review: r
          ? {
              id: r.id as string,
              paymentStatus: r.payment_status as "pending" | "paid" | "failed",
              amountCents: r.amount_cents as number,
              validatedAt: r.validated_at as string,
            }
          : null,
      };
    })
    // À faire d'abord, puis par nom.
    .sort((a, b) => Number(!!a.review) - Number(!!b.review) || a.name.localeCompare(b.name, "fr"));

  const sessions = new Map<string, number>();
  for (const l of logs ?? []) sessions.set(l.patient_id as string, (sessions.get(l.patient_id as string) ?? 0) + 1);
  const feedbackCount = new Map<string, number>();
  for (const f of feedback ?? []) feedbackCount.set(f.patient_id as string, (feedbackCount.get(f.patient_id as string) ?? 0) + 1);

  const activePatients = (patients ?? []).filter((p) =>
    isActivePatient({
      termsAccepted: !!p.terms_accepted_at,
      sessionsThisMonth: sessions.get(p.id as string) ?? 0,
      feedbackThisMonth: feedbackCount.get(p.id as string) ?? 0,
      reviewThisMonth: reviewOf.has(p.id as string),
    }),
  ).length;

  const pastInvoices = (invoices ?? []).filter((i) => (i.status as string) !== "draft" && (i.period_start as string) < period);
  const firstBilledMonth = pastInvoices.length === 0;
  const followed = new Set((followUps ?? []).filter((f) => f.status !== "stopped").map((f) => f.patient_id as string));
  const kinePrice = (kine?.review_price_cents as number | null) ?? null;

  return {
    period,
    kinePriceCents: kinePrice,
    priceCents: effectiveReviewPrice(kinePrice),
    followUps: rows,
    notInFollowUp: (patients ?? []).filter((p) => p.terms_accepted_at && !followed.has(p.id as string)).length,
    activePatients,
    monthEstimate: platformFeeForMonth(activePatients, firstBilledMonth),
    firstBilledMonth,
    platformPaymentLabel: (platformBilling?.payment_method_label as string | null) ?? null,
    platformCustomerId: (platformBilling?.stripe_customer_id as string | null) ?? null,
    invoices: (invoices ?? []).map((i) => ({
      periodStart: i.period_start as string,
      amountCents: i.amount_cents as number,
      status: i.status as string,
      patientCount: i.patient_count as number,
    })),
    reviewMonths: [...new Set([period, ...(allReviewPeriods ?? []).map((r) => r.period as string)])].sort().reverse(),
    collectedCents: (reviews ?? []).filter((r) => r.payment_status === "paid").reduce((n, r) => n + (r.amount_cents as number), 0),
  };
}
