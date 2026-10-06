import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowDown, ArrowUp, ChevronRight, Minus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { getInstructor } from "@/lib/dashboard/instructor";
import { loadDashboardHome, type Tile } from "@/lib/dashboard/homeData";
import { loadUnreadMessages } from "@/lib/dashboard/unreadMessages";
import { relativeDay } from "@/lib/format/relativeDay";
import { initials } from "@/lib/format/initials";

// 4 lignes par colonne : au-delà, « Voir tout ». Avec ces limites l'accueil
// tient dans ~480 px de haut (PC de Philippe : 549 px utiles).
const TO_TREAT_LIMIT = 4;
const UNREAD_LIMIT = 4;

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

// Une cellule de la barre d'indicateurs : valeur + libellé + écart sur une
// seule ligne (même principe que la barre de la fiche patient), pour que
// l'accueil tienne sur un écran sans scroller (Philippe, 2026-10-02).
function StatTile({ value, label, tone, tile }: { value: number; label: string; tone: "ok" | "danger" | "warn" | "ink"; tile?: Tile }) {
  const color = { ok: "text-ok", danger: "text-danger", warn: "text-warn", ink: "text-ink" }[tone];
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 px-4 py-3">
      <p className={`text-2xl font-semibold tabular-nums ${color}`}>{value}</p>
      <p className="text-sm text-ink">{label}</p>
      {tile && <Delta tile={tile} />}
    </div>
  );
}

// Case carrée de la version téléphone (grille 2 × 2).
function PhoneSquare({ value, label, tone, tile }: { value: number; label: string; tone: "ok" | "danger" | "warn" | "ink"; tile?: Tile }) {
  const color = { ok: "text-ok", danger: "text-danger", warn: "text-warn", ink: "text-ink" }[tone];
  return (
    <div className="flex aspect-square flex-col justify-between rounded-2xl border border-line bg-surface p-4">
      <p className={`text-4xl font-semibold tabular-nums ${color}`}>{value}</p>
      <div>
        <p className="text-sm font-medium text-ink">{label}</p>
        {tile && <div className="mt-0.5"><Delta tile={tile} /></div>}
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  if (!(await getInstructor(supabase, user.id))) redirect("/patient");

  const h = await loadDashboardHome(supabase, user.id);
  const unread = await loadUnreadMessages(supabase, user.id);
  // Une ligne par patient : on garde le message le plus récent de chacun.
  const unreadByPatient = new Map<string, (typeof unread)[number]>();
  for (const m of unread) {
    const existing = unreadByPatient.get(m.patientId);
    if (!existing || m.createdAt > existing.createdAt) unreadByPatient.set(m.patientId, m);
  }
  const unreadRows = [...unreadByPatient.values()].sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));
  const nothingToFollow = unreadRows.length === 0 && h.toTreat.length === 0;

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-7xl px-6 py-5 sm:px-8 sm:py-6">
        <div className="animate-[fadeInUp_0.6s_ease-out_both] flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-2xl font-semibold text-ink">Bonjour {h.firstName}</h1>
          <p className="text-sm text-muted">{h.todayLabel}</p>
        </div>

        {/* Téléphone : 4 cases carrées en 2 × 2, sans scroller (Philippe,
            2026-10-02). La 4e case résume les patients à suivre et ouvre la
            liste filtrée ; la barre et les listes ci-dessous sont réservées
            aux écrans plus larges. */}
        <section aria-label="Aujourd'hui" className="animate-[fadeInUp_0.6s_ease-out_both] [animation-delay:120ms] mt-4 grid grid-cols-2 gap-3 sm:hidden">
          <PhoneSquare value={h.sessionsToday.value} label="Séances faites aujourd'hui" tone="ok" tile={h.sessionsToday} />
          <PhoneSquare value={h.painToday.value} label="Douleurs signalées" tone="danger" tile={h.painToday} />
          <PhoneSquare value={h.patientCount} label="Patients suivis" tone="ink" />
          <Link
            href="/dashboard/patients?filtre=surveiller"
            className={`flex aspect-square flex-col justify-between rounded-2xl border p-4 transition-colors ${
              h.surveillerCount > 0 ? "border-warn-soft bg-warn-soft" : "border-line bg-surface"
            }`}
          >
            <p className={`text-4xl font-semibold tabular-nums ${h.surveillerCount > 0 ? "text-warn" : "text-ink"}`}>{h.surveillerCount}</p>
            <div>
              <p className="flex items-center gap-1 text-sm font-medium text-ink">
                Patients à suivre <ChevronRight className="h-4 w-4 shrink-0" strokeWidth={2} />
              </p>
              {unreadRows.length > 0 && (
                <p className="mt-0.5 text-xs text-muted">
                  {unreadRows.length} message{unreadRows.length > 1 ? "s" : ""} non lu{unreadRows.length > 1 ? "s" : ""}
                </p>
              )}
            </div>
          </Link>
        </section>

        {/* 1 — Aujourd'hui : les chiffres du jour, en une barre fine. */}
        <section
          aria-label="Aujourd'hui"
          className="animate-[fadeInUp_0.6s_ease-out_both] [animation-delay:120ms] mt-4 hidden divide-line rounded-xl border border-line bg-surface sm:grid sm:grid-cols-3 sm:divide-x"
        >
          <StatTile value={h.sessionsToday.value} label="Séances faites aujourd'hui" tone="ok" tile={h.sessionsToday} />
          <StatTile value={h.painToday.value} label="Douleurs signalées" tone="danger" tile={h.painToday} />
          <StatTile value={h.patientCount} label="Patients suivis" tone="ink" />
        </section>

        {/* 2 — Patients à suivre : ce qui demande une action, priorité clinique
            d'abord. « À traiter » et « Messages non lus » côte à côte dès lg. */}
        <section className="animate-[fadeInUp_0.6s_ease-out_both] [animation-delay:200ms] mt-4 hidden rounded-xl border border-line bg-surface p-5 sm:block">
          <h2 className="text-lg font-semibold text-ink">Patients à suivre</h2>

          {nothingToFollow ? (
            <p className="mt-3 text-sm text-muted">Aucun patient ne nécessite d&apos;attention pour l&apos;instant.</p>
          ) : (
            <div className="mt-3 grid gap-5 lg:grid-cols-2">
              {h.toTreat.length > 0 && (
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-medium uppercase tracking-wide text-muted">À traiter</h3>
                    {h.surveillerCount > TO_TREAT_LIMIT && (
                      <Link href="/dashboard/patients?filtre=surveiller" className="text-xs font-medium text-brand hover:underline">
                        Voir tout ({h.surveillerCount})
                      </Link>
                    )}
                  </div>
                  <ul className="mt-2 space-y-2">
                    {h.toTreat.slice(0, TO_TREAT_LIMIT).map((r) => (
                      <li key={r.id}>
                        <Link
                          href={`/dashboard/patients/${r.id}`}
                          className={`flex items-center gap-3 rounded-xl border px-3 py-2 transition-colors ${
                            r.kind === "pain" ? "border-danger-soft bg-danger-soft hover:border-danger/30" : "border-line bg-app-bg hover:bg-line"
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
                </div>
              )}

              {unreadRows.length > 0 && (
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-medium uppercase tracking-wide text-muted">Messages non lus</h3>
                    {unreadRows.length > UNREAD_LIMIT && (
                      <Link href="/dashboard/messages" className="text-xs font-medium text-brand hover:underline">
                        Voir tout
                      </Link>
                    )}
                  </div>
                  <ul className="mt-2 divide-y divide-line rounded-xl border border-line">
                    {unreadRows.slice(0, UNREAD_LIMIT).map((m) => (
                      <li key={m.patientId}>
                        <Link
                          href={`/dashboard/messages?patient=${m.patientId}`}
                          className="flex items-center gap-3 px-3 py-2 hover:bg-app-bg"
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand">
                            {initials(m.patientName)}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold text-ink">{m.patientName}</span>
                            <span className="block truncate text-xs text-muted">{m.body}</span>
                          </span>
                          <span className="shrink-0 text-xs text-muted">{relativeDay(m.createdAt)}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>

        {/* « Activité récente » retirée (Philippe, 2026-10-02) : l'accueil doit
            tenir sur un écran, sans scroller — on garde les indicateurs du
            jour et les patients à suivre. */}
      </div>
    </main>
  );
}
