import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAccess } from "@/lib/billing/context";
import UpgradeCta from "@/components/UpgradeCta";
import { startCall } from "./actions";

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
  let activeCalls: { id: string; created_at: string }[] = [];
  if (kinePro) {
    const { data } = await supabase
      .from("patients")
      .select("id, full_name")
      .eq("instructor_id", user.id)
      .order("full_name");
    patients = (data ?? []) as { id: string; full_name: string | null }[];
  }
  if (patientVisio) {
    const { data } = await supabase
      .from("video_calls")
      .select("id, created_at")
      .eq("patient_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: false });
    activeCalls = (data ?? []) as { id: string; created_at: string }[];
  }

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

        {/* Kiné side: start a call. Scheduling lives in the kiné's Doctolib, so the
            app only provides the live video + follow-up. */}
        {kinePro && (
          <section className="mt-6">
            <h2 className="text-lg font-medium text-slate-900">Appeler un patient</h2>
            <p className="mt-1 text-sm text-slate-500">
              Au moment de la séance (planifiée dans votre agenda), lancez l&apos;appel — le patient
              le rejoint depuis son espace.
            </p>
            {patients.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">Aucun patient pour l&apos;instant.</p>
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
                      <button className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700">
                        📹 Démarrer l&apos;appel
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {access.role === "patient" && !patientVisio && (
          <>
            <p className="mt-6 text-sm text-slate-600">
              La visio avec votre kiné fait partie de l&apos;expérience premium.
            </p>
            <UpgradeCta role="patient" level={access.access.level} />
          </>
        )}

        {/* Patient side: can only JOIN a call the kiné started — never start one. */}
        {patientVisio && (
          <section className="mt-6">
            <h2 className="text-lg font-medium text-slate-900">Appel avec votre kiné</h2>
            {activeCalls.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">
                Aucun appel en cours. Au moment de votre séance, votre kiné lancera l&apos;appel et un
                bouton pour le rejoindre apparaîtra ici.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {activeCalls.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-teal-200 bg-teal-50 p-4"
                  >
                    <span className="font-medium text-teal-800">Votre kiné vous appelle</span>
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
        )}
      </div>
    </main>
  );
}
