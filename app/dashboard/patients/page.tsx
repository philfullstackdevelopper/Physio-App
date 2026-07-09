import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { STAGE_LABELS, type InjuryStage } from "@/lib/exercise/prescription";

export default async function PatientsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: patients } = await supabase
    .from("patients")
    .select("id, full_name, email, condition_id, created_at")
    .order("created_at", { ascending: false });

  const { data: conditions } = await supabase.from("conditions").select("id, name");
  const conditionName = (cid: string | null) => conditions?.find((c) => c.id === cid)?.name;

  // Declared stage per patient (for a quick glance).
  const { data: profiles } = await supabase
    .from("patient_profiles")
    .select("id, injury_stage");
  const stageOf = (pid: string) =>
    profiles?.find((p) => p.id === pid)?.injury_stage as InjuryStage | undefined;

  return (
    <main className="min-h-screen bg-slate-50 p-6 sm:p-8">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between">
          <div>
            <Link href="/dashboard" className="text-sm text-slate-500 hover:underline">
              ← Tableau de bord
            </Link>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">Mes patients</h1>
          </div>
          <Link
            href="/dashboard/patients/new"
            className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
          >
            + Ajouter
          </Link>
        </div>

        <div className="mt-8 rounded-xl bg-white p-2 shadow-sm">
          {!patients || patients.length === 0 ? (
            <p className="p-6 text-center text-sm text-slate-500">
              Aucun patient pour le moment. Cliquez sur « Ajouter » pour commencer.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {patients.map((p) => {
                const stage = stageOf(p.id);
                return (
                  <li key={p.id}>
                    <Link
                      href={`/dashboard/patients/${p.id}`}
                      className="flex items-center justify-between px-4 py-3 hover:bg-slate-50"
                    >
                      <div>
                        <p className="font-medium text-slate-900">{p.full_name}</p>
                        <p className="text-sm text-slate-500">
                          {conditionName(p.condition_id) ?? "Condition non assignée"}
                          {stage && <span className="text-slate-400"> · {STAGE_LABELS[stage]}</span>}
                        </p>
                      </div>
                      <span className="text-slate-400">→</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
