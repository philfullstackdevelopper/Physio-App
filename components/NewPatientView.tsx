import Link from "next/link";
import type { ReactNode } from "react";
import { Info } from "lucide-react";
import { INVITATIONS_CLOSED_MESSAGE } from "@/lib/launch";

// « Ajouter un patient » : invitation par e-mail, ou QR code à faire scanner
// au cabinet. Partagé par la vraie page (app/dashboard/patients/new) et la
// démo (/demo/kine?ecran=nouveau).
export default function NewPatientView({
  open,
  error,
  addPatientAction,
  qr,
}: {
  open: boolean;
  error?: string;
  addPatientAction: (formData: FormData) => void | Promise<void>;
  /** La carte « QR code » (components/JoinQrCard). */
  qr: ReactNode;
}) {
  return (
    <main className="min-h-screen p-8 max-sm:min-h-0 max-sm:px-4 max-sm:pb-4 max-sm:pt-2">
      <div className="mx-auto max-w-sm">
        <Link
          href="/dashboard/patients"
          className="animate-[fadeInUp_0.6s_ease-out_both] text-sm text-muted hover:underline max-sm:hidden"
        >
          ← Mes patients
        </Link>

        <div className="animate-[fadeInUp_0.6s_ease-out_both] [animation-delay:120ms] mt-4 rounded-xl border border-line bg-surface p-8 max-sm:mt-1 max-sm:rounded-2xl max-sm:border-0 max-sm:p-5 max-sm:shadow-soft">
          <h1 className="mb-1 text-2xl font-semibold text-ink">
            Ajouter un patient
          </h1>
          <p className="mb-6 text-sm text-muted">
            Le patient recevra un e-mail pour créer son mot de passe.
          </p>

          {!open && (
            <p className="mb-4 flex items-start gap-2 rounded-lg bg-brand-soft p-3 text-sm text-ink">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand" strokeWidth={1.75} />
              <span>{INVITATIONS_CLOSED_MESSAGE}</span>
            </p>
          )}
          {open && error && (
            <p className="mb-4 rounded-lg border-line bg-danger-soft p-3 text-sm text-danger">
              {error}
            </p>
          )}

          <form action={addPatientAction} className="space-y-4">
            <fieldset disabled={!open} className="space-y-4 disabled:opacity-50">
            <div>
              <label htmlFor="full_name" className="mb-1 block text-sm font-medium text-ink">
                Nom complet
              </label>
              <input
                id="full_name"
                name="full_name"
                type="text"
                required
                className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft"
              />
            </div>
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-ink">
                Adresse e-mail
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-full bg-brand py-2.5 font-medium text-white transition-colors duration-150 hover:bg-brand-dark disabled:cursor-not-allowed"
            >
              {open ? "Envoyer l'invitation" : "Disponible au lancement"}
            </button>
            </fieldset>
          </form>
        </div>

        {/* QR code personnel (2026-11-04) : le patient rejoint ce kiné seul. */}
        {qr}
      </div>
    </main>
  );
}
