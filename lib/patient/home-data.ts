import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isProfileComplete } from "@/lib/exercise/patientProfile";
import { type InjuryStage } from "@/lib/exercise/prescription";
import { stageWithFeedback, type Rating } from "@/lib/exercise/stageProgress";
import { resolveWorkoutForWeek } from "@/lib/exercise/activeRecommendation";
import { buildWeeks, currentWeekNumber, thisWeekStartDateKey } from "@/lib/patient/weeks";
import { startOfTodayISO, startOfWeekISO, daysAgoISO } from "@/lib/week";

export type Workout = {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number | null;
  times_per_week: number | null;
  workout_exercises: { position?: number | null; exercises: { name: string } | null }[];
};

const WORKOUT_FIELDS =
  "id, name, description, duration_minutes, times_per_week, workout_exercises ( position, exercises ( name ) )";

export interface PatientHome {
  fullName: string | null;
  conditionName: string | null;
  stage: InjuryStage;
  /** « Semaine N » affichée (carte de l'Accueil, Mon programme) : la même
   *  numérotation que la frise des semaines et que le kiné, comptée depuis la
   *  création du compte (lib/patient/weeks.ts). */
  week: number;
  decision: ReturnType<typeof stageWithFeedback>;
  /** The one workout the patient should do right now — null if the kiné
   *  hasn't recommended anything, or every recommended target is already
   *  met this week. */
  activeWorkout: Workout | null;
  /** True once every recommended workout's weekly target is met — distinct
   *  from "no recommendations at all" (activeWorkout is null either way). */
  weekComplete: boolean;
  /** Times the active workout was completed this week. */
  weekCount: number;
  /** Active workout completed today. */
  doneToday: boolean;
}

/** Shared load for the patient home surfaces (Accueil + Mon programme):
 *  profile -> stage -> the kiné's ordered recommendations -> which one is
 *  active, in one place so the surfaces can never disagree. (La série de
 *  jours d'affilée calculée ici n'était lue par aucune page : retirée —
 *  Philippe, 2026-11-06 : audit, on allège.)
 *  Redirects to onboarding if the profile isn't complete yet. */
export async function loadPatientHome(supabase: SupabaseClient, userId: string): Promise<PatientHome> {
  const since = daysAgoISO(14);
  const [{ data: profile }, { data: patient }, { data: feedbackRows }, { data: logs }] = await Promise.all([
    supabase
      .from("patient_profiles")
      .select("condition_id, injury_stage, date_of_birth, height_cm, weight_kg, activity_level, updated_at, stage_declared_at")
      .eq("id", userId)
      .maybeSingle(),
    supabase.from("patients").select("full_name, condition_id, trial_ends_at, created_at").eq("id", userId).maybeSingle(),
    // Le ressenti de fin de séance (patient_feedback : douleur/difficulté)
    // alimente le frein de phase ci-dessous. La douleur notée exercice par
    // exercice (exercise_results) n'entre pas dans ce calcul.
    supabase
      .from("patient_feedback")
      .select("pain_score, difficulty, created_at")
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
  // L'éventuel suivi à accepter (tarif du kiné au-dessus de 0 €) est vérifié
  // plus haut, dans app/patient/layout.tsx.

  // What the patient SEES is driven by the condition ASSIGNED BY THE PRACTITIONER
  // (patients.condition_id). The patient's self-declaration is intake only.
  const assignedConditionId = (patient?.condition_id as string | null) ?? null;

  const declaredStage = profile!.injury_stage as InjuryStage;
  const rated = (rows: Record<string, unknown>[], field: string): Rating[] =>
    rows
      .filter((r) => r[field] != null)
      .map((r) => ({ value: r[field] as number, at: r.created_at as string }));
  // Date de référence de la semaine de soin : le moment où le patient a
  // déclaré son étape actuelle (stage_declared_at, migration 0061), pas
  // updated_at — sinon corriger son poids remettait la rééducation à la
  // semaine 1 (Philippe, 2026-10-07). updated_at reste le repli des lignes
  // antérieures à la colonne.
  const stageDeclaredAt = ((profile!.stage_declared_at as string | null) ?? profile!.updated_at) as string;
  const decision = stageWithFeedback(declaredStage, stageDeclaredAt, {
    painScores: rated(feedbackRows ?? [], "pain_score"),
    difficulties: rated(feedbackRows ?? [], "difficulty"),
  });
  const stage = decision.stage;
  // « Semaine N » affichée = numérotation de la frise (depuis la création du
  // compte), plus careWeek() : deux « Semaine » différentes sur le même écran
  // (Philippe, 2026-11-06 : audit, on corrige). La progression de phase
  // ci-dessus ne change pas.
  const week = currentWeekNumber(buildWeeks((patient?.created_at as string | undefined) ?? new Date().toISOString()));

  const [{ data: condition }, { data: recRows }] = await Promise.all([
    assignedConditionId
      ? supabase.from("conditions").select("name").eq("id", assignedConditionId).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("patient_recommended_workouts")
      .select(`week_start_date, week_count, workouts ( ${WORKOUT_FIELDS} )`)
      .eq("patient_id", userId),
  ]);

  const recommended = (recRows ?? [])
    .map((r) => ({ weekStartDate: r.week_start_date as string, weekCount: (r.week_count as number | null) ?? null, workout: r.workouts as unknown as Workout | null }))
    .filter((r): r is { weekStartDate: string; weekCount: number | null; workout: Workout } => r.workout != null);

  const weekStart = startOfWeekISO();
  const weekCounts: Record<string, number> = {};
  for (const l of logs ?? []) {
    if ((l.completed_at as string) >= weekStart) {
      const id = l.workout_id as string;
      weekCounts[id] = (weekCounts[id] ?? 0) + 1;
    }
  }

  const activeId = resolveWorkoutForWeek(
    recommended.map((r) => ({ workoutId: r.workout.id, weekStartDate: r.weekStartDate, weekCount: r.weekCount })),
    thisWeekStartDateKey(),
  );
  const activeFound = recommended.find((r) => r.workout.id === activeId)?.workout ?? null;
  // Exercices dans l'ordre de la séance (position), comme la séance guidée
  // (audit du 2026-10-08 : l'ordre affiché pouvait différer).
  const activeWorkout = activeFound
    ? { ...activeFound, workout_exercises: [...activeFound.workout_exercises].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)) }
    : null;

  const todayISO = startOfTodayISO();
  const doneToday = activeWorkout
    ? (logs ?? []).some((l) => l.workout_id === activeWorkout.id && (l.completed_at as string) >= todayISO)
    : false;
  const weekCount = activeWorkout ? (weekCounts[activeWorkout.id] ?? 0) : 0;
  // There's no more "rotate to the next recommendation once this one's quota
  // is met" (see lib/exercise/activeRecommendation.ts) — the single active
  // séance stays active either way, so "week complete" is now just "its own
  // target is met", not "nothing left to resolve to".
  const weekTarget = activeWorkout?.times_per_week ?? null;
  const weekComplete = weekTarget !== null && weekTarget > 0 && weekCount >= weekTarget;

  return {
    fullName: (patient?.full_name as string | undefined) ?? null,
    conditionName: (condition?.name as string | undefined) ?? null,
    stage,
    week,
    decision,
    activeWorkout,
    weekComplete,
    weekCount,
    doneToday,
  };
}
