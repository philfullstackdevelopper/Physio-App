"use client";

// Carte repliable SUR TÉLÉPHONE uniquement (Philippe, 2026-10-28 : « Suivi &
// facturation » doit tenir sur un écran). Sur téléphone : une ligne « titre ·
// chiffre clé » qui s'ouvre au toucher. Sur ordinateur et tablette : rien ne
// change, le titre et le contenu sont toujours affichés (classes max-sm:/sm:
// seulement, cf. règle « phone-only changes »).

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

export default function PhoneFold({
  className,
  title,
  summary,
  children,
}: {
  className: string;
  /** Titre de la carte (icône + texte), affiché tel quel sur ordinateur. */
  title: ReactNode;
  /** Chiffre ou état clé, visible sur la ligne repliée du téléphone. */
  summary?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <section className={className}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="hidden w-full items-center justify-between gap-3 text-left max-sm:flex"
      >
        <span className="min-w-0">{title}</span>
        <span className="flex shrink-0 items-center gap-1.5 text-sm text-muted">
          {summary}
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} strokeWidth={1.75} />
        </span>
      </button>
      <div className="max-sm:hidden">{title}</div>
      <div className={open ? "" : "max-sm:hidden"}>{children}</div>
    </section>
  );
}
