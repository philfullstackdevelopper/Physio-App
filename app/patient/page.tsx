import Link from "next/link";
import { ArrowRight, Flame, MessageCircle, Settings, Stethoscope } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { STAGE_LABELS } from "@/lib/exercise/prescription";
import { loadPatientHome } from "@/lib/patient/home-data";
import { markMessageRead, sendPatientMessage } from "./actions";

/** Today's progress, for the patient's own eyes only — never a comparison to anyone else. */
function ProgressRing({ done, total }: { done: number; total: number }) {
  const size = 56;
  const stroke = 5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio = total > 0 ? Math.min(1, done / total) : 0;
  const offset = circumference * (1 - ratio);

  return (
    <div className="relative h-14 w-14 shrink-0">
      <svg viewBox={`0 0 ${size} ${size}`} className="h-14 w-14 -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-slate-200"
        />
        {ratio > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="text-blue-600"
          />
        )}
      </svg>
      {total > 0 && (
        <span className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold text-slate-700">
          {done}/{total}
        </span>
      )}
    </div>
  );
}

export default async function PatientDashboard({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const home = await loadPatientHome(supabase, user.id);

  // Short notes from the practitioner (e.g. reacting to a recent session).
  const { data: messages } = await supabase
    .from("patient_messages")
    .select("id, body, created_at, read_at, sender")
    .eq("patient_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  // The ring now shows THIS WEEK's progress on the active séance (there's at
  // most one at a time), not a same-day tally across several workouts.
  const weekTarget = home.activeWorkout?.times_per_week ?? 0;

  return (
    <main className="min-h-screen p-6 sm:p-8">
      <div className="mx-auto max-w-2xl">
        {error && (
          <p className="mt-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
        )}

        <div className="pt-2 text-center">
          <h1 className="font-display text-4xl font-semibold leading-tight text-slate-900 sm:text-5xl">
            Bonjour, {home.fullName ? home.fullName.split(" ")[0] : "Bienvenue"}
          </h1>
        </div>

        <div className="mt-3 flex items-center justify-center gap-3">
          <ProgressRing done={home.weekCount} total={weekTarget} />
          <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
            <Flame className="h-4 w-4 text-blue-600" strokeWidth={2} />
            {home.streak > 0
              ? `${home.streak} jour${home.streak > 1 ? "s" : ""} d'affilée`
              : "Commencez votre série aujourd'hui"}
          </div>
        </div>

        {home.conditionName ? (
          <div className="mt-2 flex items-center justify-center gap-2 text-center text-sm text-slate-500">
            <span>
              Votre programme :{" "}
              <span className="font-medium text-slate-700">{home.conditionName}</span>
              <span className="text-slate-400"> (défini par votre praticien)</span>
              <span className="text-slate-500">
                {" "}
                · {STAGE_LABELS[home.stage]} (semaine {home.week})
              </span>
            </span>
            <Link href="/patient/onboarding" className="font-medium text-blue-700 hover:underline">
              Mettre à jour ma situation
            </Link>
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 text-center">
            <Stethoscope className="mx-auto h-6 w-6 text-blue-600" strokeWidth={1.75} />
            <p className="mt-2 font-medium text-slate-900">Votre programme arrive bientôt</p>
            <p className="mt-1 text-sm text-slate-600">
              Votre kiné prépare vos exercices personnalisés. Vous serez prévenu·e dès qu&apos;ils seront prêts.
            </p>
            <Link
              href="/patient/onboarding"
              className="mt-3 inline-block text-sm font-medium text-blue-700 hover:underline"
            >
              Compléter ma situation en attendant
            </Link>
          </div>
        )}

        {/* The brake, explained gently. The patient never sees the clinical wording
            of `decision.reason` — that phrasing is written for the practitioner. */}
        {(home.decision.concerning || home.decision.held) &&
          (home.decision.held && !home.decision.concerning ? (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 pl-4 border-l-2 border-l-blue-600">
              <p className="font-medium text-slate-900">Vous allez mieux</p>
              <p className="mt-1 text-sm text-slate-600">
                Vos retours s&apos;améliorent. Nous augmentons vos séances petit à petit, une étape
                par semaine, pour éviter toute rechute.
              </p>
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 pl-4 border-l-2 border-l-amber-500">
              <p className="font-medium text-slate-900">
                {home.decision.held
                  ? "Nous avons adapté votre programme"
                  : "Vos derniers retours ont été transmis"}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {home.decision.held
                  ? "Vos derniers retours indiquent que les exercices restent difficiles. Nous vous proposons donc des séances plus douces pour le moment — c'est normal, et c'est fait pour vous protéger."
                  : "Vous signalez encore des douleurs importantes. Votre praticien en est informé."}{" "}
                Parlez-en à votre praticien si cela persiste.
              </p>
            </div>
          ))}

        {/* Today's session, at a glance — the detail lives on its own tab. */}
        <Link
          href="/patient/seance-du-jour"
          className="mt-6 flex items-center justify-between rounded-2xl bg-blue-600 p-5 text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
        >
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-blue-100">Aujourd&apos;hui</p>
            <p className="mt-1 text-lg font-semibold">
              {home.activeWorkout
                ? home.doneToday
                  ? "Séance du jour terminée !"
                  : `Séance du jour — ${home.activeWorkout.name}`
                : home.weekComplete
                  ? "Programme de la semaine terminé !"
                  : "Programme à venir"}
            </p>
          </div>
          <ArrowRight className="h-5 w-5 shrink-0" strokeWidth={2} />
        </Link>

        <section className="mt-6 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
            <MessageCircle className="h-4 w-4 text-blue-600" strokeWidth={1.75} />
            Messages avec votre kiné
          </h2>
          {messages && messages.length > 0 && (
            <ul className="mt-3 flex flex-col gap-2">
              {[...messages].reverse().map((m) => {
                const mine = m.sender === "patient";
                return (
                  <li key={m.id as string} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                        mine
                          ? "rounded-br-md bg-blue-600 text-white"
                          : !m.read_at
                            ? "rounded-bl-md border-l-2 border-l-blue-600 bg-slate-50 font-medium text-slate-900"
                            : "rounded-bl-md bg-slate-50 text-slate-500"
                      }`}
                    >
                      <p>{m.body as string}</p>
                      <div className="mt-1 flex items-center justify-between gap-3">
                        <span className={`text-xs ${mine ? "text-blue-100" : "text-slate-400"}`}>
                          {new Date(m.created_at as string).toLocaleString("fr-FR")}
                        </span>
                        {!mine && !m.read_at && (
                          <form action={markMessageRead}>
                            <input type="hidden" name="message_id" value={m.id as string} />
                            <button type="submit" className="text-xs font-medium text-blue-700 hover:underline">
                              Marquer comme lu
                            </button>
                          </form>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <form action={sendPatientMessage} className="mt-3 flex gap-2">
            <input
              name="body"
              required
              placeholder="Écrire un message…"
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 active:scale-95"
            >
              Envoyer
            </button>
          </form>
        </section>

        <div className="mt-8 text-center">
          <Link
            href="/patient/compte"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 hover:underline"
          >
            <Settings className="h-4 w-4" strokeWidth={1.75} />
            Gérer mon compte
          </Link>
        </div>
      </div>
    </main>
  );
}
