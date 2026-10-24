"use client";

import { Printer } from "lucide-react";

/** Bouton « Imprimer / enregistrer en PDF » (la boîte d'impression du navigateur propose « Enregistrer au format PDF »). */
export default function PrintButton({ label = "Imprimer ou enregistrer en PDF" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-dark print:hidden"
    >
      <Printer className="h-4 w-4" strokeWidth={1.75} />
      {label}
    </button>
  );
}
