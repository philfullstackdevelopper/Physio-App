import Link from "next/link";
import { CheckCircle2, Lock } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { intlTag } from "@/lib/i18n/translator";
import type { Locale } from "@/i18n/locales";

// « Mon suivi » dans l'appli mobile (Philippe, 2026-11-07 : aucun paiement
// dans l'appli). Règles d'Apple et de Google : dans l'appli, ni prix, ni
// bouton ou lien de paiement. L'accès s'active sur le site ; l'appli dit
// seulement s'il est actif.
export default function AppAccessNotice({
  active,
  kineName,
  until,
}: {
  active: boolean;
  kineName: string;
  /** Fin de la période en cours, si l'accès a été arrêté. */
  until: string | null;
}) {
  const t = useTranslations("billing.appAccess");
  const locale = useLocale() as Locale;
  return (
    <main className="flex min-h-dvh items-center justify-center bg-app-bg p-6 max-sm:min-h-[calc(100dvh-var(--phone-chrome))]">
      <div className="w-full max-w-sm rounded-2xl bg-surface p-6 text-center shadow-soft">
        <span
          className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${active ? "bg-ok-soft text-ok" : "bg-brand-soft text-brand"}`}
        >
          {active ? <CheckCircle2 className="h-6 w-6" strokeWidth={1.75} /> : <Lock className="h-6 w-6" strokeWidth={1.75} />}
        </span>
        <h1 className="mt-4 text-xl font-semibold text-ink">{active ? t("activeTitle") : t("inactiveTitle")}</h1>
        <p className="mt-2 text-sm text-muted">
          {active
            ? until
              ? t("activeUntil", { kineName, date: new Date(until).toLocaleDateString(intlTag(locale), { day: "numeric", month: "long" }) })
              : t("activeText", { kineName })
            : t("inactiveText", { kineName })}
        </p>
        <div className="mt-5 flex flex-col gap-2">
          {active && (
            <Link href="/patient" className="rounded-full bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark">
              {t("myProgramme")}
            </Link>
          )}
          <Link href="/patient/compte" className="rounded-full border border-line px-4 py-2.5 text-sm font-medium text-ink hover:bg-app-bg">
            {t("settings")}
            </Link>
        </div>
      </div>
    </main>
  );
}
