"use client";

import { Printer } from "lucide-react";
import { useTranslations } from "next-intl";

/** Bouton « Imprimer / enregistrer en PDF » (la boîte d'impression du navigateur propose « Enregistrer au format PDF »). */
export default function PrintButton({ label }: { label?: string }) {
  const t = useTranslations("billing");
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-dark print:hidden"
    >
      <Printer className="h-4 w-4" strokeWidth={1.75} />
      {label ?? t("print")}
    </button>
  );
}
