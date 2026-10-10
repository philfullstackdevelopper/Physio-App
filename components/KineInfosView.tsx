// Onglet « Mes informations » du kiné sur téléphone (Philippe, 2026-10-08) :
// la 4e case de la barre du bas ouvre de grandes cases cliquables — Séances,
// Exercices, Revenus. Ces pages gardent l'onglet allumé (DashboardSidebar).
// La déconnexion est dans la bulle du nom, en haut à droite de chaque écran.
// Sur ordinateur, ces destinations restent dans la barre latérale ; la page
// existe aussi mais n'y est pas listée.

import Link from "next/link";
import { ChevronRight, Dumbbell, ListChecks, Wallet } from "lucide-react";
import { initials } from "@/lib/format/initials";

const TILES = [
  { href: "/dashboard/seances", label: "Séances", hint: "Vos séances et les modèles prévus", icon: Dumbbell, tone: "bg-brand-soft text-brand" },
  { href: "/dashboard/exercises", label: "Exercices", hint: "La bibliothèque d'exercices", icon: ListChecks, tone: "bg-violet-soft text-violet" },
  { href: "/dashboard/facturation", label: "Revenus", hint: "Tarifs, abonnés et paiements", icon: Wallet, tone: "bg-ok-soft text-ok" },
];

export default function KineInfosView({ instructorName }: { instructorName: string | null }) {
  return (
    <main className="min-h-screen max-sm:min-h-0">
      <div className="mx-auto max-w-xl px-4 pb-4 pt-2 sm:px-8 sm:py-6">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-soft text-base font-semibold text-brand">
            {initials(instructorName)}
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold text-ink">Mes informations</h1>
            <p className="truncate text-sm text-muted">{instructorName ?? "Kinésithérapeute"}</p>
          </div>
        </div>

        <nav aria-label="Mes informations" className="mt-5 flex flex-col gap-3">
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
                <span className="block text-lg font-semibold text-ink">{t.label}</span>
                <span className="mt-0.5 block text-sm text-muted">{t.hint}</span>
              </span>
              <ChevronRight className="h-5 w-5 shrink-0 text-muted" strokeWidth={1.75} />
            </Link>
          ))}
        </nav>
      </div>
    </main>
  );
}
