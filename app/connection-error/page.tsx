import { getTranslations } from "next-intl/server";
import { safeInternalPath } from "@/lib/format/safePath";
import ConnectionRetry from "@/components/ConnectionRetry";
import DotCanvas from "@/components/DotCanvas";

// Landed on when we couldn't reach Supabase to verify the session (a network
// blip, not necessarily an expired login) — see lib/supabase/require-user.ts.
export default async function ConnectionErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const retryHref = safeInternalPath(next, "/dashboard");
  const t = await getTranslations("home.connectionError");

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f6f8fd] p-4">
      <DotCanvas />

      <div className="relative w-full max-w-sm rounded-3xl border border-blue-100 bg-white/90 p-8 text-center shadow-sm">
        <h1 className="font-display text-2xl font-semibold text-slate-900">
          {t("title")}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          {t("body")}
        </p>
        {/* Réessaie tout seul deux fois avant de proposer le bouton (2026-10-10). */}
        <ConnectionRetry retryHref={retryHref} />
      </div>
    </main>
  );
}
