import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { computeAdherence, adherenceLabel, adherenceTone, ADHERENCE_WINDOW_DAYS } from "@/lib/exercise/adherence";
import { buildPainSeries } from "@/lib/dashboard/painHistory";
import PainHistoryChart from "@/components/PainHistoryChart";

const TONE_BG = { ok: "bg-ok-soft text-ok", warn: "bg-warn-soft text-warn", danger: "bg-danger-soft text-danger", muted: "bg-app-bg text-muted" } as const;

export default async function ProgresPage() {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const now = new Date();
  const since30 = new Date(now.getTime() - 30 * 86_400_000).toISOString();
  const since60 = new Date(now.getTime() - 60 * 86_400_000).toISOString();
  const [{ data: recRows }, { data: logs }, { data: feedback30 }, { data: feedback60 }, { data: patient }] = await Promise.all([
    supabase.from("patient_recommended_workouts").select("created_at, workouts ( times_per_week )").eq("patient_id", user.id),
    supabase.from("workout_logs").select("completed_at").eq("patient_id", user.id),
    supabase.from("patient_feedback").select("pain_score, created_at").eq("patient_id", user.id).gte("created_at", since30),
    supabase.from("patient_feedback").select("pain_score, created_at").eq("patient_id", user.id).gte("created_at", since60).lt("created_at", since30),
    supabase.from("patients").select("condition_id").eq("id", user.id).maybeSingle(),
  ]);
  const { data: condition } = patient?.condition_id
    ? await supabase.from("conditions").select("name").eq("id", patient.condition_id as string).maybeSingle()
    : { data: null };

  const recommendations = (recRows ?? []).map((r) => ({
    timesPerWeek: (r.workouts as unknown as { times_per_week: number | null } | null)?.times_per_week ?? null,
    createdAt: r.created_at as string,
  }));
  const completedAt = (logs ?? []).map((l) => l.completed_at as string);

  const adherenceNow = computeAdherence({ completedAt, recommendations, now });
  const adherencePrev = computeAdherence({ completedAt, recommendations, now: new Date(now.getTime() - ADHERENCE_WINDOW_DAYS * 86_400_000) });
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
    <main className="min-h-screen p-6 sm:p-8">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-2xl font-semibold text-ink">Mes progrès</h1>
        <p className="mt-1 text-sm text-muted">Suivez vos résultats au fil du temps (30 derniers jours).</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-line bg-surface p-4 shadow-sm">
            <p className="text-xs font-medium text-muted">Adhérence</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">{adherenceNow.pct !== null ? `${adherenceNow.pct}%` : "—"}</p>
            {adherenceNow.pct !== null && (
              <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${TONE_BG[adherenceTone(adherenceNow.pct)]}`}>
                {adherenceLabel(adherenceNow.pct)}
              </span>
            )}
            <p className="mt-1 text-xs text-muted">
              Vous avez suivi {adherenceNow.done} séance{adherenceNow.done > 1 ? "s" : ""} sur {adherenceNow.expected} attendue{adherenceNow.expected > 1 ? "s" : ""}
            </p>
          </div>
          <div className="rounded-xl border border-line bg-surface p-4 shadow-sm">
            <p className="text-xs font-medium text-muted">Douleur moyenne</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">{painAvgNow !== null ? `${painAvgNow.toFixed(1)}/10` : "—"}</p>
            {painDelta !== null && (
              <p className={`mt-1 text-xs ${painDelta <= 0 ? "text-ok" : "text-danger"}`}>
                {painDelta <= 0 ? "" : "+"}
                {painDelta.toFixed(1)} vs la période précédente
              </p>
            )}
          </div>
          <div className="rounded-xl border border-line bg-surface p-4 shadow-sm">
            <p className="text-xs font-medium text-muted">Adhérence — tendance</p>
            <p className={`mt-1 text-2xl font-semibold tabular-nums ${adherenceDelta !== null && adherenceDelta >= 0 ? "text-ok" : "text-ink"}`}>
              {adherenceDelta !== null ? `${adherenceDelta >= 0 ? "+" : ""}${adherenceDelta}%` : "—"}
            </p>
            <p className="mt-1 text-xs text-muted">vs les 28 jours précédents</p>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
          <section className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-ink">Évolution de la douleur</h2>
              <Link href="/patient/historique" className="flex items-center gap-1 text-sm font-medium text-brand hover:underline">
                Historique complet
                <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
              </Link>
            </div>
            <div className="mt-3">
              <PainHistoryChart series={pain} />
            </div>
          </section>

          {conditionName && (
            <section className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
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
