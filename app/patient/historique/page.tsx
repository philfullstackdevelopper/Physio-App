import Link from "next/link";
import { ChevronRight, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { getTierBilling } from "@/lib/billing/context";
import { TIERS, isTierKey } from "@/lib/billing/plans";

type LogRow = {
  id: string;
  completed_at: string;
  workouts: { name: string } | null;
};

function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export default async function HistoriquePage() {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const [{ data }, billing] = await Promise.all([
    supabase
      .from("workout_logs")
      .select("id, completed_at, workouts ( name )")
      .eq("patient_id", user.id)
      .order("completed_at", { ascending: false })
      .limit(200),
    getTierBilling(supabase, user.id),
  ]);
  const logs = (data ?? []) as unknown as LogRow[];

  // Group by day for a readable list — most recent day first.
  const groups: { day: string; logs: LogRow[] }[] = [];
  for (const log of logs) {
    const day = formatDay(log.completed_at);
    const group = groups.find((g) => g.day === day);
    if (group) group.logs.push(log);
    else groups.push({ day, logs: [log] });
  }

  // Offre du patient -> combien de jours (groupes) en clair avant verrou.
  // Plan inconnu/historique (patient_monthly, grandfathering) = illimité,
  // pas de mauvaise surprise sur un abonnement qui n'a jamais eu cette règle.
  const historyDaysVisible = isTierKey(billing.subPlan) ? TIERS[billing.subPlan].historyDaysVisible : null;
  const visibleGroups = historyDaysVisible === null ? groups : groups.slice(0, historyDaysVisible);
  const lockedGroups = historyDaysVisible === null ? [] : groups.slice(historyDaysVisible);

  return (
    <main className="min-h-screen p-6 sm:p-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="font-display text-3xl font-semibold text-slate-900">Historique</h1>
        <p className="mt-1 text-sm text-slate-500">Toutes vos séances terminées.</p>

        {logs.length === 0 ? (
          <div className="mt-8 rounded-xl border border-slate-100 bg-white p-6 text-center text-sm text-slate-500 shadow-sm">
            Aucune séance terminée pour le moment.
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            {visibleGroups.map((g) => (
              <div key={g.day}>
                <h2 className="text-sm font-medium capitalize text-slate-500">{g.day}</h2>
                <div className="mt-2 space-y-2">
                  {g.logs.map((log) => (
                    <Link
                      key={log.id}
                      href={`/patient/historique/${log.id}`}
                      className="flex items-center justify-between rounded-xl border border-slate-100 bg-white px-4 py-3.5 shadow-sm transition hover:shadow-md"
                    >
                      <div>
                        <p className="font-medium text-slate-900">{log.workouts?.name ?? "Séance"}</p>
                        <p className="text-xs text-slate-400">{formatTime(log.completed_at)}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" strokeWidth={2} />
                    </Link>
                  ))}
                </div>
              </div>
            ))}

            {lockedGroups.length > 0 && (
              <div>
                <h2 className="text-sm font-medium capitalize text-slate-400">
                  {lockedGroups.length} jour{lockedGroups.length > 1 ? "s" : ""} plus ancien
                  {lockedGroups.length > 1 ? "s" : ""}
                </h2>
                <div className="mt-2 space-y-2">
                  {lockedGroups.map((g) => (
                    <div
                      key={g.day}
                      className="flex items-center justify-between rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3.5"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200/70 text-slate-400">
                          <Lock className="h-3.5 w-3.5" strokeWidth={2} />
                        </span>
                        <p className="text-sm font-medium capitalize text-slate-400">{g.day}</p>
                      </div>
                      <Link
                        href="/patient/compte"
                        className="shrink-0 text-xs font-semibold text-brand hover:underline"
                      >
                        Passez à Standard pour avoir accès à cette partie !
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
