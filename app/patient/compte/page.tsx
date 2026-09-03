import Link from "next/link";
import { SignOutButton } from "@clerk/nextjs";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { deleteMyAccount } from "./actions";

export default async function CompteePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  await requireUser(supabase);

  return (
    <main className="min-h-screen bg-slate-50 p-6 sm:p-8">
      <div className="mx-auto max-w-md">
        <h1 className="text-2xl font-semibold text-slate-900">Mon compte et mes données</h1>

        {error && (
          <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>
        )}

        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-medium text-slate-900">Télécharger mes données</h2>
          <p className="mt-1 text-sm text-slate-500">
            Récupérez un fichier avec toutes les données que EasyPhysio conserve à votre sujet
            (profil, ressenti, séances, messages).
          </p>
          <Link
            href="/patient/compte/export"
            prefetch={false}
            className="mt-4 inline-block rounded-md border border-blue-600 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
          >
            Télécharger (.json)
          </Link>
        </section>

        <section className="mt-6 rounded-xl border border-red-200 bg-white p-6 shadow-sm">
          <h2 className="font-medium text-red-700">Supprimer mon compte</h2>
          <p className="mt-1 text-sm text-slate-500">
            Cette action est définitive : votre compte, votre profil, vos séances et vos
            messages seront supprimés. Tapez « SUPPRIMER » pour confirmer.
          </p>
          <form action={deleteMyAccount} className="mt-4 flex flex-col gap-2">
            <input
              type="text"
              name="confirmation"
              placeholder="SUPPRIMER"
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-red-600 focus:outline-none focus:ring-2 focus:ring-red-100"
            />
            <button
              type="submit"
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Supprimer définitivement mon compte
            </button>
          </form>
        </section>

        <SignOutButton redirectUrl="/login">
          <button
            type="button"
            className="mt-6 w-full rounded-xl border border-slate-300 bg-white py-2.5 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50"
          >
            Se déconnecter
          </button>
        </SignOutButton>

        <p className="mt-6 text-center text-xs text-slate-400">
          <Link href="/confidentialite" className="underline">
            Politique de confidentialité
          </Link>
        </p>
      </div>
    </main>
  );
}
