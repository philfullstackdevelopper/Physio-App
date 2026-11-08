import { redirect } from "next/navigation";
import Link from "next/link";
import { SignOutButton } from "@clerk/nextjs";
import { MailCheck, ShieldAlert } from "lucide-react";
import { getTranslations } from "next-intl/server";
import DashboardSidebar from "@/components/DashboardSidebar";
import { contributorTitle } from "@/lib/exercise/kineExercises";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { getInstructor } from "@/lib/dashboard/instructor";
import { loadUnreadCount } from "@/lib/dashboard/unreadMessages";
import { setInstructorStatus } from "@/lib/db/admin";

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

  let status = (instructor.status as string | null) ?? "approved";

  // Inscription libre (Philippe, 2026-11-02) : un compte resté « en attente »
  // d’avant ce changement, cabinet renseigné, est validé à sa prochaine visite.
  if (status === "pending" && instructor.cabinet_name) {
    await setInstructorStatus(user.id, "approved");
    status = "approved";
  }

  // En attente SANS coordonnées de cabinet (inscription Clerk directe, cookie
  // perdu) : renvoyer vers le formulaire, sinon l'écran d'attente n'offre
  // aucun moyen de les compléter (audit du 2026-10-07).
  if (status === "pending" && !instructor.cabinet_name) redirect("/signup/onboarding");

  if (status !== "approved") {
    const pending = status === "pending";
    const t = await getTranslations("dashboard.layout");
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
            {pending ? t("pendingTitle") : status === "suspended" ? t("suspendedTitle") : t("rejectedTitle")}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {pending
              ? t("pendingBody")
              : status === "suspended"
                ? t("suspendedBody")
                : t("rejectedBody")}
          </p>
          <SignOutButton redirectUrl="/login">
            <button
              type="button"
              className="mt-6 w-full rounded-xl border border-line py-2.5 text-sm font-medium text-muted transition hover:bg-app-bg"
            >
              {t("signOut")}
            </button>
          </SignOutButton>
          <Link
            href="/"
            className="mt-3 block text-center text-sm text-muted underline-offset-2 hover:text-ink hover:underline"
          >
            {t("backHome")}
          </Link>
        </div>
      </main>
    );
  }

  const [unreadCount, { count: publishedCount }, tContributor, { count: cabinetRequests }] = await Promise.all([
    loadUnreadCount(supabase, user.id),
    // Titre « Contributeur EasyPhysio » sous le nom (migration 0081).
    supabase
      .from("exercises")
      .select("id", { count: "exact", head: true })
      .eq("created_by", user.id)
      .eq("publication_status", "published"),
    getTranslations("exercise.contributor"),
    // Demandes pour rejoindre son cabinet (migration 0085 ; table absente → 0).
    supabase
      .from("cabinet_members")
      .select("instructor_id", { count: "exact", head: true })
      .eq("status", "pending")
      .neq("instructor_id", user.id),
  ]);

  return (
    <div className="flex min-h-screen flex-col bg-app-bg text-ink max-sm:bg-phone-bg sm:flex-row">
      <DashboardSidebar
        instructorName={instructor.full_name ?? null}
        unreadCount={unreadCount}
        cabinetRequests={cabinetRequests ?? 0}
        contributorTitle={contributorTitle(publishedCount ?? 0, tContributor)}
      />
      {/* min-w-0 : sans ça, un contenu large (tableau, etc.) forcerait tout le
          flex row à s'élargir et entraînerait la sidebar dans le défilement
          horizontal de la page. Chaque page gère son propre overflow-x-auto
          localement si besoin ; la sidebar, elle, ne doit jamais bouger.
          Téléphone : marge du bas = barre d'onglets fixe (comme app/patient/layout.tsx). */}
      <div data-phone-pad="" className="relative min-w-0 flex-1 max-sm:pb-[calc(5rem+env(safe-area-inset-bottom))]">{children}</div>
    </div>
  );
}
