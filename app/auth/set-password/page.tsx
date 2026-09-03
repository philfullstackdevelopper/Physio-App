import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { setPassword } from "./actions";

export default async function SetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  // The patient must have arrived via a valid invite link (which logged them in).
  const supabase = await createClient();
  const user = await requireUser(supabase);

  // Only patients get the CGU checkbox here — instructors accept terms at
  // /signup instead. This page is also reused for password RESETS (any
  // role, via /forgot-password), so a patient who already accepted terms
  // isn't asked again just because they forgot their password.
  const { data: patientRow } = await supabase
    .from("patients")
    .select("terms_accepted_at")
    .eq("id", user.id)
    .maybeSingle();
  const needsTerms = patientRow && !patientRow.terms_accepted_at;

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-2xl font-semibold text-gray-900">Choisir votre mot de passe</h1>
        <p className="mb-6 text-sm text-gray-500">
          Bienvenue ! Créez un mot de passe pour accéder à vos exercices.
        </p>

        {error && (
          <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>
        )}

        <form action={setPassword} className="space-y-4">
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
              Nouveau mot de passe
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-200"
            />
          </div>

          {needsTerms && (
            <label className="flex items-start gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                name="terms_accepted"
                required
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
              />
              <span>
                J&apos;accepte les{" "}
                <a href="/cgu" className="underline" target="_blank">
                  conditions générales d&apos;utilisation
                </a>{" "}
                et la{" "}
                <a href="/confidentialite" className="underline" target="_blank">
                  politique de confidentialité
                </a>
                .
              </span>
            </label>
          )}

          <button
            type="submit"
            className="w-full rounded-md bg-gray-900 py-2 font-medium text-white hover:bg-gray-800"
          >
            Enregistrer
          </button>
        </form>
      </div>
    </main>
  );
}
