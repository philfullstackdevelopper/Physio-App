// Onglet « Mes informations » du kiné sur téléphone (Philippe, 2026-10-08) :
// la 4e case de la barre du bas ouvre de grandes cases cliquables — Séances,
// Exercices, Revenus. Ces pages gardent l'onglet allumé (DashboardSidebar).
// La déconnexion est dans la bulle du nom, en haut à droite de chaque écran.
// Sur ordinateur, ces destinations restent dans la barre latérale ; la page
// existe aussi mais n'y est pas listée.

import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRight, Dumbbell, ListChecks, Wallet } from "lucide-react";
import { useTranslations } from "next-intl";
import { initials } from "@/lib/format/initials";
import LanguageSwitcher from "@/components/LanguageSwitcher";

// `key` = clé de dashboard.infos (titre et sous-titre de chaque case).
const TILES = [
  { href: "/dashboard/seances", key: "sessions", icon: Dumbbell, tone: "bg-brand-soft text-brand" },
  { href: "/dashboard/exercises", key: "exercises", icon: ListChecks, tone: "bg-violet-soft text-violet" },
  { href: "/dashboard/facturation", key: "billing", icon: Wallet, tone: "bg-ok-soft text-ok" },
];

export default function KineInfosView({ instructorName, footer }: { instructorName: string | null; footer?: ReactNode }) {
  const tr = useTranslations("dashboard.infos");
  return (
    <main className="min-h-screen max-sm:min-h-0">
      <div className="mx-auto max-w-xl px-4 pb-4 pt-2 sm:px-8 sm:py-6">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-soft text-base font-semibold text-brand">
            {initials(instructorName)}
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold text-ink">{tr("title")}</h1>
            <p className="truncate text-sm text-muted">{instructorName ?? tr("physio")}</p>
          </div>
        </div>

        <nav aria-label={tr("title")} className="mt-5 flex flex-col gap-3">
          {TILES.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className="flex items-center gap-4 rounded-2xl bg-surface p-5 shadow-soft transition-transform duration-150 active:scale-[0.98]"
            >
              <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${t.tone}`}>
                <t.icon className="h-6 w-6" strokeWidth={1.75} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-lg font-semibold text-ink">{tr(`${t.key}.label`)}</span>
                <span className="mt-0.5 block text-sm text-muted">{tr(`${t.key}.hint`)}</span>
              </span>
              <ChevronRight className="h-5 w-5 shrink-0 text-muted" strokeWidth={1.75} />
            </Link>
          ))}
        </nav>
        {/* Langue de l'interface (Philippe, 2026-11-06) : une ligne compacte,
            la page tient toujours sur un écran. */}
        <div className="mt-3 rounded-2xl bg-surface px-5 py-3 shadow-soft">
          <LanguageSwitcher variant="row" />
        </div>
        {footer}
      </div>
    </main>
  );
}
