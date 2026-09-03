import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { STAGE_LABELS, type InjuryStage } from "@/lib/exercise/prescription";
import PatientsFilter from "@/components/PatientsFilter";

export default async function PatientsPage() {
  const supabase = await createClient();
  await requireUser(supabase);

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
    <main className="min-h-screen">
      <div className="mx-auto max-w-2xl p-6 sm:p-8">
        <div className="animate-[fadeInUp_0.6s_ease-out_both] flex items-center justify-between">
          <div>
            <Link href="/dashboard" className="text-sm text-stone-500 hover:underline">
              ← Tableau de bord
            </Link>
            <h1 className="font-display mt-1 text-2xl font-semibold text-stone-900">
              Mes patients
            </h1>
          </div>
          <Link
            href="/dashboard/patients/new"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-blue-700"
          >
            + Ajouter
          </Link>
        </div>

        <div className="animate-[fadeInUp_0.6s_ease-out_both] [animation-delay:120ms]">
          <PatientsFilter
            patients={(patients ?? []).map((p) => {
              const stage = stageOf(p.id);
              return {
                id: p.id,
                name: p.full_name,
                conditionId: p.condition_id,
                conditionName: conditionName(p.condition_id),
                stage,
                stageLabel: stage ? STAGE_LABELS[stage] : undefined,
              };
            })}
            conditions={conditions ?? []}
            stages={Object.entries(STAGE_LABELS).map(([value, label]) => ({ value, label }))}
          />
        </div>
      </div>
    </main>
  );
}
