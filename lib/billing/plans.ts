// Plan definitions — amounts in the smallest currency unit (cents). Change a
// price here to A/B test. Prices are built inline at checkout (Stripe
// Checkout supports subscription price_data), so there are no Stripe price
// IDs to manage.
//
// "kine_pro" (a flat €30/mo instructor subscription) was removed: kinés now
// set their own patient price and pay Physio-App a prorated 15% platform fee
// per active patient instead — see lib/billing/platformFee.ts. The
// 'kine_platform_fee' subscriptions.plan value (migration 0020) represents
// that new relationship, but it isn't a fixed-price plan like the ones below
// (the amount varies every month), so it deliberately has no entry here.

export type PlanKey = "patient_monthly";

export interface Plan {
  key: PlanKey;
  label: string; // French, shown at checkout
  amount: number; // cents per month
  currency: string;
  audience: "patient" | "instructor";
}

export const PLANS: Record<PlanKey, Plan> = {
  patient_monthly: {
    key: "patient_monthly",
    label: "Physio-App — Abonnement patient",
    amount: 1000, // €10 / mois
    currency: "eur",
    audience: "patient",
  },
};

export function isPlanKey(v: unknown): v is PlanKey {
  return v === "patient_monthly";
}
