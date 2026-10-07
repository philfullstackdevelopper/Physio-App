import Link from "next/link";
import { Activity, ArrowDown, ArrowRight, ArrowUp, LineChart, MapPin, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { computeAdherence, adherenceLabel, adherenceTone, ADHERENCE_WINDOW_DAYS } from "@/lib/exercise/adherence";
import { buildPainSeries } from "@/lib/dashboard/painHistory";
import FillPainChart from "@/components/FillPainChart";
import { WeekFrise } from "@/components/PatientJourney";
import { loadPatientJourney } from "@/lib/patient/journey";

const TONE_BG = { ok: "bg-ok-soft text-ok", warn: "bg-warn-soft text-warn", danger: "bg-danger-soft text-danger", muted: "bg-app-bg text-muted" } as const;

// Téléphone (Philippe, 2026-10-06, maquette fournie) : chaque tuile a son
// icône dans une pastille de couleur ; pour l'adhérence, un petit anneau qui
// montre le même pourcentage que le chiffre. Rien de nouveau, juste lisible.
function AdherenceRing({ pct }: { pct: number | null }) {
  const c = 2 * Math.PI * 13;
  return (
    <svg viewBox="0 0 32 32" className="h-8 w-8 -rotate-90" aria-hidden>
      <circle cx="16" cy="16" r="13" fill="none" stroke="currentColor" strokeWidth="4" className="text-ok-soft" />
      <circle
        cx="16"
        cy="16"
        r="13"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        className="text-ok"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - Math.min(Math.max(pct ?? 0, 0), 100) / 100)}
      />
    </svg>
  );
}

const PHONE_TILE = "max-sm:rounded-2xl max-sm:border-0 max-sm:shadow-soft";

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
  // Téléphone : la frise (semaine en cours + semaines passées) vit ici.
  const journey = await loadPatientJourney(supabase, user.id);
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
  // Téléphone : on ne montre que les tuiles qui ont un chiffre, et le
  // graphique seulement s'il y a au moins une douleur notée.
  const phoneTileCount = [adherenceNow.pct, painAvgNow, adherenceDelta].filter((v) => v !== null).length;
  const hasPain = (feedback30 ?? []).some((f) => f.pain_score != null);

  return (
    // Téléphone (Philippe, 2026-10-07) : « Mes progrès » devient mon parcours
    // et défile — chiffres et courbe de douleur d'abord (comme la maquette),
    // puis la frise : semaine en cours dépliée (CurrentWeekTimeline) et
    // semaines précédentes (PastWeeks). Seule page patient qui défile, à sa demande. Dès sm :
    // inchangé.
    <main className="p-4 pt-5 max-sm:pb-8 max-sm:pt-2 sm:min-h-screen sm:p-8">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-2xl font-semibold text-ink">Mes progrès</h1>
        <p className="mt-1 text-sm text-muted max-sm:mt-0.5">
          Suivez vos résultats au fil du temps (30 derniers jours).
          {conditionName && <span className="sm:hidden"> Zone : {conditionName}.</span>}
        </p>
        {/* Téléphone sans douleur enregistrée : la carte du graphique (seul lien
            vers l'historique) est masquée — on garde l'accès ici (Philippe,
            2026-10-07). Dès sm : rien de nouveau. */}
        {!hasPain && (
          <Link
            href="/patient/historique"
            className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline sm:hidden"
          >
            Historique
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
          </Link>
        )}

        {/* Téléphone : aucune donnée encore → une phrase au lieu de tuiles « — »
            (Philippe, 2026-10-06 : « don't add stats if there are none »). */}
        {phoneTileCount === 0 && !hasPain && (
          <div className="mt-3 flex flex-col items-center justify-center rounded-2xl bg-surface p-6 text-center shadow-soft sm:hidden">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-brand">
              <LineChart className="h-6 w-6" strokeWidth={1.75} />
            </span>
            <p className="mt-3 text-base font-semibold text-ink">Pas encore de résultats</p>
            <p className="mt-1 text-sm text-muted">Vos progrès apparaîtront ici après vos premières séances.</p>
          </div>
        )}

        <div
          className={`mt-4 grid grid-cols-3 gap-2 max-sm:mt-3 sm:mt-6 sm:gap-4 ${
            phoneTileCount === 0 ? "max-sm:hidden" : phoneTileCount === 1 ? "max-sm:grid-cols-1" : phoneTileCount === 2 ? "max-sm:grid-cols-2" : ""
          }`}
        >
          <div className={`rounded-xl border border-line bg-surface p-3 shadow-sm sm:p-4 ${PHONE_TILE} ${adherenceNow.pct === null ? "max-sm:hidden" : ""}`}>
            <span className="mb-2 block sm:hidden">
              <AdherenceRing pct={adherenceNow.pct} />
            </span>
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
          <div className={`rounded-xl border border-line bg-surface p-3 shadow-sm sm:p-4 ${PHONE_TILE} ${painAvgNow === null ? "max-sm:hidden" : ""}`}>
            <span className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-brand-soft text-brand sm:hidden">
              <Activity className="h-4 w-4" strokeWidth={2} />
            </span>
            <p className="text-xs font-medium text-muted">
              <span className="sm:hidden">Douleur</span>
              <span className="hidden sm:inline">Douleur moyenne</span>
            </p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-ink sm:text-2xl">{painAvgNow !== null ? (
                <>
                  {painAvgNow.toFixed(1)}
                  <span className="max-sm:text-sm max-sm:font-medium max-sm:text-muted">/10</span>
                </>
              ) : (
                "—"
              )}</p>
            {painDelta !== null && (
              <p className={`mt-1 flex items-center gap-0.5 text-xs sm:block ${painDelta <= 0 ? "text-ok" : "text-danger"}`}>
                {painDelta <= 0 ? (
                  <ArrowDown className="h-3 w-3 sm:hidden" strokeWidth={2.5} />
                ) : (
                  <ArrowUp className="h-3 w-3 sm:hidden" strokeWidth={2.5} />
                )}
                {painDelta <= 0 ? "" : "+"}
                {painDelta.toFixed(1)}
                <span className="hidden sm:inline"> vs la période précédente</span>
              </p>
            )}
          </div>
          <div className={`rounded-xl border border-line bg-surface p-3 shadow-sm sm:p-4 ${PHONE_TILE} ${adherenceDelta === null ? "max-sm:hidden" : ""}`}>
            <span className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-violet-soft text-violet sm:hidden">
              <TrendingUp className="h-4 w-4" strokeWidth={2} />
            </span>
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

        <div className="mt-4 grid gap-6 max-sm:mt-3 sm:mt-6 lg:grid-cols-[1fr_320px]">
          <section
            className={`rounded-2xl border border-line bg-surface p-4 shadow-sm max-sm:rounded-3xl max-sm:border-0 max-sm:shadow-soft sm:p-5 ${
              hasPain ? "" : "max-sm:hidden"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-base font-semibold text-ink sm:text-lg">
                <LineChart className="h-4 w-4 text-brand sm:hidden" strokeWidth={2} />
                Évolution de la douleur
              </h2>
              <Link href="/patient/historique" className="flex shrink-0 items-center gap-1 text-sm font-medium text-brand hover:underline">
                <span className="sm:hidden">Historique</span>
                <span className="hidden sm:inline">Historique complet</span>
                <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
              </Link>
            </div>
            {/* Téléphone : hauteur fixe, la page défile désormais. */}
            <div className="mt-3 max-sm:flex max-sm:h-56 max-sm:flex-col">
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

        {/* Téléphone : ordre de la maquette — chiffres et graphe d'abord, puis la
            frise (semaine en cours dépliée, puis semaines passées). */}
        <WeekFrise weeks={journey.weeks} currentWeekNumber={journey.currentWeekNumber} dayDetails={journey.dayDetails} />
      </div>
    </main>
  );
}
