import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isProfileComplete } from "@/lib/exercise/patientProfile";
import { type InjuryStage } from "@/lib/exercise/prescription";
import { computeStreak } from "@/lib/exercise/streak";
import { stageWithFeedback, careWeek, type Rating } from "@/lib/exercise/stageProgress";
import { startOfTodayISO, daysAgoISO } from "@/lib/week";

export type Workout = {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number | null;
  times_per_week: number | null;
  workout_exercises: { exercises: { name: string } | null }[];
};

const WORKOUT_FIELDS =
  "id, name, description, duration_minutes, times_per_week, workout_exercises ( exercises ( name ) )";

export interface PatientHome {
  fullName: string | null;
  conditionName: string | null;
  stage: InjuryStage;
  week: number;
  decision: ReturnType<typeof stageWithFeedback>;
  ordered: Workout[];
  doneWorkouts: Workout[];
  remainingWorkouts: Workout[];
  streak: number;
  doneToday: boolean;
  recId: string | null | undefined;
}

/** Shared load for the patient home surfaces (dashboard + séance du jour):
 *  profile -> stage -> today's workouts -> streak, in one place so the two
 *  pages can never disagree about which stage/workouts a patient is in.
 *  Redirects to onboarding if the profile isn't complete yet. */
export async function loadPatientHome(supabase: SupabaseClient, userId: string): Promise<PatientHome> {
  // profile, patient, the two feedback windows, and the streak log all depend
  // only on userId (or a static date), never on each other's results — so
  // they can all go out together instead of one-at-a-time. condition and
  // workouts (below) genuinely do depend on this batch's results and stay
  // sequential after it.
  const since = daysAgoISO(14);
  const [
    { data: profile },
    { data: patient },
    { data: painRows },
    { data: diffRows },
    { data: streakLogs },
  ] = await Promise.all([
    supabase
      .from("patient_profiles")
      .select("condition_id, injury_stage, date_of_birth, height_cm, weight_kg, activity_level, updated_at")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("patients")
      .select("full_name, condition_id, recommended_workout_id")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("patient_feedback")
      .select("pain_score, difficulty, created_at")
      .eq("patient_id", userId)
      .gte("created_at", since),
    supabase
      .from("exercise_feedback")
      .select("difficulty, created_at")
      .eq("patient_id", userId)
      .gte("created_at", since),
    supabase
      .from("workout_logs")
      .select("completed_at, workout_id")
      .eq("patient_id", userId)
      .order("completed_at", { ascending: false })
      .limit(400),
  ]);
  if (!isProfileComplete(profile)) redirect("/patient/onboarding");

  // What the patient SEES is driven by the condition ASSIGNED BY THE PRACTITIONER
  // (patients.condition_id). The patient's self-declaration is intake only.
  const assignedConditionId = (patient?.condition_id as string | null) ?? null;

  // Suggestions depend on the practitioner's condition + the patient's CURRENT
  // stage. The calendar advances that stage on its own, but recent pain and
  // difficulty can hold it back — see stageWithFeedback(). Only the last two
  // weeks count, so an old rough patch doesn't freeze someone indefinitely.
  const declaredStage = profile!.injury_stage as InjuryStage;
  // Each rating keeps its date so a bad episode can age out one stage per week.
  const rated = (rows: Record<string, unknown>[], field: string): Rating[] =>
    rows
      .filter((r) => r[field] != null)
      .map((r) => ({ value: r[field] as number, at: r.created_at as string }));
  const decision = stageWithFeedback(declaredStage, profile!.updated_at as string, {
    painScores: rated(painRows ?? [], "pain_score"),
    difficulties: [...rated(painRows ?? [], "difficulty"), ...rated(diffRows ?? [], "difficulty")],
  });
  const stage = decision.stage;
  const week = careWeek(declaredStage, profile!.updated_at as string);

  // condition (display name only) and workouts (this stage's sessions) are
  // independent of each other — both only need assignedConditionId — so they
  // go out together rather than one after the other.
  const [{ data: condition }, workoutsResult] = await Promise.all([
    assignedConditionId
      ? supabase.from("conditions").select("name").eq("id", assignedConditionId).maybeSingle()
      : Promise.resolve({ data: null }),
    assignedConditionId
      ? supabase
          .from("workouts")
          .select(WORKOUT_FIELDS)
          .eq("condition_id", assignedConditionId)
          .eq("stage", stage)
          .order("duration_minutes")
      : Promise.resolve({ data: null }),
  ]);
  let workouts: Workout[] = (workoutsResult.data ?? []) as unknown as Workout[];

  // Daily streak (consecutive days with a completed workout).
  const streak = computeStreak((streakLogs ?? []).map((l) => l.completed_at as string));

  // Which workouts were completed TODAY? (reuses the logs already fetched)
  const todayISO = startOfTodayISO();
  const doneTodayIds = new Set(
    (streakLogs ?? [])
      .filter((l) => (l.completed_at as string) >= todayISO)
      .map((l) => l.workout_id as string),
  );
  const doneToday = doneTodayIds.size > 0;

  // A session done today, or the one the practitioner recommends, may belong to
  // another stage than the one we just loaded — the patient's stage can move
  // between two sessions, and the feedback brake moves it more often. The
  // practitioner's recommendation must also never silently vanish just because
  // its stage doesn't match right now — the kiné stays the guide. Fetch those
  // by id so neither case disappears from the page.
  const recId = patient?.recommended_workout_id as string | null | undefined;
  const missingIds = [...doneTodayIds, ...(recId ? [recId] : [])].filter(
    (id) => !workouts.some((w) => w.id === id),
  );
  if (missingIds.length > 0) {
    const { data } = await supabase.from("workouts").select(WORKOUT_FIELDS).in("id", missingIds);
    workouts = [...workouts, ...((data ?? []) as unknown as Workout[])];
  }

  // Recommended workout first, then by duration.
  const ordered = [...workouts].sort((a, b) => (a.id === recId ? -1 : b.id === recId ? 1 : 0));
  // Split the program: what's already been done today vs. what's left to continue.
  const doneWorkouts = ordered.filter((w) => doneTodayIds.has(w.id));
  const remainingWorkouts = ordered.filter((w) => !doneTodayIds.has(w.id));

  return {
    fullName: (patient?.full_name as string | undefined) ?? null,
    conditionName: (condition?.name as string | undefined) ?? null,
    stage,
    week,
    decision,
    ordered,
    doneWorkouts,
    remainingWorkouts,
    streak,
    doneToday,
    recId,
  };
}
