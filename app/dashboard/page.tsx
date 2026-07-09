import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { startOfWeekISO } from "@/lib/week";
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
