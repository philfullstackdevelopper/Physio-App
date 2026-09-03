import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowDown, ArrowUp, ChevronRight, Lightbulb, Minus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { getInstructor } from "@/lib/dashboard/instructor";
import { loadDashboardHome, type Tile } from "@/lib/dashboard/homeData";

function Delta({ tile }: { tile: Tile }) {
  if (tile.delta === null) return null;
  if (tile.delta === 0) return <span className="flex items-center gap-1 text-xs text-muted"><Minus className="h-3 w-3" strokeWidth={2} />= hier</span>;
  const up = tile.delta > 0;
  return (
    <span className={`flex items-center gap-1 text-xs ${up ? "text-ok" : "text-danger"}`}>
      {up ? <ArrowUp className="h-3 w-3" strokeWidth={2} /> : <ArrowDown className="h-3 w-3" strokeWidth={2} />}
      {Math.abs(tile.delta)} vs hier
    </span>
  );
}

function StatTile({ value, label, tone, tile }: { value: number; label: string; tone: "ok" | "danger" | "warn" | "ink"; tile?: Tile }) {
  const color = { ok: "text-ok", danger: "text-danger", warn: "text-warn", ink: "text-ink" }[tone];
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <p className={`text-3xl font-semibold tabular-nums ${color}`}>{value}</p>
      <p className="mt-1 text-sm text-ink">{label}</p>
      <div className="mt-1 h-4">{tile && <Delta tile={tile} />}</div>
    </div>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  if (!(await getInstructor(supabase, user.id))) redirect("/patient");

  const h = await loadDashboardHome(supabase, user.id);

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-5xl p-6 sm:p-8">
        <div className="animate-[fadeInUp_0.6s_ease-out_both] flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-2xl font-semibold text-ink">Bonjour {h.firstName}</h1>
          <p className="text-sm text-muted">{h.todayLabel}</p>
        </div>

        <div className="animate-[fadeInUp_0.6s_ease-out_both] [animation-delay:120ms] mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatTile value={h.sessionsToday.value} label="Séances faites" tone="ok" tile={h.sessionsToday} />
          <StatTile value={h.painToday.value} label="Douleurs signalées" tone="danger" tile={h.painToday} />
          <StatTile value={h.inactiveCount} label="Sans activité récente" tone="warn" />
          <StatTile value={h.patientCount} label="Patients suivis" tone="ink" />
        </div>

        <div className="animate-[fadeInUp_0.6s_ease-out_both] [animation-delay:200ms] mt-8 grid gap-8 lg:grid-cols-2">
          <section>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink">À traiter aujourd&apos;hui</h2>
              {h.surveillerCount > 0 && (
                <Link href="/dashboard/patients?filtre=surveiller" className="text-xs font-medium text-brand hover:underline">
                  Voir tout ({h.surveillerCount})
                </Link>
              )}
            </div>
            {h.toTreat.length === 0 ? (
              <p className="mt-3 rounded-xl border border-line bg-surface p-6 text-center text-sm text-muted">Rien à traiter aujourd&apos;hui.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {h.toTreat.map((r) => (
                  <li key={r.id}>
                    <Link
                      href={`/dashboard/patients/${r.id}`}
                      className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
                        r.kind === "pain" ? "border-danger-soft bg-danger-soft hover:border-danger/30" : "border-line bg-surface hover:bg-app-bg"
                      }`}
                    >
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${r.kind === "pain" ? "bg-surface text-danger" : "bg-warn-soft text-warn"}`}>
                        {r.initials}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                          {r.severe && <span className="h-1.5 w-1.5 rounded-full bg-danger animate-[gentlePulse_2.4s_ease-in-out_infinite]" title="Situation sévère" />}
                          {r.name}
                        </span>
                        <span className={`block text-xs ${r.kind === "pain" ? "text-danger" : "text-warn"}`}>{r.label}</span>
                      </span>
                      {r.score !== null && <span className="text-sm font-semibold tabular-nums text-danger">{r.score}/10</span>}
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.75} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink">Activité récente</h2>
              {h.recent.length > 0 && (
                <Link href="/dashboard/patients" className="text-xs font-medium text-brand hover:underline">Voir tout ({h.patientCount})</Link>
              )}
            </div>
            {h.recent.length === 0 ? (
              <p className="mt-3 rounded-xl border border-line bg-surface p-6 text-center text-sm text-muted">Aucune séance cette semaine.</p>
            ) : (
              <ul className="mt-3 divide-y divide-line rounded-xl border border-line bg-surface">
                {h.recent.map((r) => (
                  <li key={r.logId}>
                    <Link href={`/dashboard/patients/${r.patientId}`} className="flex items-center gap-3 px-3 py-2.5 hover:bg-app-bg">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ok-soft text-[11px] font-semibold text-ok">{r.initials}</span>
                      <span className="min-w-0 flex-1 truncate text-sm text-ink"><span className="font-semibold">{r.name}</span> a terminé sa séance</span>
                      <span className="shrink-0 text-xs text-muted">{r.whenLabel}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {h.banner && (
          <p className="animate-[fadeInUp_0.6s_ease-out_both] [animation-delay:280ms] mt-8 flex items-center gap-2 rounded-xl bg-brand-soft px-4 py-3 text-sm text-brand">
            <Lightbulb className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            {h.banner}
          </p>
        )}
      </div>
    </main>
  );
}
