import { useLocale, useTranslations } from "next-intl";
import { CreditCard } from "lucide-react";
import type { Locale } from "@/i18n/locales";
import SubmitButton from "@/components/SubmitButton";
import { eurosFR } from "@/lib/billing/patientPlans";
import { periodLabel } from "@/lib/billing/reviewModel";
import { payReview } from "./actions";

// Honoraires du kiné non encaissés (audit du 2026-11-08) : la banque du
// patient a refusé le prélèvement automatique, ou exige qu'il le confirme
// lui-même (3-D Secure). Un bandeau sobre avec un bouton « Payer » par mois
// concerné. Ne s'affiche que s'il y a quelque chose à régler.
export type UnpaidReview = {
  id: string;
  period: string;
  amountCents: number;
  status: "failed" | "action_required";
};

export default function ReviewPaymentNotice({ reviews, kineName }: { reviews: UnpaidReview[]; kineName: string }) {
  const t = useTranslations("billing.reviewPayment");
  const tf = useTranslations("billing.format");
  const locale = useLocale() as Locale;
  if (reviews.length === 0) return null;
  return (
    <section className="rounded-2xl border border-warn/30 bg-warn-soft p-4 text-sm text-ink">
      {reviews.map((r) => (
        <div key={r.id} className="flex flex-wrap items-center gap-3 [&+&]:mt-3 [&+&]:border-t [&+&]:border-warn/20 [&+&]:pt-3">
          <CreditCard className="h-5 w-5 shrink-0 text-warn" strokeWidth={1.75} />
          <p className="min-w-0 flex-1">
            {r.status === "action_required"
              ? t("actionRequired", { kineName, period: periodLabel(r.period, locale), amount: tf("eur", { amount: eurosFR(r.amountCents, locale) }) })
              : t("failed", { kineName, period: periodLabel(r.period, locale), amount: tf("eur", { amount: eurosFR(r.amountCents, locale) }) })}
          </p>
          <form action={payReview}>
            <input type="hidden" name="review_id" value={r.id} />
            <SubmitButton pendingText={t("opening")} className="rounded-full bg-brand px-4 py-1.5 text-sm font-semibold text-white hover:brightness-95">
              {t("pay")}
            </SubmitButton>
          </form>
        </div>
      ))}
    </section>
  );
}
