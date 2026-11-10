"use client"; // Les pages d'erreur doivent être des composants client (Next.js).

import { useEffect } from "react";
import { useTranslations } from "next-intl";

// Page d'erreur maison (audit du 2026-11-10, A3) : avant, la moindre erreur
// imprévue affichait la page brute de Next.js, en anglais. Sobre, dans les
// couleurs de l'appli, avec « Réessayer » (relance le rendu de la page).
// Utilisée aussi par app/dashboard, app/patient et app/admin (leurs error.tsx
// l'affichent à l'intérieur de leur propre cadre). Textes : common.error.
// Next 16 : la fonction de relance s'appelle `retry`
// (node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/error.md).
export default function AppError({ error, retry }: { error: unknown; retry: () => void }) {
  const t = useTranslations("common.error");
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-[70dvh] items-center justify-center bg-app-bg p-4">
      <div className="w-full max-w-sm rounded-3xl border border-line bg-surface p-8 text-center shadow-sm">
        <h1 className="font-display text-xl font-semibold text-ink">{t("title")}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">{t("body")}</p>
        <button
          type="button"
          onClick={() => retry()}
          className="mt-6 w-full rounded-xl bg-brand px-4 py-3 font-medium text-white transition hover:bg-brand-dark"
        >
          {t("retry")}
        </button>
        {/* Vrai chargement de page (pas un lien « en douceur ») : repart d'un état propre. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/" className="mt-3 block text-sm font-medium text-muted underline-offset-2 hover:underline">
          {t("home")}
        </a>
      </div>
    </main>
  );
}
