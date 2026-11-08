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
import { getLocale, getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/locales";
import { intlTag } from "@/lib/i18n/translator";
import { createClient } from "@/lib/supabase/server";
import { requireApprovedInstructor } from "@/lib/dashboard/requireApprovedInstructor";
import { resolveWorkoutForWeek } from "@/lib/exercise/activeRecommendation";
import { thisWeekStartDateKey } from "@/lib/patient/weeks";
import { FIXED_GOAL_REPS, FIXED_GOAL_SETS, doseFromRow, goalTextFor } from "@/lib/exercise/prescription";
import { parseSteps } from "@/lib/exercise/steps";
import ExerciseIllustration from "@/components/ExerciseIllustration";
import PrintButton from "@/components/PrintButton";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("exercise.programmeDoc");
  return { title: t("metaTitle"), robots: { index: false } };
}

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

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
  const [t, tGoal, locale] = await Promise.all([
    getTranslations("exercise.programmeDoc"),
    getTranslations("exercise.goal"),
    getLocale(),
  ]);
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
  const today = new Date().toLocaleDateString(intlTag(locale as Locale), { day: "numeric", month: "long", year: "numeric" });
  const prescription = { goalSets: FIXED_GOAL_SETS, goalReps: FIXED_GOAL_REPS };

  return (
    <main className="min-h-screen bg-app-bg px-4 py-6 print:bg-white print:p-0">
      <div className="mx-auto mb-4 flex max-w-[720px] flex-wrap items-center justify-between gap-3 print:hidden">
        <h1 className="text-lg font-semibold text-ink">{t("heading", { name: (patient.full_name as string | null) ?? t("yourPatient") })}</h1>
        <PrintButton />
      </div>

      {/* Fiches en 2 colonnes (Philippe, 2026-11-02, option B validée) : bandeau,
          une fiche par exercice avec cases « fait » pour la semaine, et un
          carnet de douleur — le patient peut l'utiliser sans téléphone. */}
      <article className="mx-auto flex max-w-[760px] flex-col gap-4 rounded-2xl border border-line bg-white p-8 text-ink print:max-w-none print:rounded-none print:border-0 print:p-0">
        <header className="flex flex-wrap items-center gap-4 rounded-xl bg-brand-soft px-5 py-4 print:border print:border-brand">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-brand-dark">
              {t("givenOn", { date: today })}
            </p>
            <h2 className="mt-0.5 text-xl font-semibold">
              {(patient.full_name as string | null) ?? t("patient")}
              {workout ? ` — ${workout.name as string}` : ""}
            </h2>
            {workout && (
              <p className="mt-0.5 text-sm text-ink/80">
                {[
                  workout.times_per_week ? t("timesPerWeek", { n: workout.times_per_week as number }) : null,
                  workout.duration_minutes ? t("aboutMinutes", { n: workout.duration_minutes as number }) : null,
                  t("exerciseCount", { count: rows.length }),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
          </div>
          <div className="text-right text-sm">
            <p className="font-semibold">{(kine?.full_name as string | null) ?? ""}</p>
            {kine?.cabinet_name && <p className="text-ink/80">{kine.cabinet_name as string}</p>}
            {kine?.cabinet_address && <p className="text-ink/80">{kine.cabinet_address as string}</p>}
          </div>
        </header>

        {!workout ? (
          <p className="py-10 text-center text-sm text-muted">{t("noSeance")}</p>
        ) : (
          <>
            {workout.description && <p className="text-sm">{workout.description as string}</p>}
            <ol className="grid grid-cols-2 gap-3 print:gap-2.5">
              {rows.map((r, i) => {
                const ex = r.exercises;
                if (!ex) return null;
                const steps = parseSteps(ex.instructions).slice(0, 3);
                return (
                  <li key={`${ex.id}-${i}`} className="flex break-inside-avoid flex-col overflow-hidden rounded-xl border border-line">
                    <ExerciseIllustration name={ex.name} animate={false} still="middle" className="h-28 w-full bg-app-bg p-2 text-brand print:bg-white" />
                    <div className="flex flex-1 flex-col gap-1.5 p-3">
                      <p className="text-sm font-semibold">
                        {i + 1} · {ex.name}
                      </p>
                      <p className="inline-flex self-start rounded-md border border-brand px-2 py-0.5 text-xs font-semibold text-brand-dark">
                        {goalTextFor(ex.instructions, prescription, doseFromRow(r), tGoal)}
                      </p>
                      {steps.length > 0 && (
                        <ol className="list-decimal space-y-0.5 pl-4 text-xs leading-snug text-ink/90">
                          {steps.map((st, j) => (
                            <li key={j}>{st}</li>
                          ))}
                        </ol>
                      )}
                      <p className="mt-auto flex items-center gap-1.5 pt-1 text-[11px] text-muted">
                        {t("doneThisWeek")}
                        {Array.from({ length: Math.min(Math.max((workout.times_per_week as number | null) ?? 3, 1), 7) }, (_, k) => (
                          <span key={k} aria-hidden="true" className="inline-block h-3.5 w-3.5 rounded-sm border border-muted" />
                        ))}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>

            <section className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-line px-4 py-3 text-sm break-inside-avoid">
              <span className="font-semibold">{t("painThisWeek")}</span>
              {DAYS.map((d) => (
                <span key={d} className="text-ink/80">
                  {t(`days.${d}`)} ___/10
                </span>
              ))}
            </section>

            <p className="border-t border-line pt-3 text-xs text-muted">
              {t("footer")}
            </p>
          </>
        )}
      </article>
    </main>
  );
}
