// =============================================================================
// Programme du patient à imprimer / enregistrer en PDF (Philippe, 2026-11-02,
// inspiré de Fullphysio) — pour le patient qui préfère le papier, ou pour le
// lui remettre au cabinet. La séance en vigueur cette semaine : chaque
// exercice avec son dessin, sa dose et ses étapes. Même gabarit que les
// notes d'honoraires (app/documents/honoraires) : hors du tableau de bord,
// bouton « Imprimer ou enregistrer en PDF ».
// Accès : le kiné du patient seulement (RLS : un autre kiné ne lit rien).
// =============================================================================

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireApprovedInstructor } from "@/lib/dashboard/requireApprovedInstructor";
import { resolveWorkoutForWeek } from "@/lib/exercise/activeRecommendation";
import { thisWeekStartDateKey } from "@/lib/patient/weeks";
import { FIXED_GOAL_REPS, FIXED_GOAL_SETS, doseFromRow, goalTextFor } from "@/lib/exercise/prescription";
import { parseSteps } from "@/lib/exercise/steps";
import ExerciseIllustration from "@/components/ExerciseIllustration";
import PrintButton from "@/components/PrintButton";

export const metadata: Metadata = { title: "Programme d'exercices", robots: { index: false } };

type Row = {
  position: number;
  sets?: number | null;
  reps?: number | null;
  hold_seconds?: number | null;
  exercises: { id: string; name: string; instructions: string | null } | null;
};

export default async function ProgrammeDocumentPage({ searchParams }: { searchParams: Promise<{ patient?: string }> }) {
  const { patient: patientId } = await searchParams;
  if (!patientId) notFound();
  const supabase = await createClient();
  const { user } = await requireApprovedInstructor(supabase);

  const [{ data: patient }, { data: kine }, { data: recs }] = await Promise.all([
    supabase.from("patients").select("id, full_name").eq("id", patientId).eq("instructor_id", user.id).maybeSingle(),
    supabase.from("instructors").select("full_name, cabinet_name, cabinet_address").eq("id", user.id).maybeSingle(),
    supabase.from("patient_recommended_workouts").select("workout_id, week_start_date, week_count").eq("patient_id", patientId),
  ]);
  if (!patient) notFound();

  const workoutId = resolveWorkoutForWeek(
    (recs ?? []).map((r) => ({ workoutId: r.workout_id as string, weekStartDate: r.week_start_date as string, weekCount: (r.week_count as number | null) ?? null })),
    thisWeekStartDateKey(),
  );

  const { data: workout } = workoutId
    ? await supabase
        .from("workouts")
        .select("name, description, times_per_week, duration_minutes, workout_exercises ( * , exercises ( id, name, instructions ) )")
        .eq("id", workoutId)
        .maybeSingle()
    : { data: null };

  const rows = ([...(((workout?.workout_exercises as unknown) as Row[] | undefined) ?? [])]).sort((a, b) => a.position - b.position);
  const today = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const prescription = { goalSets: FIXED_GOAL_SETS, goalReps: FIXED_GOAL_REPS };

  return (
    <main className="min-h-screen bg-app-bg px-4 py-6 print:bg-white print:p-0">
      <div className="mx-auto mb-4 flex max-w-[720px] flex-wrap items-center justify-between gap-3 print:hidden">
        <h1 className="text-lg font-semibold text-ink">Programme de {(patient.full_name as string | null) ?? "votre patient"}</h1>
        <PrintButton />
      </div>

      <article className="mx-auto max-w-[720px] rounded-2xl border border-line bg-white p-8 text-ink print:max-w-none print:rounded-none print:border-0 print:p-0">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand">Programme d&apos;exercices</p>
            <h2 className="mt-1 text-2xl font-semibold">{(patient.full_name as string | null) ?? "Patient"}</h2>
            <p className="mt-1 text-sm text-muted">Remis le {today}</p>
          </div>
          <div className="text-right text-sm">
            <p className="font-semibold">{(kine?.full_name as string | null) ?? ""}</p>
            {kine?.cabinet_name && <p className="text-muted">{kine.cabinet_name as string}</p>}
            {kine?.cabinet_address && <p className="text-muted">{kine.cabinet_address as string}</p>}
          </div>
        </header>

        {!workout ? (
          <p className="py-10 text-center text-sm text-muted">Aucune séance n&apos;est attribuée à ce patient cette semaine.</p>
        ) : (
          <>
            <section className="mt-4">
              <h3 className="text-lg font-semibold">{workout.name as string}</h3>
              <p className="mt-0.5 text-sm text-muted">
                {[
                  workout.times_per_week ? `${workout.times_per_week} fois par semaine` : null,
                  workout.duration_minutes ? `environ ${workout.duration_minutes} min` : null,
                  `${rows.length} exercice${rows.length > 1 ? "s" : ""}`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {workout.description && <p className="mt-2 text-sm">{workout.description as string}</p>}
            </section>

            <ol className="mt-5 space-y-4">
              {rows.map((r, i) => {
                const ex = r.exercises;
                if (!ex) return null;
                const steps = parseSteps(ex.instructions);
                return (
                  <li key={`${ex.id}-${i}`} className="flex gap-4 rounded-xl border border-line p-4 break-inside-avoid print:rounded-none">
                    <ExerciseIllustration name={ex.name} animate={false} className="h-24 w-32 shrink-0 text-brand" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-muted">Exercice {i + 1}</p>
                      <p className="font-semibold">{ex.name}</p>
                      <p className="mt-0.5 inline-flex rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-semibold text-brand print:border print:border-brand">
                        {goalTextFor(ex.instructions, prescription, doseFromRow(r))}
                      </p>
                      {steps.length > 0 && (
                        <ol className="mt-2 list-decimal space-y-0.5 pl-5 text-sm">
                          {steps.map((s, j) => (
                            <li key={j}>{s}</li>
                          ))}
                        </ol>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>

            <p className="mt-6 border-t border-line pt-3 text-xs text-muted">
              Une douleur vive pendant un exercice ? Arrêtez-vous et parlez-en à votre kiné. Vos vidéos et votre suivi sont aussi dans l&apos;application EasyPhysio.
            </p>
          </>
        )}
      </article>
    </main>
  );
}
