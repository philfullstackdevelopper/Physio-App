import Link from "next/link";
import { addPatient } from "../actions";

export default async function NewPatientPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-sm">
        <Link href="/dashboard/patients" className="text-sm text-gray-500 hover:underline">
          ← Mes patients
        </Link>

        <div className="mt-4 rounded-xl bg-white p-8 shadow-sm">
          <h1 className="mb-1 text-2xl font-semibold text-gray-900">Ajouter un patient</h1>
          <p className="mb-6 text-sm text-gray-500">
            Le patient recevra un e-mail pour créer son mot de passe.
          </p>

          {error && (
            <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>
          )}

          <form action={addPatient} className="space-y-4">
            <div>
              <label htmlFor="full_name" className="mb-1 block text-sm font-medium text-gray-700">
                Nom complet
              </label>
              <input
                id="full_name"
                name="full_name"
                type="text"
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-gray-900 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
                Adresse e-mail
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-gray-900 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-md bg-gray-900 py-2 font-medium text-white hover:bg-gray-800"
            >
              Envoyer l&apos;invitation
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
