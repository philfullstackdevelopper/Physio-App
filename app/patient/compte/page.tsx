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
    <main className="min-h-screen p-6 sm:p-8">
      <div className="mx-auto max-w-md">
        <h1 className="text-2xl font-semibold text-ink">Paramètres</h1>
        <p className="mt-1 text-sm text-muted">Gérez votre compte et vos données.</p>

        {error && <p className="mt-4 rounded-xl bg-danger-soft p-3 text-sm text-danger">{error}</p>}

        <section className="mt-6 rounded-2xl border border-line bg-surface p-6 shadow-sm">
          <h2 className="font-medium text-ink">Télécharger mes données</h2>
          <p className="mt-1 text-sm text-muted">
            Récupérez un fichier avec toutes les données que EasyPhysio conserve à votre sujet
            (profil, ressenti, séances, messages).
          </p>
          <Link
            href="/patient/compte/export"
            prefetch={false}
            className="mt-4 inline-block rounded-full border border-brand px-4 py-2 text-sm font-medium text-brand hover:bg-brand-soft"
          >
            Télécharger (.json)
          </Link>
        </section>

        <section className="mt-6 rounded-2xl border border-danger/30 bg-surface p-6 shadow-sm">
          <h2 className="font-medium text-danger">Supprimer mon compte</h2>
          <p className="mt-1 text-sm text-muted">
            Cette action est définitive : votre compte, votre profil, vos séances et vos
            messages seront supprimés. Tapez « SUPPRIMER » pour confirmer.
          </p>
          <form action={deleteMyAccount} className="mt-4 flex flex-col gap-2">
            <input
              type="text"
              name="confirmation"
              placeholder="SUPPRIMER"
              required
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-ink focus:border-danger focus:outline-none focus:ring-2 focus:ring-danger-soft"
            />
            <button
              type="submit"
              className="rounded-full bg-danger px-4 py-2 text-sm font-medium text-white hover:brightness-95"
            >
              Supprimer définitivement mon compte
            </button>
          </form>
        </section>

        <SignOutButton redirectUrl="/login">
          <button
            type="button"
            className="mt-6 w-full rounded-full border border-line bg-surface py-2.5 text-sm font-medium text-muted shadow-sm hover:bg-app-bg"
          >
            Se déconnecter
          </button>
        </SignOutButton>

        <p className="mt-6 text-center text-xs text-muted">
          <Link href="/confidentialite" className="underline">
            Politique de confidentialité
          </Link>
        </p>
      </div>
    </main>
  );
}
