import { redirect } from "next/navigation";
import Link from "next/link";
import { SignOutButton } from "@clerk/nextjs";
import { MailCheck, ShieldAlert } from "lucide-react";
import DashboardSidebar from "@/components/DashboardSidebar";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { getInstructor } from "@/lib/dashboard/instructor";

// The one shared gate for every /dashboard/* route: not an instructor at all
// -> back to the patient side; instructor but not yet approved by Philippe
// (see app/signup/actions.ts / app/admin) -> a waiting/rejected message
// instead of the real dashboard. Centralised here rather than repeated
// per-page, since every /dashboard/* route already renders inside this layout.
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const instructor = await getInstructor(supabase, user.id);

  if (!instructor) redirect("/patient");

  const status = (instructor.status as string | null) ?? "approved";

  if (status !== "approved") {
    const pending = status === "pending";
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#faf7f2] p-4">
        <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <span
            className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${
              pending ? "bg-blue-50 text-blue-700" : "bg-red-50 text-red-600"
            }`}
          >
            {pending ? (
              <MailCheck className="h-7 w-7" strokeWidth={1.75} />
            ) : (
              <ShieldAlert className="h-7 w-7" strokeWidth={1.75} />
            )}
          </span>
          <h1 className="font-display mt-4 text-2xl font-semibold text-slate-900">
            {pending ? "Compte en cours de validation" : "Compte non validé"}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            {pending
              ? "Nous vérifions chaque nouveau compte praticien avant de l'activer. Revenez bientôt."
              : "Votre demande n'a pas été validée. Contactez-nous si vous pensez qu'il s'agit d'une erreur."}
          </p>
          <SignOutButton redirectUrl="/login">
            <button
              type="button"
              className="mt-6 w-full rounded-xl border border-slate-300 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              Se déconnecter
            </button>
          </SignOutButton>
          <Link
            href="/"
            className="mt-3 block text-center text-sm text-slate-500 underline-offset-2 hover:text-slate-700 hover:underline"
          >
            Retour à l&apos;accueil
          </Link>
        </div>
      </main>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#faf7f2] sm:flex-row">
      <DashboardSidebar />
      <div className="relative flex-1 overflow-hidden">
        {/* Shared ambient background for every /dashboard/* page: one soft warm
            corner glow plus a faint paper grain, defined once here instead of
            duplicated per page. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-20"
          style={{
            background:
              "radial-gradient(1100px 700px at 88% -12%, rgba(251, 191, 128, 0.20) 0%, transparent 60%)",
          }}
        />
        <div aria-hidden className="grain pointer-events-none absolute inset-0 -z-10" />
        {children}
      </div>
    </div>
  );
}
