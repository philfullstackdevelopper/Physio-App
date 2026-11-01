// Données de la page « Suivi & facturation » du kiné. Tout passe par la session du kiné (RLS) : il ne lit que SES
// patients, SES bilans, SA facture EasyPhysio. Si la migration 0071 n'est pas
// encore appliquée, les nouvelles tables manquent : chaque lecture renvoie
// alors une liste vide plutôt que de casser la page.
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  effectiveReviewPrice,
  periodOf,
  periodCovered,
  planMonthsOf,
  platformFeeForPeriod,
  type PlanMonths,
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
  /** Prochaine échéance de l'abonnement EasyPhysio (premier mois offert sur la formule mensuelle). */
  /** Prochaine échéance de l'abonnement (durée choisie, cabinet compris). */
  monthEstimate: ReturnType<typeof platformFeeForPeriod>;
  firstBilledMonth: boolean;
  /** Durée choisie pour la prochaine échéance (1, 3, 6 ou 12 mois). */
  planMonths: PlanMonths;
  /** Fin de la période déjà réglée (ou offerte) qui couvre ce mois-ci, sinon null. */
  paidUntil: string | null;
  platformPaymentLabel: string | null;
  platformCustomerId: string | null;
  invoices: { periodStart: string; periodEnd: string; amountCents: number; status: string; patientCount: number }[];
  reviewMonths: string[];
  collectedCents: number;
};

/**
 * `cabinetKines` : nombre de kinés réglés ensemble par ce kiné s'il est le
 * payeur d'un cabinet (lui compris), 1 sinon — lu par la page via
 * lib/db/admin.ts (cabinetView).
 */
export async function loadKineBillingData(
  supabase: SupabaseClient,
  instructorId: string,
  now = new Date(),
  cabinetKines = 1,
): Promise<KineBillingData> {
  const period = periodOf(now);

  const [
    { data: kine },
    { data: patients },
    { data: followUps },
    { data: reviews },
    { data: platformBilling },
    { data: invoices },
    { data: allReviewPeriods },
    planRes,
  ] = await Promise.all([
    supabase.from("instructors").select("review_price_cents").eq("id", instructorId).maybeSingle(),
    supabase.from("patients").select("id, full_name, terms_accepted_at").eq("instructor_id", instructorId),
    supabase.from("patient_follow_ups").select("patient_id, status, price_cents, card_label").eq("instructor_id", instructorId),
    supabase.from("monthly_reviews").select("id, patient_id, payment_status, amount_cents, validated_at").eq("instructor_id", instructorId).eq("period", period),
    supabase.from("instructor_platform_billing").select("stripe_customer_id, payment_method_label").eq("instructor_id", instructorId).maybeSingle(),
    supabase.from("platform_invoices").select("period_start, period_end, amount_cents, status, patient_count").eq("instructor_id", instructorId).order("period_start", { ascending: false }).limit(12),
    supabase.from("monthly_reviews").select("period").eq("instructor_id", instructorId),
    // Lu à part : la colonne n'existe qu'avec la migration 0078 (sans elle, 1 mois).
    supabase.from("instructors").select("platform_plan_months").eq("id", instructorId).maybeSingle(),
  ]);
  const planMonths = planMonthsOf(planRes.error ? 1 : (planRes.data?.platform_plan_months as number | undefined));

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

  const pastInvoices = (invoices ?? []).filter((i) => (i.status as string) !== "draft" && (i.period_start as string) < period);
  const firstBilledMonth = pastInvoices.length === 0;
  const kinePrice = (kine?.review_price_cents as number | null) ?? null;

  return {
    period,
    kinePriceCents: kinePrice,
    priceCents: effectiveReviewPrice(kinePrice),
    followUps: rows,
    monthEstimate: platformFeeForPeriod({ months: planMonths, kines: cabinetKines, isFirstBilledMonth: firstBilledMonth }),
    firstBilledMonth,
    planMonths,
    paidUntil:
      (invoices ?? [])
        .filter((i) => (i.status as string) !== "draft" && periodCovered(period, i.period_start as string, i.period_end as string))
        .map((i) => i.period_end as string)
        .sort()
        .pop() ?? null,
    platformPaymentLabel: (platformBilling?.payment_method_label as string | null) ?? null,
    platformCustomerId: (platformBilling?.stripe_customer_id as string | null) ?? null,
    invoices: (invoices ?? []).map((i) => ({
      periodStart: i.period_start as string,
      periodEnd: i.period_end as string,
      amountCents: i.amount_cents as number,
      status: i.status as string,
      patientCount: i.patient_count as number,
    })),
    reviewMonths: [...new Set([period, ...(allReviewPeriods ?? []).map((r) => r.period as string)])].sort().reverse(),
    collectedCents: (reviews ?? []).filter((r) => r.payment_status === "paid").reduce((n, r) => n + (r.amount_cents as number), 0),
  };
}
