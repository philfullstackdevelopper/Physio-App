// En-tête + cadre de la page « Mes patients » (app/dashboard/patients/page.tsx
// et /prototypes/kine-telephone). La page tient dans l'écran à TOUTES les
// tailles — titre et bouton fixes, seule la liste défile (PatientsTable).
// Avant le 2026-10-10 ce n'était vrai que sur téléphone : sur PC la page
// entière défilait dès 6-7 patients (audit des formats d'écran).

import Link from "next/link";
import { Plus } from "lucide-react";

export default function PatientsPageView({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex h-dvh min-h-0 flex-col max-sm:h-[calc(100dvh-var(--phone-chrome))]">
      <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col p-6 max-sm:px-4 max-sm:pb-3 max-sm:pt-2 sm:p-8 short:sm:py-5">
        <div className="animate-[fadeInUp_0.6s_ease-out_both] flex flex-wrap items-start justify-between gap-4 max-sm:flex-nowrap max-sm:items-center">
          <div>
            <h1 className="text-2xl font-semibold text-ink">Mes patients</h1>
            <p className="mt-1 text-sm text-muted max-sm:hidden">Suivez tous vos patients et intervenez en quelques clics.</p>
          </div>
          <Link
            href="/dashboard/patients/new"
            aria-label="Ajouter un patient"
            className="inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-dark max-sm:h-10 max-sm:w-10 max-sm:justify-center max-sm:p-0 max-sm:shadow-soft"
          >
            <Plus className="h-4 w-4 max-sm:h-5 max-sm:w-5" strokeWidth={2} />
            <span className="max-sm:hidden">Ajouter un patient</span>
          </Link>
        </div>
        <div className="animate-[fadeInUp_0.6s_ease-out_both] [animation-delay:120ms] mt-6 flex min-h-0 flex-1 flex-col max-sm:mt-3 short:sm:mt-4">
          {children}
        </div>
      </div>
    </main>
  );
}
