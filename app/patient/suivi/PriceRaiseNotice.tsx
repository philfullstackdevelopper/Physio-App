import { useTranslations } from "next-intl";
import SubmitButton from "@/components/SubmitButton";
import { acceptKinePrice } from "./actions";

// Tarif libre (2026-11-19) : le kiné a AUGMENTÉ son tarif. Une carte sobre,
// le nouveau montant, une case, un bouton. D'ici l'accord, le patient paie
// l'ancien montant (lib/billing/patientPlans.ts, chargeableKineCents).
export default function PriceRaiseNotice({
  kineName,
  oldLabel,
  newLabel,
  newCents,
}: {
  kineName: string;
  oldLabel: string;
  newLabel: string;
  newCents: number;
}) {
  const t = useTranslations("billing.suivi");
  return (
    <form action={acceptKinePrice} className="rounded-xl border border-line bg-surface p-3 text-sm">
      <p className="font-medium text-ink">{t("priceRaiseTitle", { kineName })}</p>
      <p className="mt-0.5 text-muted">{t("priceRaiseText", { old: oldLabel, new: newLabel })}</p>
      <input type="hidden" name="kine_cents" value={newCents} />
      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-ink">
          <input type="checkbox" name="consent" required className="h-4 w-4 accent-brand" />
          {t("priceRaiseConsent")}
        </label>
        <SubmitButton pendingText={t("priceRaiseAccept")} className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white transition hover:bg-brand-dark">
          {t("priceRaiseAccept")}
        </SubmitButton>
      </div>
    </form>
  );
}
