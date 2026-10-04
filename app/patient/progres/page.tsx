import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { computeAdherence, adherenceLabel, adherenceTone, ADHERENCE_WINDOW_DAYS } from "@/lib/exercise/adherence";
import { buildPainSeries } from "@/lib/dashboard/painHistory";
import FillPainChart from "@/components/FillPainChart";

const TONE_BG = { ok: "bg-ok-soft text-ok", warn: "bg-warn-soft text-warn", danger: "bg-danger-soft text-danger", muted: "bg-app-bg text-muted" } as const;

export default async function ProgresPage() {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const now = new Date();
  const since30 = new Date(now.getTime() - 30 * 86_400_000).toISOString();
  const since60 = new Date(now.getTime() - 60 * 86_400_000).toISOString();
  const [{ data: recRows }, { data: logs }, { data: feedback30 }, { data: feedback60 }, { data: patient }] = await Promise.all([
    supabase.from("patient_recommended_workouts").select("week_start_date, week_count, workout_id, workouts ( times_per_week )").eq("patient_id", user.id),
    supabase.from("workout_logs").select("completed_at").eq("patient_id", user.id),
    supabase.from("patient_feedback").select("pain_score, created_at").eq("patient_id", user.id).gte("created_at", since30),
    supabase.from("patient_feedback").select("pain_score, created_at").eq("patient_id", user.id).gte("created_at", since60).lt("created_at", since30),
    supabase.from("patients").select("condition_id").eq("id", user.id).maybeSingle(),
  ]);
  const { data: condition } = patient?.condition_id
    ? await supabase.from("conditions").select("name").eq("id", patient.condition_id as string).maybeSingle()
    : { data: null };

  const assignments = (recRows ?? []).map((r) => ({
    workoutId: r.workout_id as string,
    weekStartDate: r.week_start_date as string,
    weekCount: (r.week_count as number | null) ?? null,
    timesPerWeek: (r.workouts as unknown as { times_per_week: number | null } | null)?.times_per_week ?? null,
  }));
  const completedAt = (logs ?? []).map((l) => l.completed_at as string);

  const adherenceNow = computeAdherence({ completedAt, assignments, now });
  const adherencePrev = computeAdherence({ completedAt, assignments, now: new Date(now.getTime() - ADHERENCE_WINDOW_DAYS * 86_400_000) });
  const adherenceDelta = adherenceNow.pct !== null && adherencePrev.pct !== null ? adherenceNow.pct - adherencePrev.pct : null;

  const pain = buildPainSeries((feedback30 ?? []) as { pain_score: number | null; created_at: string }[]);
  const avg = (rows: { pain_score: number | null }[]) => {
    const vals = rows.map((r) => r.pain_score).filter((v): v is number => v != null);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  };
  const painAvgNow = avg((feedback30 ?? []) as { pain_score: number | null }[]);
  const painAvgPrev = avg((feedback60 ?? []) as { pain_score: number | null }[]);
  const painDelta = painAvgNow !== null && painAvgPrev !== null ? painAvgNow - painAvgPrev : null;

  const conditionName = (condition?.name as string | undefined) ?? null;

  return (
    // Téléphone (Philippe, 2026-10-04 : « no scrolling at all ») : les 3
    // chiffres côte à côte, phrases longues masquées, « Zone concernée »
    // ramenée à une ligne sous le titre. Dès sm : inchangé.
    <main className="p-4 pt-5 max-sm:flex max-sm:min-h-[calc(100dvh-5rem-env(safe-area-inset-bottom))] max-sm:flex-col sm:min-h-screen sm:p-8">
      <div className="mx-auto max-w-5xl max-sm:flex max-sm:w-full max-sm:flex-1 max-sm:flex-col">
        <h1 className="text-xl font-semibold text-ink sm:text-2xl">Mes progrès</h1>
        <p className="mt-1 text-xs text-muted sm:text-sm">
          Suivez vos résultats au fil du temps (30 derniers jours).
          {conditionName && <span className="sm:hidden"> Zone : {conditionName}.</span>}
        </p>

        <div className="mt-4 grid grid-cols-3 gap-2 sm:mt-6 sm:gap-4">
          <div className="rounded-xl border border-line bg-surface p-3 shadow-sm sm:p-4">
            <p className="text-xs font-medium text-muted">Adhérence</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-ink sm:text-2xl">{adherenceNow.pct !== null ? `${adherenceNow.pct}%` : "—"}</p>
            {adherenceNow.pct !== null && (
              <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${TONE_BG[adherenceTone(adherenceNow.pct)]}`}>
                {adherenceLabel(adherenceNow.pct)}
              </span>
            )}
            <p className="mt-1 text-xs text-muted sm:hidden">
              {adherenceNow.done}/{adherenceNow.expected} séances
            </p>
            <p className="mt-1 hidden text-xs text-muted sm:block">
              Vous avez suivi {adherenceNow.done} séance{adherenceNow.done > 1 ? "s" : ""} sur {adherenceNow.expected} attendue{adherenceNow.expected > 1 ? "s" : ""}
            </p>
          </div>
          <div className="rounded-xl border border-line bg-surface p-3 shadow-sm sm:p-4">
            <p className="text-xs font-medium text-muted">
              <span className="sm:hidden">Douleur</span>
              <span className="hidden sm:inline">Douleur moyenne</span>
            </p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-ink sm:text-2xl">{painAvgNow !== null ? `${painAvgNow.toFixed(1)}/10` : "—"}</p>
            {painDelta !== null && (
              <p className={`mt-1 text-xs ${painDelta <= 0 ? "text-ok" : "text-danger"}`}>
                {painDelta <= 0 ? "" : "+"}
                {painDelta.toFixed(1)}
                <span className="hidden sm:inline"> vs la période précédente</span>
              </p>
            )}
          </div>
          <div className="rounded-xl border border-line bg-surface p-3 shadow-sm sm:p-4">
            <p className="text-xs font-medium text-muted">
              <span className="sm:hidden">Tendance</span>
              <span className="hidden sm:inline">Adhérence — tendance</span>
            </p>
            <p className={`mt-1 text-xl font-semibold sm:text-2xl tabular-nums ${adherenceDelta !== null && adherenceDelta >= 0 ? "text-ok" : "text-ink"}`}>
              {adherenceDelta !== null ? `${adherenceDelta >= 0 ? "+" : ""}${adherenceDelta}%` : "—"}
            </p>
            <p className="mt-1 text-xs text-muted">
              <span className="sm:hidden">vs 28 j avant</span>
              <span className="hidden sm:inline">vs les 28 jours précédents</span>
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-6 max-sm:flex max-sm:flex-1 max-sm:flex-col sm:mt-6 lg:grid-cols-[1fr_320px]">
          <section className="rounded-2xl border border-line bg-surface p-4 shadow-sm max-sm:flex max-sm:flex-1 max-sm:flex-col sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-ink sm:text-lg">Évolution de la douleur</h2>
              <Link href="/patient/historique" className="flex shrink-0 items-center gap-1 text-sm font-medium text-brand hover:underline">
                <span className="sm:hidden">Historique</span>
                <span className="hidden sm:inline">Historique complet</span>
                <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
              </Link>
            </div>
            <div className="mt-3 max-sm:flex max-sm:flex-1 max-sm:flex-col">
              <FillPainChart series={pain} />
            </div>
          </section>

          {conditionName && (
            <section className="hidden rounded-2xl border border-line bg-surface p-5 shadow-sm sm:block">
              <h2 className="flex items-center gap-1.5 text-lg font-semibold text-ink">
                <MapPin className="h-4 w-4 text-brand" strokeWidth={1.75} />
                Zone concernée
              </h2>
              <p className="mt-3 text-sm text-ink">{conditionName}</p>
              <p className="mt-1 text-xs text-muted">Programme défini par votre praticien.</p>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
