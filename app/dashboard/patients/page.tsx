import { createClient } from "@/lib/supabase/server";
import { loadPatientRows } from "@/lib/dashboard/patientRows";
import PatientsTable, { type Segment } from "@/components/PatientsTable";
import PatientsPageView from "@/components/PatientsPageView";
import { getPatientThread, sendPatientMessage, reactivatePatient } from "./actions";
import { deletePatient } from "./[id]/actions";
import { requireApprovedInstructor } from "@/lib/dashboard/requireApprovedInstructor";
import { getLibI18n } from "@/lib/dashboard/libI18n";
import { getTranslations } from "next-intl/server";

export default async function PatientsPage({ searchParams }: { searchParams: Promise<{ filtre?: string; invitation?: string }> }) {
  const { filtre, invitation } = await searchParams;
  const supabase = await createClient();
  await requireApprovedInstructor(supabase);

  const [rows, { data: conditions }] = await Promise.all([
    loadPatientRows(supabase, new Date(), await getLibI18n()),
    supabase.from("conditions").select("id, name").order("name"),
  ]);
  const initialSegment: Segment =
    filtre === "surveiller" ? "surveiller" : filtre === "jour" ? "jour" : "tous";

  return (
    <PatientsPageView notice={invitation === "envoyee" ? (await getTranslations("dashboard.newPatient"))("sentHint") : undefined}>
      <PatientsTable
        rows={rows}
        conditions={conditions ?? []}
        initialSegment={initialSegment}
        getPatientThread={getPatientThread}
        sendPatientMessage={sendPatientMessage}
        reactivatePatient={reactivatePatient}
        deletePatient={deletePatient}
      />
    </PatientsPageView>
  );
}
