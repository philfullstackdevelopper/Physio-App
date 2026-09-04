import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ArrowDown, ArrowUp, CheckCircle2, ChevronDown, ChevronUp, FileText, Flame, MessageCircle, Minus, X } from "lucide-react";
import ExerciseIllustration from "@/components/ExerciseIllustration";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { startOfWeekISO, resolveMonthInfo } from "@/lib/week";
import { gradeDay } from "@/lib/exercise/dayGrade";
import { pickActiveWorkout } from "@/lib/exercise/activeRecommendation";
import { computeStreak } from "@/lib/exercise/streak";
import { computeAdherence, adherenceLabel, adherenceTone } from "@/lib/exercise/adherence";
import { buildPainSeries } from "@/lib/dashboard/painHistory";
import { relativeDay } from "@/lib/format/relativeDay";
import { STAGE_LABELS, STAGE_SHORT, type InjuryStage } from "@/lib/exercise/prescription";
import { ageFromDob } from "@/lib/exercise/patientProfile";
import { type CalendarDay } from "@/components/PatientCalendar";
import CalendarPanel from "@/components/CalendarPanel";
import PainHistoryChart from "@/components/PainHistoryChart";
import AdjustWorkoutModal from "@/components/AdjustWorkoutModal";
import AddWorkoutModal, { type AddableWorkout } from "@/components/AddWorkoutModal";
import { assignCondition, addRecommendedWorkout, removeRecommendedWorkout, moveRecommendedWorkout, sendMessage, adjustPatientWorkout } from "./actions";

type WorkoutExercise = { position: number; exercises: { id: string; name: string } | null };
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

export default async function PatientDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; month?: string; adjusted?: string }> }) {
  const { id } = await params;
  const { error, month: monthParam, adjusted } = await searchParams;
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const now = new Date();

  const { data: patient } = await supabase.from("patients").select("id, full_name, email, condition_id").eq("id", id).maybeSingle();
  if (!patient) redirect("/dashboard/patients");
  const firstName = ((patient.full_name as string | null) ?? "").split(" ")[0] || "ce patient";

  const WORKOUT_FIELDS = "id, name, description, duration_minutes, times_per_week, stage, created_by, condition_id, patient_id, workout_exercises ( position, exercises ( id, name ) )";
  const since30 = new Date(now.getTime() - 30 * 86_400_000).toISOString();
  const month = resolveMonthInfo(monthParam);

  const [
    { data: conditions }, { data: messages }, { data: profile }, { data: docs }, { data: allLogs }, { data: recentFeedback },
    { data: monthLogs }, { data: ownWorkouts }, { data: platformWorkouts }, { data: recRows }, { data: allExercises }, { data: hiddenRows },
  ] = await Promise.all([
    supabase.from("conditions").select("id, name").order("name"),
    supabase.from("patient_messages").select("id, body, created_at, read_at, read_by_instructor_at, sender").eq("patient_id", id).order("created_at", { ascending: false }).limit(10),
    supabase.from("patient_profiles").select("condition_id, injury_stage, rehab_progress, history, date_of_birth, height_cm, weight_kg, activity_level, updated_at").eq("id", id).maybeSingle(),
    supabase.from("patient_documents").select("id, file_name, storage_path, uploaded_at").eq("patient_id", id).order("uploaded_at", { ascending: false }),
    supabase.from("workout_logs").select("id, completed_at, workout_id").eq("patient_id", id),
    supabase.from("patient_feedback").select("pain_score, created_at").eq("patient_id", id).gte("created_at", since30),
    supabase.from("workout_logs").select("id, completed_at, workouts ( name )").eq("patient_id", id).gte("completed_at", month.startISO).lt("completed_at", month.endISO),
    supabase.from("workouts").select(WORKOUT_FIELDS).eq("created_by", user.id),
    supabase.from("workouts").select(WORKOUT_FIELDS).is("created_by", null),
    supabase.from("patient_recommended_workouts").select("id, priority, workout_id, created_at").eq("patient_id", id).order("priority"),
    supabase.from("exercises").select("id, name").order("name"),
    supabase.from("instructor_hidden_exercises").select("exercise_id").eq("instructor_id", user.id),
  ]);

  const unreadFromPatient = (messages ?? []).filter((m) => m.sender === "patient" && !m.read_by_instructor_at);
  if (unreadFromPatient.length > 0) {
    await supabase.from("patient_messages").update({ read_by_instructor_at: new Date().toISOString() }).eq("patient_id", id).eq("instructor_id", user.id).eq("sender", "patient").is("read_by_instructor_at", null);
  }

  const conditionName = (cid: string | null) => conditions?.find((c) => c.id === cid)?.name;
  const stage = (profile?.injury_stage as InjuryStage | null) ?? null;

  // Séances : les miennes (hors copies d'autres patients), la plateforme, et les copies de CE patient.
  const own = (ownWorkouts ?? []) as unknown as Workout[];
  const pool = [...own.filter((w) => w.patient_id === null), ...((platformWorkouts ?? []) as unknown as Workout[])];
  const copies = own.filter((w) => w.patient_id === id);
  const workoutById = new Map([...pool, ...copies].map((w) => [w.id, w]));

  const recommended = (recRows ?? [])
    .map((r) => ({ recId: r.id as string, priority: r.priority as number, createdAt: r.created_at as string, workout: workoutById.get(r.workout_id as string) }))
    .filter((r): r is { recId: string; priority: number; createdAt: string; workout: Workout } => r.workout != null);

  const weekStart = startOfWeekISO();
  const weekCount: Record<string, number> = {};
  for (const l of allLogs ?? []) if ((l.completed_at as string) >= weekStart) weekCount[l.workout_id as string] = (weekCount[l.workout_id as string] ?? 0) + 1;
  const activeWorkoutId = pickActiveWorkout(recommended.map((r) => ({ workoutId: r.workout.id, priority: r.priority, timesPerWeek: r.workout.times_per_week })), weekCount);
  const active = recommended.find((r) => r.workout.id === activeWorkoutId)?.workout ?? null;
  const activeExercises = active ? [...active.workout_exercises].sort((a, b) => a.position - b.position).map((we) => we.exercises).filter((e): e is { id: string; name: string } => !!e) : [];

  // Stats.
  const completed = (allLogs ?? []).map((l) => l.completed_at as string);
  const totalSessions = completed.length;
  const streak = computeStreak(completed);
  const lastLog = (allLogs ?? []).reduce<{ completed_at: string; workout_id: string } | null>((best, l) => (!best || (l.completed_at as string) > best.completed_at ? { completed_at: l.completed_at as string, workout_id: l.workout_id as string } : best), null);
  const lastWorkout = lastLog ? workoutById.get(lastLog.workout_id) : undefined;
  const adherence = computeAdherence({ completedAt: completed, recommendations: recommended.map((r) => ({ timesPerWeek: r.workout.times_per_week, createdAt: r.createdAt })), now });
  const tone = adherenceTone(adherence.pct);
  const pain = buildPainSeries((recentFeedback ?? []) as { pain_score: number | null; created_at: string }[], now);

  // Calendrier (inchangé : couleur = pire ressenti du jour).
  const monthLogIds = (monthLogs ?? []).map((l) => l.id as string);
  const { data: monthFeedback } = monthLogIds.length ? await supabase.from("patient_feedback").select("workout_log_id, pain_score, difficulty, notes").in("workout_log_id", monthLogIds) : { data: [] };
  const feedbackByLogId = new Map((monthFeedback ?? []).filter((f) => f.workout_log_id).map((f) => [f.workout_log_id as string, f]));
  const logsByDay = new Map<number, { id: string; workoutName: string | null; time: string }[]>();
  for (const l of monthLogs ?? []) {
    const d = new Date(l.completed_at as string);
    const entry = { id: l.id as string, workoutName: (l.workouts as unknown as { name: string } | null)?.name ?? null, time: d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) };
    (logsByDay.get(d.getDate()) ?? logsByDay.set(d.getDate(), []).get(d.getDate())!).push(entry);
  }
  const calendarDays: CalendarDay[] = Array.from({ length: month.daysInMonth }, (_, i) => {
    const day = i + 1;
    const logs = logsByDay.get(day) ?? [];
    const grade = gradeDay(logs.length > 0, logs.map((l) => { const f = feedbackByLogId.get(l.id); return { painScore: (f?.pain_score as number | null) ?? null, difficulty: (f?.difficulty as number | null) ?? null }; }));
    const detail = logs.length
      ? logs.map((l) => { const f = feedbackByLogId.get(l.id); const parts = [l.workoutName ?? "Séance", `terminée à ${l.time}`]; if (f?.pain_score != null) parts.push(`douleur ${f.pain_score}/10`); if (f?.difficulty != null) parts.push(`difficulté ${f.difficulty}/10`); if (f?.notes) parts.push(`« ${f.notes} »`); return parts.join(" · "); }).join(" ; ")
      : null;
    return { day, grade, detail };
  });

  // Modale « Ajuster » : exercices ajoutables = tous − masqués − déjà dans la séance.
  const hiddenIds = new Set((hiddenRows ?? []).map((r) => r.exercise_id as string));
  const inActive = new Set(activeExercises.map((e) => e.id));
  const addableExercises = (allExercises ?? []).filter((e) => !hiddenIds.has(e.id) && !inActive.has(e.id)).map((e) => ({ id: e.id as string, name: e.name as string }));

  // Modale « Ajouter une séance » : le pool sans les séances déjà recommandées.
  const recommendedIds = new Set(recommended.map((r) => r.workout.id));
  const stageOrder = new Map(Object.keys(STAGE_LABELS).map((s, i) => [s, i]));
  const addableWorkouts: AddableWorkout[] = pool
    .filter((w) => !recommendedIds.has(w.id))
    .sort((a, b) => (conditionName(a.condition_id) ?? "").localeCompare(conditionName(b.condition_id) ?? "", "fr") || (stageOrder.get(a.stage ?? "") ?? 99) - (stageOrder.get(b.stage ?? "") ?? 99))
    .map((w) => ({ id: w.id, name: w.name, description: w.description, durationMinutes: w.duration_minutes, timesPerWeek: w.times_per_week, stageLabel: w.stage ? STAGE_LABELS[w.stage as InjuryStage] : null, conditionName: conditionName(w.condition_id) ?? null, editHref: w.created_by === user.id ? `/dashboard/seances/${w.id}` : null, exerciseNames: [...w.workout_exercises].sort((a, b) => a.position - b.position).map((we) => we.exercises?.name).filter((n): n is string => !!n) }));

  const docLinks: { id: string; file_name: string; url: string | null }[] = [];
  for (const d of docs ?? []) {
    const { data } = await supabase.storage.from("patient-documents").createSignedUrl(d.storage_path, 3600);
    docLinks.push({ id: d.id, file_name: d.file_name, url: data?.signedUrl ?? null });
  }
  const profileUpdated = profile?.updated_at ? new Date(profile.updated_at as string).toLocaleDateString("fr-FR") : null;

  const inputClass = "rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft";

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-5xl p-6 sm:p-8">
        <Link href="/dashboard/patients" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink"><ArrowLeft className="h-4 w-4" strokeWidth={1.75} />Retour à la liste</Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-ink">{patient.full_name}</h1>
            <p className="mt-0.5 text-sm text-muted">
              {conditionName(patient.condition_id) ?? "Condition non assignée"}
              {stage && <> · <span title={STAGE_LABELS[stage]}>{STAGE_SHORT[stage]}</span></>}
              <span className="ml-3 inline-flex items-center gap-1 text-xs"><Flame className="h-3.5 w-3.5" strokeWidth={1.75} />{streak} j d&apos;affilée · {totalSessions} séance{totalSessions > 1 ? "s" : ""}</span>
            </p>
          </div>
          <AdjustWorkoutModal patientId={patient.id} patientFirstName={firstName} workout={active ? { id: active.id, name: active.name, exercises: activeExercises } : null} addable={addableExercises} action={adjustPatientWorkout} />
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

        {/* Calendrier + douleur */}
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <CalendarPanel monthLabel={month.label} prevMonthKey={month.prevMonthKey} nextMonthKey={month.nextMonthKey} leadingBlanks={month.leadingBlanks} days={calendarDays} todayDay={month.todayDay} />
          <section className="rounded-xl border border-line bg-surface p-5">
            <h2 className="text-sm font-semibold text-ink">Historique douleur</h2>
            <p className="mt-1 text-sm text-muted">Notes transmises en fin de séance, 30 derniers jours.</p>
            <div className="mt-3"><PainHistoryChart series={pain} /></div>
          </section>
        </div>

        {/* Séance recommandée + liste */}
        <section className="mt-6 rounded-xl border border-line bg-surface p-5">
          <h2 className="text-sm font-semibold text-ink">Séance recommandée</h2>
          {active ? (
            <div className="mt-3">
              <p className="text-base font-semibold text-ink">{active.name}</p>
              <p className="text-sm text-muted">{active.duration_minutes} min · {active.times_per_week ? `${active.times_per_week}×/semaine` : "objectif libre"} · cette semaine {weekCount[active.id] ?? 0}{active.times_per_week ? `/${active.times_per_week}` : ""}</p>
              <ul className="mt-3 divide-y divide-line rounded-lg border border-line">
                {activeExercises.map((e) => (
                  <li key={e.id} className="flex items-center gap-3 px-3 py-2 text-sm text-ink">
                    <ExerciseIllustration name={e.name} className="h-10 w-10 shrink-0 text-brand" />
                    {e.name}
                  </li>
                ))}
                {activeExercises.length === 0 && <li className="px-3 py-2 text-sm text-muted">Cette séance ne contient pas encore d&apos;exercices.</li>}
              </ul>
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted">{recommended.length ? "Toutes les séances recommandées sont faites cette semaine." : "Aucune séance recommandée pour l'instant — ajoutez-en une ci-dessous."}</p>
          )}

          <h3 className="mt-6 text-xs font-semibold uppercase tracking-wide text-muted">Autres séances recommandées</h3>
          <ul className="mt-2 divide-y divide-line">
            {recommended.map((r, i) => (
              <li key={r.recId} className={`flex items-start gap-3 py-3 ${r.workout.id === activeWorkoutId ? "-mx-3 rounded-lg bg-brand-soft/60 px-3" : ""}`}>
                <span className="w-5 text-sm font-semibold tabular-nums text-muted">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  {r.workout.created_by === user.id && r.workout.patient_id === null
                    ? <Link href={`/dashboard/seances/${r.workout.id}`} className="truncate text-sm font-semibold text-ink underline decoration-line underline-offset-2 hover:decoration-brand">{r.workout.name}</Link>
                    : <p className="truncate text-sm font-semibold text-ink">{r.workout.name}{r.workout.patient_id === id && <span className="ml-2 rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-medium text-brand">Séance de {firstName}</span>}</p>}
                  <p className="text-xs text-muted">{r.workout.duration_minutes} min · {r.workout.times_per_week ? `${r.workout.times_per_week}×/semaine` : "objectif libre"} · cette semaine {weekCount[r.workout.id] ?? 0}{r.workout.times_per_week ? `/${r.workout.times_per_week}` : ""}</p>
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  <form action={moveRecommendedWorkout}><input type="hidden" name="patient_id" value={patient.id} /><input type="hidden" name="rec_id" value={r.recId} /><input type="hidden" name="direction" value="up" /><button type="submit" disabled={i === 0} aria-label="Monter" className="rounded p-1 text-muted hover:bg-app-bg hover:text-ink disabled:opacity-30"><ChevronUp className="h-3.5 w-3.5" strokeWidth={2} /></button></form>
                  <form action={moveRecommendedWorkout}><input type="hidden" name="patient_id" value={patient.id} /><input type="hidden" name="rec_id" value={r.recId} /><input type="hidden" name="direction" value="down" /><button type="submit" disabled={i === recommended.length - 1} aria-label="Descendre" className="rounded p-1 text-muted hover:bg-app-bg hover:text-ink disabled:opacity-30"><ChevronDown className="h-3.5 w-3.5" strokeWidth={2} /></button></form>
                  <form action={removeRecommendedWorkout}><input type="hidden" name="patient_id" value={patient.id} /><input type="hidden" name="rec_id" value={r.recId} /><button type="submit" aria-label="Retirer" className="rounded p-1 text-muted hover:bg-danger-soft hover:text-danger"><X className="h-3.5 w-3.5" strokeWidth={2} /></button></form>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-3"><AddWorkoutModal patientId={patient.id} addable={addableWorkouts} addAction={addRecommendedWorkout} /></div>
        </section>

        {/* Messages */}
        <section className="mt-6 rounded-xl border border-line bg-surface p-5">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-ink"><MessageCircle className="h-4 w-4 text-muted" strokeWidth={1.75} />Messages</h2>
          {messages && messages.length > 0 && (
            <ul className="mt-3 flex max-h-56 flex-col gap-2 overflow-y-auto">
              {[...messages].reverse().map((m) => {
                const mine = m.sender === "instructor";
                return (
                  <li key={m.id as string} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${mine ? "rounded-br-md bg-brand text-white" : "rounded-bl-md bg-app-bg text-ink"}`}>
                      <p>{m.body as string}</p>
                      <p className={`mt-0.5 text-xs ${mine ? "text-white/70" : "text-muted"}`}>{new Date(m.created_at as string).toLocaleString("fr-FR")}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <form action={sendMessage} className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input type="hidden" name="patient_id" value={patient.id} />
            <textarea name="body" required rows={2} placeholder="Écrire un message…" className={`flex-1 ${inputClass}`} />
            <button type="submit" className="self-end rounded-full bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark sm:self-auto">Envoyer</button>
          </form>
        </section>

        {/* Condition & situation déclarée */}
        <details className="mt-6 rounded-xl border border-line bg-surface p-5">
          <summary className="cursor-pointer list-none text-sm font-semibold text-ink">
            Condition &amp; situation déclarée <span className="ml-2 text-sm font-normal text-muted">{conditionName(patient.condition_id) ?? "Aucune condition assignée"}</span>
          </summary>
          <form action={assignCondition} className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input type="hidden" name="patient_id" value={patient.id} />
            <select name="condition_id" defaultValue={patient.condition_id ?? ""} required className={`flex-1 ${inputClass}`}>
              <option value="" disabled>Choisir une condition…</option>
              {conditions?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button type="submit" className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark">Assigner</button>
          </form>
          {profile ? (
            <div className="mt-4 space-y-2 border-t border-line pt-4 text-sm text-ink">
              <p><span className="text-muted">Ce que le patient déclare :</span> <span className="font-medium">{conditionName(profile.condition_id as string | null) ?? "—"}</span>{stage && <span className="text-muted"> · {STAGE_LABELS[stage]}</span>}</p>
              <p><span className="text-muted">Profil :</span> {ageFromDob(profile.date_of_birth as string | null) ?? "—"} ans · {profile.height_cm ?? "—"} cm · {profile.weight_kg ?? "—"} kg · activité {ACTIVITY_LABELS[(profile.activity_level as string) ?? ""] ?? "—"}</p>
              {profile.rehab_progress && <p><span className="text-muted">Avancement{profileUpdated ? ` (mis à jour le ${profileUpdated})` : ""} :</span> {profile.rehab_progress as string}</p>}
              {profile.history && <p><span className="text-muted">Historique :</span> {profile.history as string}</p>}
            </div>
          ) : (
            <p className="mt-4 border-t border-line pt-4 text-sm text-muted">Le patient n&apos;a pas encore complété son admission.</p>
          )}
          {docLinks.length > 0 && (
            <div className="mt-4 border-t border-line pt-4">
              <p className="text-sm font-medium text-ink">Documents médicaux</p>
              <ul className="mt-2 space-y-1.5">
                {docLinks.map((d) => (
                  <li key={d.id}>
                    {d.url ? <a href={d.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm font-medium text-brand hover:underline"><FileText className="h-4 w-4 shrink-0" strokeWidth={1.75} />{d.file_name}</a>
                           : <span className="flex items-center gap-1.5 text-sm text-muted"><FileText className="h-4 w-4 shrink-0" strokeWidth={1.75} />{d.file_name}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </details>
      </div>
    </main>
  );
}
