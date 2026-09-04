import Link from "next/link";
import { ArrowRight, Flame, MessageCircle, Settings, Stethoscope } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { STAGE_LABELS } from "@/lib/exercise/prescription";
import { loadPatientHome } from "@/lib/patient/home-data";
import { markMessageRead, sendPatientMessage } from "./actions";
import MessageThread, { type ThreadMessage } from "@/components/MessageThread";
import MessageComposer from "@/components/MessageComposer";
import { ATTACHMENT_BUCKET } from "@/lib/messages/attachment";

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
    .select("id, body, created_at, read_at, read_by_instructor_at, sender, attachment_path, attachment_name")
    .eq("patient_id", user.id)
    .order("created_at", { ascending: false })
    .limit(30);
  const rows = [...(messages ?? [])].reverse();
  const paths = rows.map((m) => m.attachment_path as string | null).filter((p): p is string => !!p);
  const signed = new Map<string, string>();
  if (paths.length > 0) {
    const { data: urls } = await supabase.storage.from(ATTACHMENT_BUCKET).createSignedUrls(paths, 3600);
    for (const u of urls ?? []) if (u.path && u.signedUrl) signed.set(u.path, u.signedUrl);
  }
  // Pour mes messages (patient), « lu » = ouvert par le kiné.
  const thread: ThreadMessage[] = rows.map((m) => ({
    id: m.id as string,
    body: m.body as string,
    created_at: m.created_at as string,
    sender: m.sender as string,
    read_at: (m.read_by_instructor_at as string | null) ?? null,
    attachment_name: (m.attachment_name as string | null) ?? null,
    attachmentUrl: m.attachment_path ? (signed.get(m.attachment_path as string) ?? null) : null,
  }));
  const unreadFromKine = rows.filter((m) => m.sender === "instructor" && !m.read_at).length;

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
          <div className="mt-3 max-h-[28rem] overflow-y-auto">
            <MessageThread messages={thread} mineSender="patient" emptyText="Aucun message pour l'instant." />
          </div>
          {unreadFromKine > 0 && (
            <form action={markMessageRead} className="mt-2 text-right">
              <button type="submit" className="text-xs font-medium text-blue-700 hover:underline">
                Marquer comme lu
              </button>
            </form>
          )}
          <div className="mt-3">
            <MessageComposer patientId={user.id} action={sendPatientMessage} />
          </div>
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
