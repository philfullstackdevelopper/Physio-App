// En-tête + cadre de la page « Mes patients » (app/dashboard/patients/page.tsx
// et /prototypes/kine-telephone). Téléphone : la page tient dans l'écran —
// titre et bouton « + » fixes, seule la liste défile (PatientsTable).

import Link from "next/link";
import { Plus } from "lucide-react";

export default function PatientsPageView({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen max-sm:flex max-sm:h-[calc(100dvh-var(--phone-chrome))] max-sm:min-h-0 max-sm:flex-col">
      <div className="mx-auto max-w-7xl p-6 max-sm:flex max-sm:min-h-0 max-sm:w-full max-sm:flex-1 max-sm:flex-col max-sm:px-4 max-sm:pb-3 max-sm:pt-2 sm:p-8">
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
        <div className="animate-[fadeInUp_0.6s_ease-out_both] [animation-delay:120ms] mt-6 max-sm:mt-3 max-sm:flex max-sm:min-h-0 max-sm:flex-1 max-sm:flex-col">
          {children}
        </div>
      </div>
    </main>
  );
}
