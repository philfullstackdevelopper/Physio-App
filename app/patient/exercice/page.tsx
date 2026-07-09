import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { recommendPrescription } from "@/lib/exercise/prescription";
import { isProfileComplete, profileToContext } from "@/lib/exercise/patientProfile";
import GuidedExercise from "@/components/GuidedExercise";

// Live guided exercise for the logged-in patient. Targets are derived from the
// profile captured at onboarding — no information is re-asked here.
export default async function PatientExercisePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("patient_profiles")
    .select("condition_id, injury_stage, date_of_birth, height_cm, weight_kg, activity_level")
    .eq("id", user.id)
    .maybeSingle();

  // If they haven't completed onboarding, send them there first.
  if (!isProfileComplete(profile)) redirect("/patient/onboarding");

  const prescription = recommendPrescription(profileToContext(profile!));

  return (
    <main className="min-h-screen p-6 sm:p-8">
      <div className="mx-auto max-w-xl">
        <Link href="/patient" className="text-sm text-slate-500 hover:underline">
          ← Mes séances
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">Séance guidée</h1>
        <p className="mt-1 text-sm text-slate-500">
          Placez-vous face à la caméra, tout le corps visible, puis démarrez.
        </p>
        <div className="mt-6">
          <GuidedExercise initial={prescription} />
        </div>
      </div>
    </main>
  );
}
