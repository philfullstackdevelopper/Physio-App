import Link from "next/link";
import { addPatient } from "../actions";

export default async function NewPatientPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-sm">
        <Link
          href="/dashboard/patients"
          className="animate-[fadeInUp_0.6s_ease-out_both] text-sm text-muted hover:underline"
        >
          ← Mes patients
        </Link>

        <div className="animate-[fadeInUp_0.6s_ease-out_both] [animation-delay:120ms] mt-4 rounded-xl border border-line bg-surface p-8">
          <h1 className="mb-1 text-2xl font-semibold text-ink">
            Ajouter un patient
          </h1>
          <p className="mb-6 text-sm text-muted">
            Le patient recevra un e-mail pour créer son mot de passe.
          </p>

          {error && (
            <p className="mb-4 rounded-lg border-line bg-danger-soft p-3 text-sm text-danger">
              {error}
            </p>
          )}

          <form action={addPatient} className="space-y-4">
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
              className="w-full rounded-full bg-brand py-2.5 font-medium text-white transition-colors duration-150 hover:bg-brand-dark"
            >
              Envoyer l&apos;invitation
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
