import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/require-user";
import { createClient } from "@/lib/supabase/server";
import SignupOnboardingView from "./SignupOnboardingView";
import { saveInstructorOnboarding } from "./actions";

// Cabinet/practice details, asked once right after Clerk signup (see
// app/signup/finalize/page.tsx) and before the "en attente" screen — gives
// the admin approval screen (app/admin/page.tsx) enough to manually verify a
// new kiné, and puts the RPPS number on file for the automatic Annuaire
// Santé check once ESANTE_API_KEY exists (lib/instructor/rppsVerification.ts).
//
// A plain self-read (instructors_select_own already covers it) — by the time
// this page renders, app/signup/finalize/page.tsx has already created the
// row this reads.
export default async function SignupOnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const user = await requireUser();
  const supabase = await createClient();

  const { data: instructor } = await supabase
    .from("instructors")
    .select("status, cabinet_name, cabinet_address, phone, rpps_number, siret")
    .eq("id", user.id)
    .maybeSingle();

  if (!instructor) redirect("/signup/kine");
  // Already completed — don't let a bookmarked/back-navigated link re-open
  // this step (also whichever screen is next: approved goes straight in).
  if (instructor.cabinet_name) {
    redirect(instructor.status === "approved" ? "/dashboard" : "/signup/pending");
  }

  return (
    <SignupOnboardingView
      error={error}
      defaults={{
        cabinet_name: (instructor.cabinet_name as string | null) ?? null,
        cabinet_address: (instructor.cabinet_address as string | null) ?? null,
        phone: (instructor.phone as string | null) ?? null,
        rpps_number: (instructor.rpps_number as string | null) ?? null,
        siret: (instructor.siret as string | null) ?? null,
      }}
      action={saveInstructorOnboarding}
    />
  );
}
