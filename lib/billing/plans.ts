// Plan definitions — amounts in the smallest currency unit (cents). Change a
// price here to A/B test (e.g. the kiné price at €19/€29/€39). Prices are built
// inline at checkout (Stripe Checkout supports subscription price_data), so there
// are no Stripe price IDs to manage.

export type PlanKey = "patient_monthly" | "kine_pro";

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
  kine_pro: {
    key: "kine_pro",
    label: "Physio-App — Kiné Pro",
    amount: 3000, // €30 / mois — test 1900 / 2900 / 3900
    currency: "eur",
    audience: "instructor",
  },
};

export function isPlanKey(v: unknown): v is PlanKey {
  return v === "patient_monthly" || v === "kine_pro";
}
