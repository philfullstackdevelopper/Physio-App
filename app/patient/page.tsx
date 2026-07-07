import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { startOfWeekISO } from "@/lib/week";
import { signout } from "./actions";

type Workout = {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number | null;
  times_per_week: number | null;
};

export default async function PatientHome() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: patient } = await supabase
    .from("patients")
    .select("full_name, condition_id, recommended_workout_id")
    .eq("id", user.id)
    .maybeSingle();

  const { data: condition } = patient?.condition_id
    ? await supabase.from("conditions").select("name").eq("id", patient.condition_id).maybeSingle()
    : { data: null };

  let workouts: Workout[] = [];
  const weekCount: Record<string, number> = {};
  if (patient?.condition_id) {
    const { data } = await supabase
      .from("workouts")
      .select("id, name, description, duration_minutes, times_per_week")
      .eq("condition_id", patient.condition_id)
      .order("duration_minutes");
    workouts = (data ?? []) as Workout[];

    const { data: logs } = await supabase
      .from("workout_logs")
      .select("workout_id")
      .eq("patient_id", user.id)
      .gte("completed_at", startOfWeekISO());
    for (const l of logs ?? []) weekCount[l.workout_id] = (weekCount[l.workout_id] ?? 0) + 1;
  }

  // Recommended workout first, then by duration.
  const recId = patient?.recommended_workout_id;
  const ordered = [...workouts].sort((a, b) => (a.id === recId ? -1 : b.id === recId ? 1 : 0));

  return (
    <main className="min-h-screen p-6 sm:p-8">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-900">
            Bonjour{patient?.full_name ? `, ${patient.full_name.split(" ")[0]}` : ""} 👋
          </h1>
          <form action={signout}>
            <button
              type="submit"
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Se déconnecter
            </button>
          </form>
        </div>

        {condition?.name && (
          <p className="mt-1 text-sm text-slate-500">
            Votre programme : <span className="font-medium text-slate-700">{condition.name}</span>
          </p>
        )}

        {!patient?.condition_id ? (
          <div className="mt-8 rounded-xl border border-slate-100 bg-white p-6 text-center text-sm text-slate-500 shadow-sm">
            Votre physiothérapeute n&apos;a pas encore configuré votre programme. Revenez bientôt !
          </div>
        ) : (
          <>
            <h2 className="mt-8 text-lg font-medium text-slate-900">Choisissez votre séance</h2>
            <div className="mt-4 space-y-4">
              {ordered.map((w) => {
                const isRec = w.id === recId;
                const done = weekCount[w.id] ?? 0;
                const target = w.times_per_week ?? 0;
                return (
                  <Link
                    key={w.id}
                    href={`/patient/${w.id}`}
                    className={`block rounded-xl border bg-white p-5 shadow-sm transition hover:shadow-md ${
                      isRec ? "border-teal-500 ring-1 ring-teal-500" : "border-slate-100"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-900">{w.name}</h3>
                      {isRec && (
                        <span className="rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-700">
                          Recommandée par votre physio
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      {w.duration_minutes} min · {w.times_per_week}×/semaine
                    </p>
                    {w.description && <p className="mt-1 text-sm text-slate-500">{w.description}</p>}
                    <div className="mt-3 flex items-center gap-2">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-teal-500"
                          style={{ width: `${target ? Math.min(100, (done / target) * 100) : 0}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-400">
                        {done}/{target} cette semaine
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
