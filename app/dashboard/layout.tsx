import { redirect } from "next/navigation";
import Link from "next/link";
import { SignOutButton } from "@clerk/nextjs";
import { MailCheck, ShieldAlert } from "lucide-react";
import DashboardSidebar from "@/components/DashboardSidebar";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { getInstructor } from "@/lib/dashboard/instructor";
import { loadUnreadCount } from "@/lib/dashboard/unreadMessages";

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
      <main className="flex min-h-screen items-center justify-center bg-app-bg p-4">
        <div className="w-full max-w-sm rounded-3xl border border-line bg-white p-8 text-center shadow-sm">
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
          <h1 className="mt-4 text-2xl font-semibold text-ink">
            {pending ? "Compte en cours de validation" : "Compte non validé"}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {pending
              ? "Nous vérifions chaque nouveau compte praticien avant de l'activer. Revenez bientôt."
              : "Votre demande n'a pas été validée. Contactez-nous si vous pensez qu'il s'agit d'une erreur."}
          </p>
          <SignOutButton redirectUrl="/login">
            <button
              type="button"
              className="mt-6 w-full rounded-xl border border-line py-2.5 text-sm font-medium text-muted transition hover:bg-app-bg"
            >
              Se déconnecter
            </button>
          </SignOutButton>
          <Link
            href="/"
            className="mt-3 block text-center text-sm text-muted underline-offset-2 hover:text-ink hover:underline"
          >
            Retour à l&apos;accueil
          </Link>
        </div>
      </main>
    );
  }

  const unreadCount = await loadUnreadCount(supabase, user.id);

  return (
    <div className="flex min-h-screen flex-col bg-app-bg text-ink sm:flex-row">
      <DashboardSidebar instructorName={instructor.full_name ?? null} unreadCount={unreadCount} />
      <div className="relative flex-1">{children}</div>
    </div>
  );
}
