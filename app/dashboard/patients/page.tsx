import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { loadPatientRows } from "@/lib/dashboard/patientRows";
import PatientsTable, { type Segment } from "@/components/PatientsTable";

export default async function PatientsPage({ searchParams }: { searchParams: Promise<{ filtre?: string }> }) {
  const { filtre } = await searchParams;
  const supabase = await createClient();
  await requireUser(supabase);

  const [rows, { data: conditions }] = await Promise.all([
    loadPatientRows(supabase),
    supabase.from("conditions").select("id, name").order("name"),
  ]);
  const initialSegment: Segment = filtre === "surveiller" ? "surveiller" : filtre === "jour" ? "jour" : "tous";

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-5xl p-6 sm:p-8">
        <div className="animate-[fadeInUp_0.6s_ease-out_both] flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-ink">Mes patients</h1>
            <p className="mt-1 text-sm text-muted">Suivez tous vos patients et intervenez en quelques clics.</p>
          </div>
          <Link href="/dashboard/patients/new" className="inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-dark">
            <Plus className="h-4 w-4" strokeWidth={2} />
            Ajouter un patient
          </Link>
        </div>
        <div className="animate-[fadeInUp_0.6s_ease-out_both] [animation-delay:120ms] mt-6">
          <PatientsTable rows={rows} conditions={conditions ?? []} initialSegment={initialSegment} />
        </div>
      </div>
    </main>
  );
}
