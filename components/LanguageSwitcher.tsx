"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Languages } from "lucide-react";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/i18n/locales";
import { changeLocale } from "@/lib/i18n/actions";

// Sélecteur de langue (Philippe, 2026-11-06).
// - variant « compact » : petite pastille « FR · EN » (accueil, inscription,
//   connexion) ; `tone="light"` pour les fonds sombres.
// - variant « row » : ligne de réglage avec titre, pour /patient/compte et
//   /dashboard/informations.
// Le choix est enregistré dans le cookie et, si la personne est connectée,
// sur son compte (lib/i18n/actions.ts).
export default function LanguageSwitcher({
  variant = "compact",
  tone = "dark",
  className = "",
}: {
  variant?: "compact" | "row";
  tone?: "dark" | "light";
  className?: string;
}) {
  const current = useLocale() as Locale;
  const t = useTranslations("common.language");
  const router = useRouter();
  const [pending, start] = useTransition();

  function pick(locale: Locale) {
    if (locale === current || pending) return;
    start(async () => {
      await changeLocale(locale);
      router.refresh();
    });
  }

  const buttons = LOCALES.map((l) => {
    const active = l === current;
    const base =
      variant === "compact"
        ? "rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide transition-colors"
        : "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors";
    const colors =
      tone === "light"
        ? active
          ? "bg-white/20 text-white"
          : "text-white/60 hover:text-white"
        : active
          ? "bg-brand text-white"
          : "text-muted hover:text-ink";
    return (
      <button
        key={l}
        type="button"
        onClick={() => pick(l)}
        aria-pressed={active}
        lang={l}
        title={LOCALE_LABELS[l]}
        className={`${base} ${colors}`}
      >
        {variant === "compact" ? l : LOCALE_LABELS[l]}
      </button>
    );
  });

  if (variant === "compact") {
    return (
      <div
        role="group"
        aria-label={t("label")}
        className={`inline-flex items-center gap-0.5 rounded-full p-0.5 ${tone === "light" ? "bg-white/10" : "bg-surface ring-1 ring-line"} ${pending ? "opacity-60" : ""} ${className}`}
      >
        {buttons}
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-between gap-3 ${className}`}>
      <div className="flex min-w-0 items-center gap-3">
        <Languages className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.75} />
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink">{t("label")}</p>
          <p className="truncate text-xs text-muted">{t("hint")}</p>
        </div>
      </div>
      <div role="group" aria-label={t("label")} className={`flex shrink-0 gap-1 rounded-xl bg-app-bg p-1 ${pending ? "opacity-60" : ""}`}>
        {buttons}
      </div>
    </div>
  );
}
