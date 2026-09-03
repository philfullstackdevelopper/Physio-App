import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { STAGE_LABELS, type InjuryStage } from "@/lib/exercise/prescription";
import SeancesTabs from "@/components/SeancesTabs";
import { createSeance, duplicateSeance, deleteSeance } from "./actions";

const STAGES = Object.entries(STAGE_LABELS) as [InjuryStage, string][];

type WorkoutExerciseRow = {
  position: number;
  exercise: { name: string } | null;
};

type OwnSeance = {
  id: string;
  name: string;
  stage: string | null;
  condition_id: string | null;
  workout_exercises: WorkoutExerciseRow[];
};

// The instructor's own exercise ordering (position) is the best available
// signal for "the movement that represents this séance" — no separate
// cover-image field needed, this just reuses the illustration already
// resolved for that exercise (see ExerciseIllustration).
function leadExerciseName(rows: WorkoutExerciseRow[] | null | undefined): string | undefined {
  if (!rows || rows.length === 0) return undefined;
  return [...rows].sort((a, b) => a.position - b.position)[0]?.exercise?.name ?? undefined;
}

function exerciseNames(rows: WorkoutExerciseRow[] | null | undefined): string[] {
  if (!rows) return [];
  return [...rows]
    .sort((a, b) => a.position - b.position)
    .map((r) => r.exercise?.name)
    .filter((n): n is string => !!n);
}

export default async function SeancesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  const supabase = await createClient();
  const user = await requireUser(supabase);

  const { data: conditions } = await supabase.from("conditions").select("id, name").order("name");
  const conditionName = (cid: string | null) => conditions?.find((c) => c.id === cid)?.name;

  // Séances created by this instructor.
  const { data: mine } = await supabase
    .from("workouts")
    .select("id, name, stage, condition_id, workout_exercises(position, exercise:exercises(name))")
    .eq("created_by", user.id)
    .order("created_at", { ascending: false });
  const seances = (mine ?? []) as unknown as OwnSeance[];
  const seanceIds = seances.map((s) => s.id);

  // Whether each of the instructor's own séances is currently in use, so the
  // delete control can explain up front why it's disabled instead of the
  // kiné only finding out after clicking (deleteSeance blocks the same
  // cases server-side — this just previews the reason).
  const usageByWorkout = new Map<string, { recommended: number; logged: number }>();
  if (seanceIds.length > 0) {
    const [{ data: recRows }, { data: logRows }] = await Promise.all([
      supabase.from("patient_recommended_workouts").select("workout_id").in("workout_id", seanceIds),
      supabase.from("workout_logs").select("workout_id").in("workout_id", seanceIds),
    ]);
    for (const id of seanceIds) usageByWorkout.set(id, { recommended: 0, logged: 0 });
    for (const r of recRows ?? []) {
      const u = usageByWorkout.get(r.workout_id as string);
      if (u) u.recommended += 1;
    }
    for (const l of logRows ?? []) {
      const u = usageByWorkout.get(l.workout_id as string);
      if (u) u.logged += 1;
    }
  }
  function inUseReason(id: string): string | undefined {
    const u = usageByWorkout.get(id);
    if (!u) return undefined;
    const parts: string[] = [];
    if (u.recommended > 0) parts.push(`recommandée à ${u.recommended} patient${u.recommended > 1 ? "s" : ""}`);
    if (u.logged > 0) parts.push(`${u.logged} séance${u.logged > 1 ? "s" : ""} enregistrée${u.logged > 1 ? "s" : ""}`);
    return parts.length ? parts.join(", ") : undefined;
  }

  // Platform séances the instructor can duplicate as a starting point.
  const { data: templatesData } = await supabase
    .from("workouts")
    .select("id, name, stage, condition_id, workout_exercises(position, exercise:exercises(name))")
    .is("created_by", null)
    .order("name");
  const rawTemplates = (templatesData ?? []) as unknown as OwnSeance[];

  // Group by condition (what a kiné actually scans for), then by phase order
  // within each condition — not insertion/seed order, which scattered the
  // same condition's phases across the list.
  const stageOrder = new Map<string, number>(STAGES.map(([value], i) => [value, i]));
  const templates = [...rawTemplates].sort((a, b) => {
    const condCompare = (conditionName(a.condition_id) ?? "").localeCompare(
      conditionName(b.condition_id) ?? "",
      "fr",
    );
    if (condCompare !== 0) return condCompare;
    const aOrder = a.stage ? (stageOrder.get(a.stage) ?? 99) : 99;
    const bOrder = b.stage ? (stageOrder.get(b.stage) ?? 99) : 99;
    return aOrder - bOrder;
  });

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-5xl p-6 sm:p-8">
        <div className="animate-[fadeInUp_0.6s_ease-out_both] flex items-center justify-between">
          <Link href="/dashboard" className="text-sm text-stone-500 hover:underline">
            ← Tableau de bord
          </Link>
          <Link href="/dashboard/exercises" className="text-sm font-medium text-blue-700 hover:underline">
            Gérer mes exercices →
          </Link>
        </div>
        <div className="animate-[fadeInUp_0.6s_ease-out_both]">
          <h1 className="font-display mt-3 text-2xl font-semibold text-stone-900">Mes séances</h1>
          <p className="mt-1 text-sm text-stone-500">
            Composez vos propres séances ; elles seront proposées aux patients de la phase choisie.
          </p>
        </div>

        {error && (
          <p className="animate-[fadeInUp_0.6s_ease-out_both] mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="animate-[fadeInUp_0.6s_ease-out_both] [animation-delay:120ms]">
          <SeancesTabs
            mine={seances.map((s) => ({
              id: s.id,
              name: s.name,
              conditionName: conditionName(s.condition_id),
              stage: s.stage as InjuryStage | null,
              stageLabel: s.stage ? STAGE_LABELS[s.stage as InjuryStage] : undefined,
              extra: `${s.workout_exercises?.length ?? 0} exercices`,
              leadExerciseName: leadExerciseName(s.workout_exercises),
              exerciseNames: exerciseNames(s.workout_exercises),
              exerciseCount: s.workout_exercises?.length ?? 0,
              blockedReason: inUseReason(s.id),
            }))}
            templates={templates.map((t) => ({
              id: t.id,
              name: t.name,
              conditionName: conditionName(t.condition_id),
              stage: t.stage as InjuryStage | null,
              stageLabel: t.stage ? STAGE_LABELS[t.stage as InjuryStage] : undefined,
              leadExerciseName: leadExerciseName(t.workout_exercises),
              exerciseNames: exerciseNames(t.workout_exercises),
            }))}
            duplicateSeance={duplicateSeance}
            deleteSeance={deleteSeance}
            createSeance={createSeance}
            conditions={conditions ?? []}
            stages={STAGES}
          />
        </div>
      </div>
    </main>
  );
}
