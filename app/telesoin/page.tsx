import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAccess } from "@/lib/billing/context";
import UpgradeCta from "@/components/UpgradeCta";
import { startCall, scheduleCall, cancelScheduled } from "./actions";

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });

export default async function TelesoinHub() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const access = await getCurrentAccess(supabase, user.id);

  const kinePro = access.role === "instructor" && access.access.capabilities.telesoinWorkflow;
  const patientVisio = access.role === "patient" && access.access.capabilities.bookingVisio;

  let patients: { id: string; full_name: string | null }[] = [];
  let scheduledKine: { id: string; scheduled_at: string | null; patient_id: string }[] = [];
  let activeCalls: { id: string; created_at: string }[] = [];
  let scheduledPatient: { id: string; scheduled_at: string | null }[] = [];

  if (kinePro) {
    const [{ data: pts }, { data: sched }] = await Promise.all([
      supabase.from("patients").select("id, full_name").eq("instructor_id", user.id).order("full_name"),
      supabase
        .from("video_calls")
        .select("id, scheduled_at, patient_id")
        .eq("kine_id", user.id)
        .eq("status", "scheduled")
        .order("scheduled_at"),
    ]);
    patients = (pts ?? []) as { id: string; full_name: string | null }[];
    scheduledKine = (sched ?? []) as { id: string; scheduled_at: string | null; patient_id: string }[];
  }
  if (patientVisio) {
    const [{ data: active }, { data: sched }] = await Promise.all([
      supabase
        .from("video_calls")
        .select("id, created_at")
        .eq("patient_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false }),
      supabase
        .from("video_calls")
        .select("id, scheduled_at")
        .eq("patient_id", user.id)
        .eq("status", "scheduled")
        .order("scheduled_at"),
    ]);
    activeCalls = (active ?? []) as { id: string; created_at: string }[];
    scheduledPatient = (sched ?? []) as { id: string; scheduled_at: string | null }[];
  }

  const patientName = (id: string) => patients.find((p) => p.id === id)?.full_name ?? "Patient";

  return (
    <main className="min-h-screen bg-slate-50 p-6 sm:p-8">
      <div className="mx-auto max-w-2xl">
        <Link
          href={access.role === "instructor" ? "/dashboard" : "/patient"}
          className="text-sm text-slate-500 hover:underline"
        >
          ← Retour
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">Télésoin</h1>
        <p className="mt-1 text-sm text-slate-500">Consultation vidéo avec suivi en direct.</p>

        {access.role === "instructor" && !kinePro && (
          <>
            <p className="mt-6 text-sm text-slate-600">
              Le suivi télésoin (visio + dossier patient en direct) fait partie de l&apos;offre Kiné Pro.
            </p>
            <UpgradeCta role="instructor" level={access.access.level} />
          </>
        )}

        {kinePro && (
          <>
            {/* Schedule a session */}
            <section className="mt-6 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-medium text-slate-900">Planifier une séance</h2>
              {patients.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">Aucun patient pour l&apos;instant.</p>
              ) : (
                <form action={scheduleCall} className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
                  <label className="flex-1 text-sm">
                    <span className="text-slate-600">Patient</span>
                    <select
                      name="patient_id"
                      required
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900"
                    >
                      {patients.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.full_name ?? "Patient"}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex-1 text-sm">
                    <span className="text-slate-600">Date et heure</span>
                    <input
                      type="datetime-local"
                      name="scheduled_at"
                      required
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900"
                    />
                  </label>
                  <button className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700">
                    Planifier
                  </button>
                </form>
              )}
            </section>

            {/* Upcoming scheduled sessions */}
            {scheduledKine.length > 0 && (
              <section className="mt-6">
                <h2 className="text-lg font-medium text-slate-900">Séances prévues</h2>
                <ul className="mt-3 space-y-2">
                  {scheduledKine.map((c) => (
                    <li
                      key={c.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm"
                    >
                      <div>
                        <p className="font-medium text-slate-800">{patientName(c.patient_id)}</p>
                        {c.scheduled_at && (
                          <p className="text-sm text-slate-500">{fmt(c.scheduled_at)}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/telesoin/${c.id}`}
                          className="rounded-md bg-teal-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-700"
                        >
                          Rejoindre
                        </Link>
                        <form action={cancelScheduled}>
                          <input type="hidden" name="call_id" value={c.id} />
                          <button className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
                            Annuler
                          </button>
                        </form>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Start an instant call */}
            <section className="mt-6">
              <h2 className="text-lg font-medium text-slate-900">Appel immédiat</h2>
              {patients.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">Aucun patient pour l&apos;instant.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {patients.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm"
                    >
                      <span className="font-medium text-slate-800">{p.full_name ?? "Patient"}</span>
                      <form action={startCall}>
                        <input type="hidden" name="patient_id" value={p.id} />
                        <button className="rounded-md border border-teal-600 px-4 py-2 text-sm font-medium text-teal-700 hover:bg-teal-50">
                          📹 Démarrer maintenant
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}

        {access.role === "patient" && !patientVisio && (
          <>
            <p className="mt-6 text-sm text-slate-600">
              La visio avec votre kiné fait partie de l&apos;expérience premium.
            </p>
            <UpgradeCta role="patient" level={access.access.level} />
          </>
        )}

        {patientVisio && (
          <>
            {activeCalls.length > 0 && (
              <section className="mt-6">
                <h2 className="text-lg font-medium text-slate-900">Appel en cours</h2>
                <ul className="mt-3 space-y-2">
                  {activeCalls.map((c) => (
                    <li
                      key={c.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-teal-200 bg-teal-50 p-4"
                    >
                      <span className="font-medium text-teal-800">Consultation en cours</span>
                      <Link
                        href={`/telesoin/${c.id}`}
                        className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
                      >
                        Rejoindre →
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="mt-6">
              <h2 className="text-lg font-medium text-slate-900">Séances prévues</h2>
              {scheduledPatient.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">
                  Aucune séance prévue. Quand votre kiné en planifie une, elle apparaît ici.
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {scheduledPatient.map((c) => (
                    <li
                      key={c.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm"
                    >
                      <div>
                        <p className="font-medium text-slate-800">Consultation télésoin</p>
                        {c.scheduled_at && <p className="text-sm text-slate-500">{fmt(c.scheduled_at)}</p>}
                      </div>
                      <Link
                        href={`/telesoin/${c.id}`}
                        className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
                      >
                        Rejoindre →
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
