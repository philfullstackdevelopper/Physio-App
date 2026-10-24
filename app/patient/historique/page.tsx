import HistoriqueView from "./HistoriqueView";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { formatHistoryDay } from "@/lib/patient/historyWindow";

type LogRow = {
  id: string;
  completed_at: string;
  workouts: { name: string } | null;
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export default async function HistoriquePage() {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const { data } = await supabase
    .from("workout_logs")
    .select("id, completed_at, workouts ( name )")
    .eq("patient_id", user.id)
    .order("completed_at", { ascending: false })
    .limit(200);
  const logs = (data ?? []) as unknown as LogRow[];

  // Group by day for a readable list — most recent day first.
  const groups: { day: string; logs: LogRow[] }[] = [];
  for (const log of logs) {
    const day = formatHistoryDay(log.completed_at);
    const group = groups.find((g) => g.day === day);
    if (group) group.logs.push(log);
    else groups.push({ day, logs: [log] });
  }

  // Plus d'offres patient (2026-10-24) : tout l'historique est visible.
  const historyDaysVisible: number | null = null;
  const visibleGroups = historyDaysVisible === null ? groups : groups.slice(0, historyDaysVisible);
  const lockedGroups = historyDaysVisible === null ? [] : groups.slice(historyDaysVisible);

  const toView = (g: { day: string; logs: LogRow[] }) => ({
    day: g.day,
    logs: g.logs.map((log) => ({ id: log.id, name: log.workouts?.name ?? "Séance", time: formatTime(log.completed_at) })),
  });

  return <HistoriqueView groups={visibleGroups.map(toView)} lockedDays={lockedGroups.map((g) => g.day)} />;
}
