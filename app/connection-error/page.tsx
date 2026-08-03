import Link from "next/link";

// Landed on when we couldn't reach Supabase to verify the session (a network
// blip, not necessarily an expired login) — see lib/supabase/require-user.ts.
export default async function ConnectionErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const retryHref = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#faf7f2] p-4">
      <div className="w-full max-w-sm rounded-3xl border border-teal-100 bg-white/90 p-8 text-center shadow-sm">
        <h1 className="font-display text-2xl font-semibold text-slate-900">
          Problème de connexion
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          Impossible de vérifier votre session pour le moment — probablement un problème réseau
          passager. Vous êtes sans doute toujours connecté.
        </p>
        <Link
          href={retryHref}
          className="mt-6 block w-full rounded-xl bg-teal-600 py-2.5 font-medium text-white shadow-sm transition hover:bg-teal-700"
        >
          Réessayer
        </Link>
        <Link href="/login" className="mt-3 block text-sm text-slate-500 hover:underline">
          Ou se reconnecter
        </Link>
      </div>
    </main>
  );
}
