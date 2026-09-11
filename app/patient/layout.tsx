import { redirect } from "next/navigation";
import { headers } from "next/headers";
import PatientNav from "@/components/PatientNav";
import PatientWelcomeGate from "@/components/PatientWelcomeGate";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { getTierBilling } from "@/lib/billing/context";
import { hasActiveTier } from "@/lib/billing/access";

const ONBOARDING_PATH = "/patient/onboarding";
// Same treatment as onboarding: the offer choice comes right after it
// (Philippe, 2026-09-10) and there is no app to navigate until it's done.
const ABONNEMENT_PATH = "/patient/abonnement";

// The one shared gate for every /patient/* route, mirroring how
// app/dashboard/layout.tsx gates instructors on approval status: a freshly
// invited patient (see app/dashboard/patients/actions.ts's addPatient) has a
// Clerk account and a `patients` row, but nothing beyond that. Two things
// must happen, in order, before the real app shows:
//  1. Accept the CGU (patients.terms_accepted_at) — asked once, standalone,
//     per RGPD (see supabase/migrations/0019's own comment on why this is
//     separate from health-data consent).
//  2. Complete /patient/onboarding (condition, profile, health-data consent)
//     — that page already existed but had no enforcement, so patients could
//     reach the rest of the app with an empty profile.
export default async function PatientLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  // requireUser() is cache()-deduped, so calling it again here doesn't cost an
  // extra Clerk round-trip even though every page under app/patient also
  // calls it — same pattern as the dashboard layout.
  const { data: patient } = await supabase
    .from("patients")
    .select("full_name, terms_accepted_at, instructors ( full_name )")
    .eq("id", user.id)
    .maybeSingle();

  if (patient && !patient.terms_accepted_at) {
    const instructor = patient.instructors as unknown as { full_name: string | null } | null;
    return <PatientWelcomeGate instructorName={instructor?.full_name ?? null} />;
  }

  const pathname = (await headers()).get("x-pathname") ?? "";
  const onOnboardingPath = pathname.startsWith(ONBOARDING_PATH);
  if (patient && !onOnboardingPath) {
    const { data: profile } = await supabase
      .from("patient_profiles")
      .select("health_data_consent_at")
      .eq("id", user.id)
      .maybeSingle();
    if (!profile?.health_data_consent_at) {
      redirect(ONBOARDING_PATH);
    }
  }

  // Same "offre active ?" gate as lib/patient/home-data.ts, but done HERE,
  // before any nav markup is built, not from inside a nested page. A
  // redirect() thrown deep inside {children} arrives too late: this layout's
  // shell (sidebar included) may already have started streaming to the
  // browser, so the sidebar flashes/sticks around the abonnement page even
  // though that page is meant to render full-bleed (Philippe, 2026-09-11 —
  // reported as "la barre latérale ne devrait pas être là").
  if (patient && !onOnboardingPath && !pathname.startsWith(ABONNEMENT_PATH)) {
    if (!hasActiveTier(await getTierBilling(supabase, user.id))) {
      redirect(ABONNEMENT_PATH);
    }
  }

  // Onboarding and the offer choice both render full-bleed, their own layout
  // (step wizard / pricing cards, no dashboard chrome) — the real nav only
  // makes sense once there's a real profile AND an active offer to navigate
  // around (Philippe, 2026-09-09: "sans les trucs sur la barre latérale pour
  // le début").
  if (onOnboardingPath || pathname.startsWith(ABONNEMENT_PATH)) return <>{children}</>;

  // Messages FROM the instructor this patient hasn't opened yet — mirrors
  // lib/dashboard/unreadMessages.ts's loadUnreadCount, sender flipped.
  const { count: unreadCount } = await supabase
    .from("patient_messages")
    .select("id", { count: "exact", head: true })
    .eq("patient_id", user.id)
    .eq("sender", "instructor")
    .is("read_at", null);

  return (
    <div className="flex min-h-screen flex-col bg-app-bg text-ink sm:flex-row">
      <PatientNav patientName={(patient?.full_name as string | undefined) ?? null} unreadCount={unreadCount ?? 0} />
      <div className="relative min-w-0 flex-1 pb-20 sm:pb-0">{children}</div>
    </div>
  );
}
