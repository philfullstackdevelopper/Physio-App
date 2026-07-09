import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { startOfWeekISO } from "@/lib/week";
import { STAGE_LABELS, type InjuryStage } from "@/lib/exercise/prescription";
import { ageFromDob } from "@/lib/exercise/patientProfile";
import { computeStreak } from "@/lib/exercise/streak";
import { assignCondition, recommendWorkout } from "./actions";

type WorkoutExercise = {
  position: number;
  exercises: { name: string } | null;
};
type Workout = {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number | null;
  times_per_week: number | null;
  stage: string | null;
  workout_exercises: WorkoutExercise[];
};

const ACTIVITY_LABELS: Record<string, string> = {
  sedentary: "Sédentaire",
  moderate: "Modérée",
  active: "Active",
};

export default async function PatientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: patient } = await supabase
    .from("patients")
    .select("id, full_name, email, condition_id, recommended_workout_id")
    .eq("id", id)
    .maybeSingle();
  if (!patient) redirect("/dashboard/patients");

  const { data: conditions } = await supabase.from("conditions").select("id, name").order("name");
  const conditionName = (cid: string | null) => conditions?.find((c) => c.id === cid)?.name;

  // Patient's declared situation + profile (intake).
  const { data: profile } = await supabase
    .from("patient_profiles")
    .select("condition_id, injury_stage, rehab_progress, history, date_of_birth, height_cm, weight_kg, activity_level, updated_at")
    .eq("id", id)
    .maybeSingle();
  const profileUpdated = profile?.updated_at
    ? new Date(profile.updated_at as string).toLocaleDateString("fr-FR")
    : null;

  // Medical documents (private) → signed URLs the instructor can open.
  const { data: docs } = await supabase
    .from("patient_documents")
    .select("id, file_name, storage_path, uploaded_at")
    .eq("patient_id", id)
    .order("uploaded_at", { ascending: false });
  const docLinks: { id: string; file_name: string; url: string | null }[] = [];
  for (const d of docs ?? []) {
    const { data } = await supabase.storage
      .from("patient-documents")
      .createSignedUrl(d.storage_path, 3600);
    docLinks.push({ id: d.id, file_name: d.file_name, url: data?.signedUrl ?? null });
  }

  // Adherence.
  const { data: allLogs } = await supabase
    .from("workout_logs")
    .select("completed_at")
    .eq("patient_id", id);
  const totalSessions = allLogs?.length ?? 0;
  const weekStart = startOfWeekISO();
  const weekSessions = (allLogs ?? []).filter((l) => (l.completed_at as string) >= weekStart).length;
  const streak = computeStreak((allLogs ?? []).map((l) => l.completed_at as string));

  // Symptom feedback (pain / difficulty).
  const { data: feedback } = await supabase
    .from("patient_feedback")
    .select("pain_score, difficulty, completed, recorded_for, notes")
    .eq("patient_id", id)
    .order("recorded_for", { ascending: false })
    .limit(7);
  const avgPain = feedback && feedback.length
    ? Math.round((feedback.reduce((s, f) => s + (f.pain_score as number), 0) / feedback.length) * 10) / 10
    : null;

  // Workouts of the ASSIGNED condition (kiné-driven), with weekly completions.
  let workouts: Workout[] = [];
  const weekCount: Record<string, number> = {};
  if (patient.condition_id) {
    const { data: workoutsData } = await supabase
      .from("workouts")
      .select(
        "id, name, description, duration_minutes, times_per_week, stage, workout_exercises ( position, exercises ( name ) )",
      )
      .eq("condition_id", patient.condition_id)
      .order("stage")
      .order("duration_minutes");
    workouts = (workoutsData ?? []) as unknown as Workout[];

    const { data: logs } = await supabase
      .from("workout_logs")
      .select("workout_id")
      .eq("patient_id", id)
      .gte("completed_at", weekStart);
    for (const l of logs ?? []) weekCount[l.workout_id] = (weekCount[l.workout_id] ?? 0) + 1;
  }

  const stageLabel = profile?.injury_stage
    ? STAGE_LABELS[profile.injury_stage as InjuryStage]
    : null;

  return (
    <main className="min-h-screen bg-slate-50 p-6 sm:p-8">
      <div className="mx-auto max-w-2xl">
        <Link href="/dashboard/patients" className="text-sm text-slate-500 hover:underline">
          ← Mes patients
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">{patient.full_name}</h1>
        <p className="text-sm text-slate-500">{patient.email}</p>

        {error && <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        {/* Suivi — quick stats */}
        <section className="mt-6 grid grid-cols-3 gap-3">
          {[
            { label: "Séances totales", value: totalSessions },
            { label: "Cette semaine", value: weekSessions },
            { label: "Jours d'affilée", value: `${streak} 🔥` },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-slate-100 bg-white p-4 text-center shadow-sm">
              <div className="text-2xl font-semibold text-slate-900 tabular-nums">{s.value}</div>
              <div className="mt-0.5 text-xs text-slate-500">{s.label}</div>
            </div>
          ))}
        </section>

        {/* Situation & profil déclarés par le patient */}
        <section className="mt-6 rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-medium text-slate-900">Situation déclarée</h2>
          {profile ? (
            <div className="mt-3 space-y-2 text-sm">
              <p className="text-slate-600">
                <span className="text-slate-400">Ce que le patient déclare :</span>{" "}
                <span className="font-medium text-slate-800">{conditionName(profile.condition_id) ?? "—"}</span>
                {stageLabel && <span className="text-slate-500"> · {stageLabel}</span>}
              </p>
              <p className="text-slate-600">
                <span className="text-slate-400">Profil :</span>{" "}
                {ageFromDob(profile.date_of_birth) ?? "—"} ans · {profile.height_cm ?? "—"} cm ·{" "}
                {profile.weight_kg ?? "—"} kg · activité {ACTIVITY_LABELS[profile.activity_level ?? ""] ?? "—"}
              </p>
              {profile.rehab_progress && (
                <p className="text-slate-600">
                  <span className="text-slate-400">
                    Avancement{profileUpdated ? ` (mis à jour le ${profileUpdated})` : ""} :
                  </span>{" "}
                  {profile.rehab_progress}
                </p>
              )}
              {profile.history && (
                <p className="text-slate-600">
                  <span className="text-slate-400">Historique :</span> {profile.history}
                </p>
              )}
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-500">
              Le patient n&apos;a pas encore complété son admission.
            </p>
          )}

          {/* Documents */}
          {docLinks.length > 0 && (
            <div className="mt-4 border-t border-slate-100 pt-4">
              <p className="text-sm font-medium text-slate-700">Documents médicaux</p>
              <ul className="mt-2 space-y-1.5">
                {docLinks.map((d) => (
                  <li key={d.id}>
                    {d.url ? (
                      <a
                        href={d.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-teal-700 hover:underline"
                      >
                        📄 {d.file_name}
                      </a>
                    ) : (
                      <span className="text-sm text-slate-500">📄 {d.file_name}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* Feedback douleur / difficulté */}
        {feedback && feedback.length > 0 && (
          <section className="mt-6 rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="flex items-baseline justify-between">
              <h2 className="text-lg font-medium text-slate-900">Ressenti récent</h2>
              {avgPain !== null && (
                <span className="text-sm text-slate-500">
                  Douleur moyenne : <span className="font-semibold text-slate-800">{avgPain}/10</span>
                </span>
              )}
            </div>
            <ul className="mt-3 divide-y divide-slate-100 text-sm">
              {feedback.map((f, i) => (
                <li key={i} className="py-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">{f.recorded_for as string}</span>
                    <span className="text-slate-700">
                      Douleur <span className="font-semibold">{f.pain_score}/10</span>
                      {f.difficulty != null && <> · Difficulté {f.difficulty}/10</>}
                    </span>
                  </div>
                  {f.notes ? <p className="mt-0.5 italic text-slate-600">« {f.notes as string} »</p> : null}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Assign a condition (kiné decides) */}
        <section className="mt-6 rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-medium text-slate-900">Condition assignée</h2>
          <p className="mt-1 text-sm text-slate-500">
            {conditionName(patient.condition_id)
              ? `Condition actuelle : ${conditionName(patient.condition_id)}`
              : "Aucune condition assignée pour l'instant."}
          </p>
          <form action={assignCondition} className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input type="hidden" name="patient_id" value={patient.id} />
            <select
              name="condition_id"
              defaultValue={patient.condition_id ?? ""}
              required
              className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
            >
              <option value="" disabled>
                Choisir une condition…
              </option>
              {conditions?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-md bg-teal-600 px-4 py-2 font-medium text-white hover:bg-teal-700"
            >
              Assigner
            </button>
          </form>
        </section>

        {/* Workout alternatives */}
        {patient.condition_id && (
          <section className="mt-6">
            <h2 className="text-lg font-medium text-slate-900">Séances disponibles</h2>
            <p className="mt-1 text-sm text-slate-500">
              Recommandez une séance (par phase de récupération).
            </p>
            <div className="mt-4 space-y-4">
              {workouts.map((w) => {
                const isRecommended = w.id === patient.recommended_workout_id;
                const done = weekCount[w.id] ?? 0;
                const wStage = w.stage ? STAGE_LABELS[w.stage as InjuryStage] : null;
                return (
                  <div
                    key={w.id}
                    className={`rounded-xl border bg-white p-5 shadow-sm ${
                      isRecommended ? "border-teal-500 ring-1 ring-teal-500" : "border-slate-100"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-slate-900">{w.name}</h3>
                          {isRecommended && (
                            <span className="rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-700">
                              Recommandée
                            </span>
                          )}
                        </div>
                        {wStage && <p className="mt-0.5 text-xs font-medium text-teal-700">{wStage}</p>}
                        <p className="mt-1 text-sm text-slate-500">
                          {w.duration_minutes} min · {w.times_per_week}×/semaine
                        </p>
                        {w.description && (
                          <p className="mt-1 text-sm text-slate-500">{w.description}</p>
                        )}
                      </div>
                      <form action={recommendWorkout}>
                        <input type="hidden" name="patient_id" value={patient.id} />
                        <input type="hidden" name="workout_id" value={isRecommended ? "" : w.id} />
                        <button
                          type="submit"
                          className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ${
                            isRecommended
                              ? "border border-slate-300 text-slate-600 hover:bg-slate-50"
                              : "bg-teal-600 text-white hover:bg-teal-700"
                          }`}
                        >
                          {isRecommended ? "Retirer" : "Recommander"}
                        </button>
                      </form>
                    </div>

                    <ul className="mt-3 flex flex-wrap gap-2">
                      {w.workout_exercises
                        ?.slice()
                        .sort((a, b) => a.position - b.position)
                        .map((we, i) => (
                          <li
                            key={i}
                            className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600"
                          >
                            {we.exercises?.name}
                          </li>
                        ))}
                    </ul>

                    {done > 0 && (
                      <p className="mt-3 text-xs text-slate-400">Cette semaine : {done} réalisée(s)</p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
