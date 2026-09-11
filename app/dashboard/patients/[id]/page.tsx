import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ArrowDown, ArrowUp, CheckCircle2, ChevronRight, Flame, Minus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { resolveWorkoutForWeek } from "@/lib/exercise/activeRecommendation";
import { buildWeeks, currentWeekNumber, localDateKey, thisWeekStartDateKey } from "@/lib/patient/weeks";
import { computeStreak } from "@/lib/exercise/streak";
import { computeAdherence, adherenceLabel, adherenceTone } from "@/lib/exercise/adherence";
import { buildPainSeries } from "@/lib/dashboard/painHistory";
import { relativeDay } from "@/lib/format/relativeDay";
import { initials } from "@/lib/format/initials";
import { STAGE_LABELS, STAGE_SHORT, type InjuryStage } from "@/lib/exercise/prescription";
import { ageFromDob } from "@/lib/exercise/patientProfile";
import { EQUIPMENT_LABELS, type EquipmentId } from "@/lib/exercise/equipment";
import { paymentEligibleForDeletion } from "@/lib/patient/paymentStatus";
import { type AddableWorkout } from "@/components/AdjustWorkoutModal";
import KineWeekProgramme, { type KineWorkoutSummary } from "@/components/KineWeekProgramme";
import PatientMessagesButton from "@/components/PatientMessagesButton";
import PatientActionsMenu from "@/components/PatientActionsMenu";
import type { SessionDetail } from "@/components/WeekProgramme";
import {
  assignCondition,
  addRecommendedWorkout,
  removeRecommendedWorkout,
  adjustPatientWorkout,
  markPaymentLapsed,
  clearPaymentLapsed,
  deletePatient,
} from "./actions";
import { getPatientThread, sendPatientMessage } from "../actions";

type WorkoutExercise = {
  position: number;
  exercises: { id: string; name: string; exercise_body_parts: { body_part_id: string }[] } | null;
};
type Workout = {
  id: string; name: string; description: string | null; duration_minutes: number | null; times_per_week: number | null;
  stage: string | null; created_by: string | null; condition_id: string | null; patient_id: string | null;
  workout_exercises: WorkoutExercise[];
};

const ACTIVITY_LABELS: Record<string, string> = { sedentary: "Sédentaire", moderate: "Modérée", active: "Active" };
const TONE_TEXT = { ok: "text-ok", warn: "text-warn", danger: "text-danger", muted: "text-muted" } as const;
const TONE_BG = { ok: "bg-ok-soft text-ok", warn: "bg-warn-soft text-warn", danger: "bg-danger-soft text-danger", muted: "bg-app-bg text-muted" } as const;

function PainDelta({ latest, previous }: { latest: number | null; previous: number | null }) {
  if (latest === null || previous === null) return <span className="text-xs text-muted">—</span>;
  const d = latest - previous;
  if (d === 0) return <span className="flex items-center gap-1 text-xs text-muted"><Minus className="h-3 w-3" strokeWidth={2} />= séance précédente</span>;
  return (
    <span className={`flex items-center gap-1 text-xs ${d > 0 ? "text-danger" : "text-ok"}`}>
      {d > 0 ? <ArrowUp className="h-3 w-3" strokeWidth={2} /> : <ArrowDown className="h-3 w-3" strokeWidth={2} />}
      {Math.abs(d)} depuis la séance précédente
    </span>
  );
}

export default async function PatientDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; adjusted?: string }> }) {
  const { id } = await params;
  const { error, adjusted } = await searchParams;
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const now = new Date();

  const { data: patient } = await supabase.from("patients").select("id, full_name, email, condition_id, created_at, payment_lapsed_at").eq("id", id).maybeSingle();
  if (!patient) redirect("/dashboard/patients");
  const firstName = ((patient.full_name as string | null) ?? "").split(" ")[0] || "ce patient";

  const WORKOUT_FIELDS =
    "id, name, description, duration_minutes, times_per_week, stage, created_by, condition_id, patient_id, workout_exercises ( position, exercises ( id, name, exercise_body_parts ( body_part_id ) ) )";
  const since30 = new Date(now.getTime() - 30 * 86_400_000).toISOString();

  // Tout l'historique du patient (séances + ressentis) est chargé une fois :
  // la frise (KineWeekProgramme) navigue entre les semaines côté client sans
  // refaire de requête — plus de filtre par mois ni de `?month=` dans l'URL.
  const [
    { data: conditions }, { data: profile }, { data: allLogs }, { data: recentFeedback },
    { data: allFeedback }, { data: ownWorkouts }, { data: platformWorkouts }, { data: recRows }, { data: allExercises }, { data: hiddenRows },
    { data: bodyParts },
    { count: unreadCount },
  ] = await Promise.all([
    supabase.from("conditions").select("id, name").order("name"),
    supabase.from("patient_profiles").select("declared_body_part_ids, injury_stage, rehab_progress, history, date_of_birth, height_cm, weight_kg, activity_level, equipment, updated_at").eq("id", id).maybeSingle(),
    supabase.from("workout_logs").select("id, completed_at, workout_id, workouts ( name, duration_minutes )").eq("patient_id", id),
    supabase.from("patient_feedback").select("pain_score, created_at").eq("patient_id", id).gte("created_at", since30),
    supabase.from("patient_feedback").select("workout_log_id, pain_score, difficulty, notes").eq("patient_id", id),
    supabase.from("workouts").select(WORKOUT_FIELDS).eq("created_by", user.id),
    supabase.from("workouts").select(WORKOUT_FIELDS).is("created_by", null),
    supabase.from("patient_recommended_workouts").select("id, week_start_date, workout_id, created_at").eq("patient_id", id).order("week_start_date", { ascending: false }),
    supabase.from("exercises").select("id, name, exercise_body_parts(body_part_id)").order("name"),
    supabase.from("instructor_hidden_exercises").select("exercise_id").eq("instructor_id", user.id),
    supabase.from("body_parts").select("id, slug, label, position").order("position"),
    supabase.from("patient_messages").select("id", { count: "exact", head: true }).eq("patient_id", id).eq("sender", "patient").is("read_by_instructor_at", null),
  ]);

  const conditionName = (cid: string | null) => conditions?.find((c) => c.id === cid)?.name;
  const stage = (profile?.injury_stage as InjuryStage | null) ?? null;

  // Séances : les miennes (hors copies d'autres patients), la plateforme, et les copies de CE patient.
  const own = (ownWorkouts ?? []) as unknown as Workout[];
  const pool = [...own.filter((w) => w.patient_id === null), ...((platformWorkouts ?? []) as unknown as Workout[])];
  const copies = own.filter((w) => w.patient_id === id);
  const workoutById = new Map([...pool, ...copies].map((w) => [w.id, w]));

  // Full history of what's ever been recommended (needed for adherence below,
  // which tracks compliance over time, not just the current séance) — the
  // one currently in effect is resolved separately right after.
  const recommended = (recRows ?? [])
    .map((r) => ({ recId: r.id as string, weekStartDate: r.week_start_date as string, createdAt: r.created_at as string, workout: workoutById.get(r.workout_id as string) }))
    .filter((r): r is { recId: string; weekStartDate: string; createdAt: string; workout: Workout } => r.workout != null);

  const activeWorkoutId = resolveWorkoutForWeek(
    recommended.map((r) => ({ workoutId: r.workout.id, weekStartDate: r.weekStartDate })),
    thisWeekStartDateKey(),
  );
  const activeRec = recommended.find((r) => r.workout.id === activeWorkoutId) ?? null;
  const active = activeRec?.workout ?? null;
  const activeExercises = active
    ? [...active.workout_exercises]
        .sort((a, b) => a.position - b.position)
        .map((we) => we.exercises)
        .filter((e): e is NonNullable<typeof e> => !!e)
        .map((e) => ({ id: e.id, name: e.name }))
    : [];

  // Stats.
  const completed = (allLogs ?? []).map((l) => l.completed_at as string);
  const totalSessions = completed.length;
  const streak = computeStreak(completed);
  const lastLog = (allLogs ?? []).reduce<{ completed_at: string; workout_id: string } | null>((best, l) => (!best || (l.completed_at as string) > best.completed_at ? { completed_at: l.completed_at as string, workout_id: l.workout_id as string } : best), null);
  const lastWorkout = lastLog ? workoutById.get(lastLog.workout_id) : undefined;
  const adherence = computeAdherence({
    completedAt: completed,
    assignments: recommended.map((r) => ({ workoutId: r.workout.id, weekStartDate: r.weekStartDate, timesPerWeek: r.workout.times_per_week })),
    now,
  });
  const tone = adherenceTone(adherence.pct);
  const pain = buildPainSeries((recentFeedback ?? []) as { pain_score: number | null; created_at: string }[], now);

  // Frise : semaines depuis la création du compte patient, et le détail de
  // chaque jour (séance, heure, douleur, difficulté, notes) indexé par date
  // locale — même structure que côté patient (app/patient/page.tsx).
  const weeks = buildWeeks((patient.created_at as string | null) ?? now.toISOString(), now);
  const feedbackByLogId = new Map((allFeedback ?? []).filter((f) => f.workout_log_id).map((f) => [f.workout_log_id as string, f]));
  const dayDetails: Record<string, SessionDetail[]> = {};
  for (const l of allLogs ?? []) {
    const completedAt = new Date(l.completed_at as string);
    const f = feedbackByLogId.get(l.id as string);
    const w = l.workouts as unknown as { name: string; duration_minutes: number | null } | null;
    (dayDetails[localDateKey(completedAt)] ??= []).push({
      logId: l.id as string,
      workoutName: w?.name ?? null,
      time: completedAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
      durationMinutes: w?.duration_minutes ?? null,
      painScore: (f?.pain_score as number | null) ?? null,
      difficulty: (f?.difficulty as number | null) ?? null,
      notes: (f?.notes as string | null) ?? null,
    });
  }
  // La frise résout elle-même la séance effective de chaque semaine à partir
  // de la liste complète des assignations + un résumé de chaque séance.
  const assignments = recommended.map((r) => ({ id: r.recId, workoutId: r.workout.id, weekStartDate: r.weekStartDate }));
  const workoutSummaries: Record<string, KineWorkoutSummary> = {};
  for (const r of recommended) {
    workoutSummaries[r.workout.id] ??= {
      id: r.workout.id,
      name: r.workout.name,
      exercises: [...r.workout.workout_exercises]
        .sort((a, b) => a.position - b.position)
        .map((we) => we.exercises)
        .filter((e): e is NonNullable<typeof e> => !!e)
        .map((e) => ({ id: e.id, name: e.name })),
    };
  }

  // Modale « Ajuster » : exercices ajoutables = tous − masqués − déjà dans la séance.
  // v1 : calculé pour la séance de la SEMAINE COURANTE uniquement. Si le kiné
  // ajuste une autre semaine dont la séance est différente, la liste peut
  // proposer un exercice déjà présent (applyAdjustment l'ignore alors) ou
  // masquer un exercice absent de cette séance-là — acceptable pour l'instant.
  const hiddenIds = new Set((hiddenRows ?? []).map((r) => r.exercise_id as string));
  const inActive = new Set(activeExercises.map((e) => e.id));
  const addableExercises = (allExercises ?? [])
    .filter((e) => !hiddenIds.has(e.id) && !inActive.has(e.id))
    .map((e) => ({
      id: e.id as string,
      name: e.name as string,
      bodyPartIds: (e.exercise_body_parts ?? []).map((t) => t.body_part_id as string),
    }));

  // Modale « Choisir une séance » : tout le pool ; la frise retire elle-même la
  // séance déjà effective pour la semaine sélectionnée (KineWeekProgramme).
  // Pas d'exclusion de l'historique — migration 0047 a explicitement supprimé
  // la contrainte d'unicité (patient_id, workout_id) pour permettre qu'une
  // séance déjà utilisée revienne plus tard.
  // La condition actuelle du patient remonte toujours en tête de liste — c'est
  // dans ce groupe qu'un kiné cherche une alternative neuf fois sur dix.
  const stageOrder = new Map(Object.keys(STAGE_LABELS).map((s, i) => [s, i]));
  const patientConditionName = conditionName(patient.condition_id) ?? null;
  const addableWorkouts: AddableWorkout[] = pool
    .sort((a, b) => {
      const ca = conditionName(a.condition_id) ?? "";
      const cb = conditionName(b.condition_id) ?? "";
      if (ca !== cb) {
        if (ca === patientConditionName) return -1;
        if (cb === patientConditionName) return 1;
        return ca.localeCompare(cb, "fr");
      }
      return (stageOrder.get(a.stage ?? "") ?? 99) - (stageOrder.get(b.stage ?? "") ?? 99);
    })
    .map((w) => ({
      id: w.id,
      name: w.name,
      description: w.description,
      durationMinutes: w.duration_minutes,
      timesPerWeek: w.times_per_week,
      stageLabel: w.stage ? STAGE_LABELS[w.stage as InjuryStage] : null,
      conditionName: conditionName(w.condition_id) ?? null,
      editHref: w.created_by === user.id ? `/dashboard/seances/${w.id}` : null,
      exerciseNames: [...w.workout_exercises].sort((a, b) => a.position - b.position).map((we) => we.exercises?.name).filter((n): n is string => !!n),
      // Union of every one of this séance's exercises' tagged body parts —
      // lets the picker filter a séance by area without forcing it into a
      // single category (see lib/exercise/category.ts's primaryBodyPart,
      // which does the opposite for a single exercise).
      bodyPartIds: [...new Set(w.workout_exercises.flatMap((we) => (we.exercises?.exercise_body_parts ?? []).map((t) => t.body_part_id)))],
    }));

  const profileUpdated = profile?.updated_at ? new Date(profile.updated_at as string).toLocaleDateString("fr-FR") : null;

  return (
    <main className="min-h-screen">
      {/* max-w-7xl comme la liste patients (Philippe, 2026-09-09 : « prendre
          toute la place ») — la frise a besoin de largeur. */}
      <div className="mx-auto max-w-7xl p-6 sm:p-8">
        <Link href="/dashboard/patients" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink"><ArrowLeft className="h-4 w-4" strokeWidth={1.75} />Retour à la liste</Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-ink">{patient.full_name}</h1>
            <form action={assignCondition} className="mt-2 flex flex-wrap items-center gap-2">
              <input type="hidden" name="patient_id" value={patient.id} />
              <select name="condition_id" defaultValue={patient.condition_id ?? ""} className="rounded-lg border border-line bg-surface px-2 py-1 text-sm text-ink">
                <option value="" disabled={!patient.condition_id}>Choisir une condition…</option>
                {conditions?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button type="submit" className="rounded-full border border-line px-3 py-1 text-xs font-medium text-ink hover:bg-app-bg">Changer</button>
              {stage && <span className="rounded-full bg-app-bg px-2 py-0.5 text-xs font-medium text-ink" title={STAGE_LABELS[stage]}>{STAGE_SHORT[stage]}</span>}
              <span className="inline-flex items-center gap-1 text-xs text-muted"><Flame className="h-3.5 w-3.5" strokeWidth={1.75} />{streak} j d&apos;affilée · {totalSessions} séance{totalSessions > 1 ? "s" : ""}</span>
              {patient.payment_lapsed_at && (
                <span className="rounded-full bg-warn-soft px-2 py-0.5 text-xs font-medium text-warn">Ne paie plus</span>
              )}
            </form>
          </div>
          {/* La séance se gère semaine par semaine depuis la frise ci-dessous ;
              ici il ne reste que la conversation, en popup pour ne pas quitter
              la fiche (point 4 de l'audit du 2026-09-09). */}
          <div className="flex items-center gap-2">
            <PatientMessagesButton
              patient={{ id: patient.id, name: (patient.full_name as string | null) ?? "Patient", initials: initials(patient.full_name as string | null) }}
              unreadCount={unreadCount ?? 0}
              getThread={getPatientThread}
              sendMessage={sendPatientMessage}
            />
            <PatientActionsMenu
              patientId={patient.id}
              patientName={firstName}
              paymentLapsedAt={patient.payment_lapsed_at as string | null}
              paymentEligibleForDeletion={paymentEligibleForDeletion(patient.payment_lapsed_at as string | null, now)}
              redirectTo={`/dashboard/patients/${patient.id}`}
              markPaymentLapsed={markPaymentLapsed}
              clearPaymentLapsed={clearPaymentLapsed}
              deletePatient={deletePatient}
            />
          </div>
        </div>

        {error && <p className="mt-4 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>}
        {adjusted === "1" && <p className="mt-4 flex items-center gap-2 rounded-xl bg-ok-soft px-4 py-3 text-sm text-ok"><CheckCircle2 className="h-4 w-4" strokeWidth={1.75} />Séance ajustée — le patient a été prévenu.</p>}

        {/* Trois stats */}
        <div className="mt-6 grid divide-y divide-line rounded-xl border border-line bg-surface sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <div className="p-4">
            <p className="text-xs font-medium text-muted">Douleur</p>
            <p className={`mt-1 text-2xl font-semibold tabular-nums ${pain.latest !== null && pain.latest >= 6 ? "text-danger" : "text-ink"}`}>{pain.latest !== null ? `${pain.latest}/10` : "—"}</p>
            <div className="mt-1"><PainDelta latest={pain.latest} previous={pain.previous} /></div>
          </div>
          <div className="p-4">
            <p className="text-xs font-medium text-muted">Adhérence</p>
            <p className={`mt-1 text-2xl font-semibold tabular-nums ${TONE_TEXT[tone]}`}>{adherence.pct !== null ? `${adherence.pct} %` : "—"}</p>
            {adherenceLabel(adherence.pct) && <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${TONE_BG[tone]}`}>{adherenceLabel(adherence.pct)}</span>}
          </div>
          <div className="p-4">
            <p className="text-xs font-medium text-muted">Dernière séance</p>
            <p className="mt-1 text-2xl font-semibold text-ink">{relativeDay(lastLog?.completed_at ?? null, now)}</p>
            {lastWorkout && <p className="mt-1 text-xs text-muted">{lastWorkout.duration_minutes ?? "—"} min · {lastWorkout.workout_exercises.length} exercice{lastWorkout.workout_exercises.length > 1 ? "s" : ""}</p>}
          </div>
        </div>

        {/* Profil déclaré — replié par défaut (Philippe, 2026-09-09 : la fiche
            ne doit pas nécessiter de scroll ; cette section sert rarement). */}
        <details className="mt-6 group rounded-xl border border-line bg-surface p-4">
          <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-wide text-muted marker:content-none">
            <span className="inline-flex items-center gap-1">
              Profil déclaré
              <ChevronRight className="h-3.5 w-3.5 transition-transform group-open:rotate-90" strokeWidth={2} />
            </span>
          </summary>
          {profile ? (
            <div className="mt-2 space-y-1">
              <p className="text-sm text-ink">
                {[
                  ageFromDob(profile.date_of_birth as string | null) != null ? `${ageFromDob(profile.date_of_birth as string | null)} ans` : null,
                  profile.height_cm != null ? `${profile.height_cm} cm` : null,
                  profile.weight_kg != null ? `${profile.weight_kg} kg` : null,
                  profile.activity_level ? `activité ${ACTIVITY_LABELS[profile.activity_level as string] ?? profile.activity_level}` : null,
                  stage ? STAGE_LABELS[stage] : null,
                ].filter(Boolean).join(" · ")}
              </p>
              {((profile.declared_body_part_ids as string[] | null) ?? []).length > 0 && (
                <div className="mt-1.5">
                  <span className="text-sm text-muted">Le patient signale vouloir travailler : </span>
                  <span className="inline-flex flex-wrap gap-1 align-middle">
                    {(profile.declared_body_part_ids as string[]).map((bpId) => (
                      <span key={bpId} className="rounded-full bg-app-bg px-2 py-0.5 text-xs font-medium text-ink">
                        {bodyParts?.find((bp) => bp.id === bpId)?.label ?? bpId}
                      </span>
                    ))}
                  </span>
                </div>
              )}
              {profile.rehab_progress && <p className="text-sm text-muted"><span>Avancement{profileUpdated ? ` (mis à jour le ${profileUpdated})` : ""} :</span> {profile.rehab_progress as string}</p>}
              {profile.history && <p className="text-sm text-muted"><span>Historique :</span> {profile.history as string}</p>}
              {((profile.equipment as EquipmentId[] | null) ?? []).length > 0 && (
                <div className="mt-1.5">
                  <span className="text-sm text-muted">Équipement disponible : </span>
                  <span className="inline-flex flex-wrap gap-1 align-middle">
                    {(profile.equipment as EquipmentId[]).map((eq) => (
                      <span key={eq} className="rounded-full bg-app-bg px-2 py-0.5 text-xs font-medium text-ink">
                        {EQUIPMENT_LABELS[eq] ?? eq}
                      </span>
                    ))}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted">Le patient n&apos;a pas encore complété son admission.</p>
          )}
        </details>

        {/* Frise semaine par semaine — remplace le calendrier mensuel et le
            graphique « Historique douleur » (audit Philippe, 2026-09-09) : une
            semaine avec douleur élevée ressort en rouge directement ici, et
            c'est depuis chaque semaine que le kiné assigne/ajuste la séance.
            Les illustrations de la séance en cours s'affichent directement
            DANS la carte « Cette semaine » de la frise (Philippe, 2026-09-09,
            deuxième retour : « mets-les sur la frise, qu'elle grossisse ») —
            plus de section séparée à faire défiler pour les voir. */}
        <div className="mt-8 w-full min-w-0">
          <KineWeekProgramme
            weeks={weeks}
            currentWeekNumber={currentWeekNumber(weeks, now)}
            dayDetails={dayDetails}
            assignments={assignments}
            workoutsById={workoutSummaries}
            patientId={patient.id}
            patientFirstName={firstName}
            addableExercises={addableExercises}
            bodyParts={bodyParts ?? []}
            addableWorkouts={addableWorkouts}
            adjustAction={adjustPatientWorkout}
            assignAction={addRecommendedWorkout}
            removeAction={removeRecommendedWorkout}
          />
        </div>
      </div>
    </main>
  );
}
