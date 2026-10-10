import { createClient } from "@/lib/supabase/server";
import KineInfosView from "@/components/KineInfosView";
import { requireApprovedInstructor } from "@/lib/dashboard/requireApprovedInstructor";

// Onglet « Mes informations » (téléphone) — voir components/KineInfosView.tsx.
export default async function InformationsPage() {
  const supabase = await createClient();
  const { instructor } = await requireApprovedInstructor(supabase);
  return <KineInfosView instructorName={(instructor?.full_name as string | null) ?? null} />;
}
