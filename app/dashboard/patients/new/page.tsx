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
          className="animate-[fadeInUp_0.6s_ease-out_both] text-sm text-stone-500 hover:underline"
        >
          ← Mes patients
        </Link>

        <div className="animate-[fadeInUp_0.6s_ease-out_both] [animation-delay:120ms] mt-4 rounded-xl border border-stone-200 bg-white p-8 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-8px_rgba(120,53,15,0.16)]">
          <h1 className="font-display mb-1 text-2xl font-semibold text-stone-900">
            Ajouter un patient
          </h1>
          <p className="mb-6 text-sm text-stone-500">
            Le patient recevra un e-mail pour créer son mot de passe.
          </p>

          {error && (
            <p className="mb-4 rounded-lg border-y border-r border-stone-200 border-l-[3px] border-l-red-600 bg-white p-3 text-sm text-red-800">
              {error}
            </p>
          )}

          <form action={addPatient} className="space-y-4">
            <div>
              <label htmlFor="full_name" className="mb-1 block text-sm font-medium text-stone-700">
                Nom complet
              </label>
              <input
                id="full_name"
                name="full_name"
                type="text"
                required
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-200"
              />
            </div>
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-stone-700">
                Adresse e-mail
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-200"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-lg bg-blue-600 py-2 font-medium text-white transition-colors duration-150 hover:bg-blue-700"
            >
              Envoyer l&apos;invitation
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
