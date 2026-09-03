import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { getInstructor } from "@/lib/dashboard/instructor";
import { startOfWeekISO, daysAgoISO } from "@/lib/week";
import { assessSignals, type ProgressSignals } from "@/lib/exercise/stageProgress";

export default async function DashboardPage() {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  // Everything this page needs is independent of everything else, so one
  // parallel batch replaces the old sequential awaits: total wait time is now
  // roughly the slowest single query instead of the sum of all of them.
  const weekStart = startOfWeekISO();
  const inactiveCutoff = daysAgoISO(7);
  const since = daysAgoISO(14);
  const [instructor, { data: roster }, { data: recentLogs }, { data: painRows }] = await Promise.all([
    getInstructor(supabase, user.id),
    supabase.from("patients").select("id, full_name, created_at"),
    supabase
      .from("workout_logs")
      .select("patient_id, completed_at")
      .gte("completed_at", inactiveCutoff),
    supabase
      .from("patient_feedback")
      .select("patient_id, pain_score, difficulty, created_at")
      .gte("created_at", since),
  ]);
  if (!instructor) redirect("/patient");

  // The roster itself is the patient count — no separate count query needed.
  const patientCount = roster?.length ?? 0;

  // A single 7-day window feeds three numbers. The current week never reaches
  // further back than Monday (at most just under 7 days ago), so these logs
  // cover it entirely; anything older is irrelevant to all three metrics.
  const logs = recentLogs ?? [];
  const weekLogs = logs.filter((l) => l.completed_at >= weekStart);
  const sessionsThisWeek = weekLogs.length;
  const activeThisWeek = new Set(weekLogs.map((l) => l.patient_id)).size;

  // Patients whose recent feedback needs the instructor's eye. Three queries for
  // the whole roster rather than three per patient — RLS already narrows every
  // row to this instructor's own patients.

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
  const alerts = (roster ?? [])
    .map((p) => ({
      id: p.id as string,
      name: (p.full_name as string) ?? "Patient",
      ...assessSignals(signalsByPatient.get(p.id as string) ?? { painScores: [], difficulties: [] }),
    }))
    .filter((a) => a.concerning)
    // Most urgent first, then alphabetically so the order is stable between loads.
    .sort((a, b) => Number(b.severe) - Number(a.severe) || a.name.localeCompare(b.name, "fr"));

  // Patients with no validated session in the last 7 days. Accounts younger
  // than a week are ignored: someone invited yesterday hasn't had time to
  // train yet, and flagging them would just be noise.
  const activeIds = new Set(logs.map((l) => l.patient_id));
  const sevenDaysAgoMs = new Date(inactiveCutoff).getTime();
  const inactive = (roster ?? [])
    .filter(
      (p) =>
        !(p.created_at && new Date(p.created_at as string).getTime() > sevenDaysAgoMs) &&
        !activeIds.has(p.id as string),
    )
    // Alphabetical, like the alert list, so the order is stable between loads.
    .sort((a, b) => ((a.full_name ?? "") as string).localeCompare(((b.full_name ?? "") as string), "fr"));

  const firstName = instructor?.full_name ? instructor.full_name.split(" ")[0] : "";

  const nothingToFlag = alerts.length === 0 && inactive.length === 0;

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-3xl p-6 sm:p-8">
        <div className="animate-[fadeInUp_0.6s_ease-out_both] text-center">
          <h1 className="font-display text-3xl font-semibold leading-tight text-stone-900 sm:text-4xl">
            Bonjour, {firstName}
          </h1>
          <p className="mt-2 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm text-stone-500">
            <span>{patientCount} patient{patientCount > 1 ? "s" : ""}</span>
            <span aria-hidden className="text-stone-300">·</span>
            <span>{activeThisWeek} actif{activeThisWeek > 1 ? "s" : ""} cette semaine</span>
            <span aria-hidden className="text-stone-300">·</span>
            <span>{sessionsThisWeek} séance{sessionsThisWeek > 1 ? "s" : ""} cette semaine</span>
          </p>
        </div>

        {nothingToFlag ? (
          <p className="animate-[fadeInUp_0.6s_ease-out_both] [animation-delay:120ms] mt-10 text-center text-sm text-stone-500">
            Tout va bien, rien à signaler.
            <br />
            <span className="text-stone-400">
              Vous serez prévenu·e dès qu&apos;un patient aura besoin d&apos;attention.
            </span>
          </p>
        ) : (
          <>
            {/* Patients dont les retours récents demandent une attention. */}
            {alerts.length > 0 && (
              <section className="animate-[fadeInUp_0.6s_ease-out_both] [animation-delay:120ms] mt-8 rounded-xl border-y border-r border-stone-200 border-l-[3px] border-l-amber-600 bg-white p-6">
                <h2 className="font-medium text-amber-900">
                  {alerts.length === 1
                    ? "1 patient à surveiller"
                    : `${alerts.length} patients à surveiller`}
                </h2>
                <p className="mt-0.5 text-sm text-amber-800">
                  D&apos;après leurs retours des deux dernières semaines — leur programme a déjà
                  été allégé automatiquement.
                </p>
                <ul className="mt-3 space-y-1.5">
                  {alerts.map((a) => (
                    <li key={a.id}>
                      <Link
                        href={`/dashboard/patients/${a.id}`}
                        className="flex items-baseline justify-between gap-3 rounded-lg px-3 py-2 transition-colors duration-150 hover:bg-amber-50"
                      >
                        <span className="flex items-center gap-1.5 font-medium text-stone-800">
                          {a.severe && (
                            <span
                              title="Situation sévère"
                              className="relative h-2 w-2 shrink-0 rounded-full bg-red-500 animate-[gentlePulse_2.4s_ease-in-out_infinite]"
                            />
                          )}
                          {a.name}
                        </span>
                        <span className="text-right text-sm text-stone-500">{a.cause}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Patients sans séance récente : un rappel doux, distinct de l'alerte
                clinique ci-dessus — ici le problème est l'assiduité, pas la douleur. */}
            {inactive.length > 0 && (
              <section className="animate-[fadeInUp_0.6s_ease-out_both] [animation-delay:200ms] mt-6 rounded-xl border-y border-r border-stone-200 border-l-[3px] border-l-stone-300 bg-white p-6">
                <h2 className="font-medium text-stone-900">
                  {inactive.length === 1
                    ? "1 patient n'ayant pas fait de séance depuis 7 jours"
                    : `${inactive.length} patients n'ayant pas fait de séance depuis 7 jours`}
                </h2>
                <p className="mt-0.5 text-sm text-stone-500">
                  Un petit message de relance suffit souvent à remettre en mouvement.
                </p>
                <ul className="mt-3 space-y-1.5">
                  {inactive.map((p) => (
                    <li key={p.id}>
                      <Link
                        href={`/dashboard/patients/${p.id}`}
                        className="group flex items-center justify-between gap-3 rounded-lg px-3 py-2 transition-colors duration-150 hover:bg-blue-50"
                      >
                        <span className="font-medium text-stone-800">
                          {(p.full_name as string) ?? "Patient"}
                        </span>
                        <ArrowRight className="h-4 w-4 shrink-0 text-stone-400 transition-transform duration-150 group-hover:translate-x-0.5" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
