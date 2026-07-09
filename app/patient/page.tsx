import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isProfileComplete } from "@/lib/exercise/patientProfile";
import { STAGE_LABELS, type InjuryStage } from "@/lib/exercise/prescription";
import { computeStreak } from "@/lib/exercise/streak";
import { currentStage, careWeek } from "@/lib/exercise/stageProgress";
import { signout } from "./actions";

type Workout = {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number | null;
  times_per_week: number | null;
  workout_exercises: { exercises: { name: string } | null }[];
};

export default async function PatientHome() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // First-login gate: send the patient to onboarding until their situation +
  // profile are recorded.
  const { data: profile } = await supabase
    .from("patient_profiles")
    .select("condition_id, injury_stage, date_of_birth, height_cm, weight_kg, activity_level, updated_at")
    .eq("id", user.id)
    .maybeSingle();
  if (!isProfileComplete(profile)) redirect("/patient/onboarding");

  const { data: patient } = await supabase
    .from("patients")
    .select("full_name, condition_id, recommended_workout_id")
    .eq("id", user.id)
    .maybeSingle();

  // What the patient SEES is driven by the condition ASSIGNED BY THE PRACTITIONER
  // (patients.condition_id). The patient's self-declaration is intake only.
  const assignedConditionId = (patient?.condition_id as string | null) ?? null;
  const { data: condition } = assignedConditionId
    ? await supabase.from("conditions").select("name").eq("id", assignedConditionId).maybeSingle()
    : { data: null };

  // Suggestions depend on the practitioner's condition + the patient's CURRENT
  // stage, which auto-advances with the time elapsed since they declared it.
  const declaredStage = profile!.injury_stage as InjuryStage;
  const stage = currentStage(declaredStage, profile!.updated_at as string);
  const week = careWeek(declaredStage, profile!.updated_at as string);
  let workouts: Workout[] = [];
  if (assignedConditionId) {
    const { data } = await supabase
      .from("workouts")
      .select(
        "id, name, description, duration_minutes, times_per_week, workout_exercises ( exercises ( name ) )",
      )
      .eq("condition_id", assignedConditionId)
      .eq("stage", stage)
      .order("duration_minutes");
    workouts = (data ?? []) as unknown as Workout[];
  }

  // Daily streak (consecutive days with a completed workout).
  const { data: streakLogs } = await supabase
    .from("workout_logs")
    .select("completed_at")
    .eq("patient_id", user.id)
    .order("completed_at", { ascending: false })
    .limit(400);
  const streak = computeStreak((streakLogs ?? []).map((l) => l.completed_at as string));

  // Recommended workout first, then by duration.
  const recId = patient?.recommended_workout_id;
  const ordered = [...workouts].sort((a, b) => (a.id === recId ? -1 : b.id === recId ? 1 : 0));

  return (
    <main className="min-h-screen p-6 sm:p-8">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-teal-700">Bonjour 👋</p>
            <h1 className="font-display text-4xl font-semibold leading-tight text-slate-900 sm:text-5xl">
              {patient?.full_name ? patient.full_name.split(" ")[0] : "Bienvenue"}
            </h1>
          </div>
          <form action={signout}>
            <button
              type="submit"
              className="shrink-0 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Se déconnecter
            </button>
          </form>
        </div>

        <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1 text-sm font-semibold text-orange-600">
          🔥 {streak > 0 ? `${streak} jour${streak > 1 ? "s" : ""} d'affilée` : "Commencez votre série aujourd'hui !"}
        </div>

        <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
          <span>
            {condition?.name ? (
              <>
                Votre programme :{" "}
                <span className="font-medium text-slate-700">{condition.name}</span>
                <span className="text-slate-400"> (défini par votre praticien)</span>
              </>
            ) : (
              "Programme non encore défini par votre praticien."
            )}
            <span className="text-slate-500"> · {STAGE_LABELS[stage]} (semaine {week})</span>
          </span>
          <Link href="/patient/onboarding" className="font-medium text-teal-700 hover:underline">
            Mettre à jour ma situation
          </Link>
        </div>

        {workouts.length === 0 ? (
          <div className="mt-8 rounded-xl border border-slate-100 bg-white p-6 text-center text-sm text-slate-500 shadow-sm">
            Votre praticien n&apos;a pas encore configuré votre programme. Revenez bientôt !
          </div>
        ) : (
          <>
            <h2 className="mt-8 text-lg font-medium text-slate-900">
              Routines suggérées pour aujourd&apos;hui
            </h2>
            <div className="mt-4 space-y-4">
              {ordered.map((w) => {
                const isRec = w.id === recId;
                const exNames = (w.workout_exercises ?? [])
                  .map((we) => we.exercises?.name)
                  .filter(Boolean) as string[];
                return (
                  <Link
                    key={w.id}
                    href={`/patient/${w.id}`}
                    className={`block rounded-2xl border bg-white p-5 shadow-sm transition hover:shadow-md ${
                      isRec ? "border-teal-500 ring-1 ring-teal-500" : "border-slate-100"
                    }`}
                  >
                    {isRec && (
                      <span className="inline-block rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-medium text-teal-700">
                        ★ Recommandée par votre praticien
                      </span>
                    )}
                    <div className="mt-2 flex items-baseline justify-between gap-3">
                      <h3 className="text-lg font-semibold text-slate-900">{w.name}</h3>
                      <span className="shrink-0 font-bold text-teal-700">
                        <span className="text-3xl tabular-nums">{w.duration_minutes}</span>
                        <span className="text-sm font-medium text-slate-400"> min</span>
                      </span>
                    </div>
                    {w.description && <p className="mt-1 text-sm text-slate-500">{w.description}</p>}
                    {exNames.length > 0 && (
                      <ul className="mt-3 flex flex-wrap gap-1.5">
                        {exNames.map((n, i) => (
                          <li key={i} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                            {n}
                          </li>
                        ))}
                      </ul>
                    )}
                    <span className="mt-4 inline-block text-sm font-medium text-teal-700">
                      Voir la séance →
                    </span>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
