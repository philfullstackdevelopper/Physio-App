import Link from "next/link";
import { redirect } from "next/navigation";
import { Users, Flame, CalendarCheck, UserMinus, UsersRound, Dumbbell, ListChecks, Wallet, ArrowRight, HeartHandshake } from "lucide-react";
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
  const [
    instructor,
    { data: roster },
    { data: recentLogs },
    { data: painRows },
    { data: diffRows },
  ] = await Promise.all([
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
    supabase
      .from("exercise_feedback")
      .select("patient_id, difficulty, created_at")
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

  const inactiveAlert = inactive.length > 0;
  const STAT_CARDS = [
    {
      Icon: Users,
      value: patientCount,
      label: "Patients",
      border: "border-slate-100",
      iconColor: "text-slate-400",
      valueColor: "text-slate-900",
    },
    {
      Icon: Flame,
      value: activeThisWeek,
      label: "Actifs cette semaine",
      border: "border-blue-100",
      iconColor: "text-blue-600",
      valueColor: "text-blue-700",
    },
    {
      Icon: CalendarCheck,
      value: sessionsThisWeek,
      label: "Séances cette semaine",
      border: "border-slate-100",
      iconColor: "text-blue-600",
      valueColor: "text-slate-900",
    },
    {
      Icon: UserMinus,
      value: inactive.length,
      label: "Inactifs depuis 7 jours",
      border: inactiveAlert ? "border-amber-200" : "border-slate-100",
      iconColor: inactiveAlert ? "text-amber-600" : "text-slate-400",
      valueColor: inactiveAlert ? "text-amber-700" : "text-slate-900",
    },
  ];

  const NAV_CARDS = [
    {
      href: "/dashboard/patients",
      Icon: UsersRound,
      title: "Mes patients",
      description: "Suivez leur assiduité, ajustez leur programme.",
      featured: true,
    },
    {
      href: "/dashboard/seances",
      Icon: Dumbbell,
      title: "Mes séances",
      description: "Composez, dupliquez ou retrouvez vos séances.",
    },
    {
      href: "/dashboard/exercises",
      Icon: ListChecks,
      title: "Mes exercices",
      description: "Créez vos propres exercices et leurs démonstrations vidéo.",
    },
    {
      href: "/dashboard/facturation",
      Icon: Wallet,
      title: "Tarif & paiements",
      description: "Fixez votre tarif et activez vos paiements.",
    },
  ];

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#faf7f2]">
      {/* Warm ambient background, matching the rest of the app */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-20"
        style={{
          background:
            "radial-gradient(900px 500px at 10% -10%, #dbeafe 0%, transparent 55%)," +
            "radial-gradient(800px 500px at 100% 0%, #e0e9ff 0%, transparent 50%)",
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
          <span className="inline-flex items-center rounded-full border border-blue-100 bg-white/70 px-3 py-1 text-xs font-medium text-blue-700 shadow-sm backdrop-blur">
            Tableau de bord
          </span>
          <h1 className="font-display mt-3 text-4xl font-semibold leading-tight text-slate-900 sm:text-5xl">
            Bonjour, {firstName}
          </h1>
          <p className="mx-auto mt-2 flex max-w-md items-center justify-center gap-1.5 text-sm text-slate-500">
            <HeartHandshake className="h-4 w-4 shrink-0 text-blue-600" strokeWidth={1.75} />
            Conçu et validé avec des kinésithérapeutes expérimentés
          </p>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4">
          {STAT_CARDS.map((card) => (
            <div
              key={card.label}
              className={`rounded-2xl border ${card.border} bg-white/90 p-6 shadow-sm backdrop-blur`}
            >
              <card.Icon className={`h-6 w-6 ${card.iconColor}`} strokeWidth={1.75} />
              <div className={`mt-3 text-3xl font-semibold tabular-nums ${card.valueColor}`}>
                {card.value}
              </div>
              <div className="mt-0.5 text-sm text-slate-500">{card.label}</div>
            </div>
          ))}
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

        {/* Patients sans séance récente : un rappel doux, distinct de l'alerte
            clinique ci-dessus — ici le problème est l'assiduité, pas la douleur. */}
        {inactive.length > 0 && (
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm">
            <h2 className="font-medium text-slate-900">
              {inactive.length === 1
                ? "1 patient sans séance depuis 7 jours"
                : `${inactive.length} patients sans séance depuis 7 jours`}
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Un petit message de relance suffit souvent à remettre en mouvement.
            </p>
            <ul className="mt-3 space-y-1.5">
              {inactive.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/dashboard/patients/${p.id}`}
                    className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 transition hover:bg-blue-50"
                  >
                    <span className="font-medium text-slate-800">
                      {(p.full_name as string) ?? "Patient"}
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {NAV_CARDS.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className={
                card.featured
                  ? "group flex flex-col rounded-2xl border border-blue-600 bg-blue-600 p-6 text-white shadow-sm transition hover:bg-blue-700"
                  : "group flex flex-col rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur transition hover:shadow-md"
              }
            >
              <card.Icon className={`h-6 w-6 ${card.featured ? "" : "text-blue-700"}`} strokeWidth={1.75} />
              <span
                className={`font-display mt-3 text-lg font-semibold ${card.featured ? "" : "text-slate-900"}`}
              >
                {card.title}
              </span>
              <span className={`mt-1 flex-1 text-sm ${card.featured ? "text-blue-50" : "text-slate-500"}`}>
                {card.description}
              </span>
              <span
                className={`mt-4 flex items-center gap-1 text-sm font-medium ${
                  card.featured ? "" : "text-blue-700"
                }`}
              >
                Ouvrir
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
