import Link from "next/link";
import { redirect } from "next/navigation";
import { Users, Flame, UsersRound, Dumbbell, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { startOfWeekISO, daysAgoISO } from "@/lib/week";
import { assessSignals, type ProgressSignals } from "@/lib/exercise/stageProgress";

export default async function DashboardPage() {
  const supabase = await createClient();
  const user = await requireUser(supabase);

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

  const firstName = instructor?.full_name ? instructor.full_name.split(" ")[0] : "";

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#faf7f2]">
      {/* Warm ambient background, matching the rest of the app */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-20"
        style={{
          background:
            "radial-gradient(900px 500px at 10% -10%, #ccfbf1 0%, transparent 55%)," +
            "radial-gradient(800px 500px at 100% 0%, #fde9d9 0%, transparent 50%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-40"
        style={{
          backgroundImage: "radial-gradient(rgba(15, 118, 110, 0.14) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
          maskImage: "radial-gradient(900px 500px at 50% 0%, black 0%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(900px 500px at 50% 0%, black 0%, transparent 75%)",
        }}
      />

      <div className="mx-auto max-w-3xl p-6 sm:p-8">
        <div className="text-center">
          <span className="inline-flex items-center rounded-full border border-teal-100 bg-white/70 px-3 py-1 text-xs font-medium text-teal-700 shadow-sm backdrop-blur">
            Tableau de bord
          </span>
          <h1 className="font-display mt-3 text-4xl font-semibold leading-tight text-slate-900 sm:text-5xl">
            Bonjour, {firstName}
          </h1>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4">
          <div className="rounded-2xl border border-slate-100 bg-white/90 p-6 shadow-sm backdrop-blur">
            <Users className="h-6 w-6 text-slate-400" strokeWidth={1.75} />
            <div className="mt-3 text-3xl font-semibold text-slate-900 tabular-nums">
              {patientCount ?? 0}
            </div>
            <div className="mt-0.5 text-sm text-slate-500">Patients</div>
          </div>
          <div className="rounded-2xl border border-teal-100 bg-white/90 p-6 shadow-sm backdrop-blur">
            <Flame className="h-6 w-6 text-teal-600" strokeWidth={1.75} />
            <div className="mt-3 text-3xl font-semibold text-teal-700 tabular-nums">
              {activeThisWeek}
            </div>
            <div className="mt-0.5 text-sm text-slate-500">Actifs cette semaine</div>
          </div>
        </div>

        {/* Patients dont les retours récents demandent une attention. */}
        {alerts.length > 0 && (
          <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
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
                    <span className="flex items-center gap-1.5 font-medium text-slate-800">
                      {a.severe && (
                        <span
                          title="Situation sévère"
                          className="h-2 w-2 shrink-0 rounded-full bg-red-500"
                        />
                      )}
                      {a.name}
                    </span>
                    <span className="text-right text-sm text-slate-500">{a.cause}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Link
            href="/dashboard/patients"
            className="group flex flex-col rounded-2xl border border-teal-600 bg-teal-600 p-6 text-white shadow-sm transition hover:bg-teal-700"
          >
            <UsersRound className="h-6 w-6" strokeWidth={1.75} />
            <span className="font-display mt-3 text-lg font-semibold">Mes patients</span>
            <span className="mt-1 flex-1 text-sm text-teal-50">
              Suivez leur assiduité, ajustez leur programme.
            </span>
            <span className="mt-4 flex items-center gap-1 text-sm font-medium">
              Ouvrir
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </span>
          </Link>

          <Link
            href="/dashboard/seances"
            className="group flex flex-col rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur transition hover:shadow-md"
          >
            <Dumbbell className="h-6 w-6 text-teal-700" strokeWidth={1.75} />
            <span className="font-display mt-3 text-lg font-semibold text-slate-900">
              Mes séances
            </span>
            <span className="mt-1 flex-1 text-sm text-slate-500">
              Composez, dupliquez ou retrouvez vos séances.
            </span>
            <span className="mt-4 flex items-center gap-1 text-sm font-medium text-teal-700">
              Ouvrir
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </span>
          </Link>
        </div>
      </div>
    </main>
  );
}
