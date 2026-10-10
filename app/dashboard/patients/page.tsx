import { createClient } from "@/lib/supabase/server";
import { loadPatientRows } from "@/lib/dashboard/patientRows";
import PatientsTable, { type Segment } from "@/components/PatientsTable";
import PatientsPageView from "@/components/PatientsPageView";
import { getPatientThread, sendPatientMessage, reactivatePatient } from "./actions";
import { markPaymentLapsed, clearPaymentLapsed, deletePatient } from "./[id]/actions";
import { requireApprovedInstructor } from "@/lib/dashboard/requireApprovedInstructor";

export default async function PatientsPage({ searchParams }: { searchParams: Promise<{ filtre?: string }> }) {
  const { filtre } = await searchParams;
  const supabase = await createClient();
  await requireApprovedInstructor(supabase);

  const [rows, { data: conditions }] = await Promise.all([
    loadPatientRows(supabase),
    supabase.from("conditions").select("id, name").order("name"),
  ]);
  const initialSegment: Segment =
    filtre === "surveiller" ? "surveiller" : filtre === "jour" ? "jour" : filtre === "resilies" ? "resilies" : "tous";

  return (
    <PatientsPageView>
      <PatientsTable
        rows={rows}
        conditions={conditions ?? []}
        initialSegment={initialSegment}
        getPatientThread={getPatientThread}
        sendPatientMessage={sendPatientMessage}
        reactivatePatient={reactivatePatient}
        markPaymentLapsed={markPaymentLapsed}
        clearPaymentLapsed={clearPaymentLapsed}
        deletePatient={deletePatient}
      />
    </PatientsPageView>
  );
}
