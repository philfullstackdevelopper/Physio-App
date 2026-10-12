// Prototype surface — la section « Comptes de test » de /admin avec des
// données FICTIVES, pour juger l'affichage sans se connecter (Philippe,
// 2026-10-10). Rend le vrai composant TestAccounts dans la même coquille que
// app/admin/layout.tsx. Les boutons renvoient vers la page d'accueil ici (ils
// exigent le compte administrateur). Pas lié depuis l'appli.

import { ShieldCheck } from "lucide-react";
import TestAccounts from "@/app/admin/TestAccounts";
import type { TestAccountRow } from "@/lib/db/admin";

export const metadata = { title: "Aperçu comptes de test", robots: { index: false } };

const KINE = "00000000-0000-4000-8000-000000000001";
const ACCOUNTS: TestAccountRow[] = [
  { app_id: KINE, kind: "kine", email: "test-kine-marie-test-4f2a+clerk_test@example.com", full_name: "Marie Test", instructor_id: null, instructor_name: null, created_at: "2026-10-10T09:00:00Z" },
  { app_id: "00000000-0000-4000-8000-000000000002", kind: "patient", email: "test-patient-paul-test-9c1e+clerk_test@example.com", full_name: "Paul Test", instructor_id: KINE, instructor_name: "Marie Test", created_at: "2026-10-10T09:05:00Z" },
  { app_id: "00000000-0000-4000-8000-000000000003", kind: "patient", email: "test-patient-lea-test-07bd+clerk_test@example.com", full_name: "Léa Test", instructor_id: KINE, instructor_name: "Marie Test", created_at: "2026-10-10T09:06:00Z" },
];

export default function AdminTestAccountsPrototype() {
  return (
    // Même coquille que app/admin/layout.tsx : en-tête fixe, liste qui défile.
    <div className="flex h-dvh flex-col bg-slate-50">
      <header className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6 py-4 max-sm:px-4 max-sm:py-3 short:py-2.5">
        <span className="flex items-center gap-2 font-display text-lg font-semibold text-slate-900">
          <ShieldCheck className="h-5 w-5 text-blue-600" strokeWidth={1.75} />
          EasyPhysio — Admin
        </span>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto max-w-3xl p-6 max-sm:p-4 sm:p-8 short:sm:py-5">
          <TestAccounts accounts={ACCOUNTS} />
        </div>
      </div>
    </div>
  );
}
