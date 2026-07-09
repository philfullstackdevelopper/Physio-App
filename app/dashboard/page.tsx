import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { startOfWeekISO, daysAgoISO } from "@/lib/week";
import { assessSignals, type ProgressSignals } from "@/lib/exercise/stageProgress";
import { signout } from "./actions";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: instructor } = await supabase
    .from("instructors")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();
  if (!instructor) redirect("/patient");

  // How many patients, and how many completed a session this week.
  const { count: patientCount } = await supabase
    .from("patients")
    .select("id", { count: "exact", head: true });

  const { data: weekLogs } = await supabase
    .from("workout_logs")
    .select("patient_id")
    .gte("completed_at", startOfWeekISO());
  const activeThisWeek = new Set((weekLogs ?? []).map((l) => l.patient_id)).size;

  // Patients whose recent feedback needs the instructor's eye. Three queries for
  // the whole roster rather than three per patient — RLS already narrows every
  // row to this instructor's own patients.
  const since = daysAgoISO(14);
  const [{ data: roster }, { data: painRows }, { data: diffRows }] = await Promise.all([
    supabase.from("patients").select("id, full_name"),
    supabase
      .from("patient_feedback")
      .select("patient_id, pain_score, difficulty, created_at")
      .gte("created_at", since),
    supabase
      .from("exercise_feedback")
      .select("patient_id, difficulty, created_at")
      .gte("created_at", since),
  ]);

  const signalsByPatient = new Map<string, ProgressSignals>();
  const bucket = (pid: string) => {
    let b = signalsByPatient.get(pid);
    if (!b) signalsByPatient.set(pid, (b = { painScores: [], difficulties: [] }));
    return b;
  };
  for (const r of painRows ?? []) {
    const b = bucket(r.patient_id as string);
    const at = r.created_at as string;
    if (r.pain_score != null) b.painScores.push({ value: r.pain_score as number, at });
    if (r.difficulty != null) b.difficulties.push({ value: r.difficulty as number, at });
  }
  for (const r of diffRows ?? []) {
    if (r.difficulty != null) {
      bucket(r.patient_id as string).difficulties.push({
        value: r.difficulty as number,
        at: r.created_at as string,
      });
    }
  }

  const alerts = (roster ?? [])
    .map((p) => ({
      id: p.id as string,
      name: (p.full_name as string) ?? "Patient",
      ...assessSignals(signalsByPatient.get(p.id as string) ?? { painScores: [], difficulties: [] }),
    }))
    .filter((a) => a.concerning)
    // Most urgent first, then alphabetically so the order is stable between loads.
    .sort((a, b) => Number(b.severe) - Number(a.severe) || a.name.localeCompare(b.name, "fr"));

  return (
    <main className="min-h-screen bg-slate-50 p-6 sm:p-8">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-teal-700">Tableau de bord</p>
            <h1 className="font-display text-4xl font-semibold leading-tight text-slate-900 sm:text-5xl">
              Bonjour, {instructor?.full_name ? instructor.full_name.split(" ")[0] : ""} 👋
            </h1>
          </div>
          <form action={signout}>
            <button
              type="submit"
              className="shrink-0 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Se déconnecter
            </button>
          </form>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="text-3xl font-semibold text-slate-900 tabular-nums">{patientCount ?? 0}</div>
            <div className="mt-0.5 text-sm text-slate-500">Patients</div>
          </div>
          <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="text-3xl font-semibold text-teal-700 tabular-nums">{activeThisWeek}</div>
            <div className="mt-0.5 text-sm text-slate-500">Actifs cette semaine</div>
          </div>
        </div>

        {/* Patients dont les retours récents demandent une attention. */}
        {alerts.length > 0 && (
          <section className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5">
            <h2 className="font-medium text-amber-900">
              {alerts.length === 1
                ? "1 patient à surveiller"
                : `${alerts.length} patients à surveiller`}
            </h2>
            <p className="mt-0.5 text-sm text-amber-800">
              D&apos;après leurs retours des 14 derniers jours. Leur programme a déjà été allégé
              automatiquement.
            </p>
            <ul className="mt-3 space-y-1.5">
              {alerts.map((a) => (
                <li key={a.id}>
                  <Link
                    href={`/dashboard/patients/${a.id}`}
                    className="flex items-baseline justify-between gap-3 rounded-lg bg-white px-3 py-2 shadow-sm transition hover:bg-amber-100/50"
                  >
                    <span className="font-medium text-slate-800">
                      {a.severe && <span title="Situation sévère">🔴 </span>}
                      {a.name}
                    </span>
                    <span className="text-right text-sm text-slate-500">{a.cause}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <Link
          href="/dashboard/patients"
          className="mt-6 flex items-center justify-between rounded-xl bg-teal-600 px-5 py-4 font-medium text-white shadow-sm transition hover:bg-teal-700"
        >
          <span>Mes patients</span>
          <span>→</span>
        </Link>

        <Link
          href="/dashboard/seances"
          className="mt-3 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-4 font-medium text-slate-800 shadow-sm transition hover:bg-slate-50"
        >
          <span>Mes séances (composer les exercices)</span>
          <span className="text-slate-400">→</span>
        </Link>
      </div>
    </main>
  );
}
