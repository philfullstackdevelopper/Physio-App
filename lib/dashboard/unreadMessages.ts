import type { SupabaseClient } from "@supabase/supabase-js";

export interface UnreadMessageRow {
  patientId: string;
  patientName: string;
  body: string;
  createdAt: string;
}

// Patient-authored messages this instructor hasn't opened yet, most recent
// first. Consumed by the dashboard's "Messages non lus" section.
export async function loadUnreadMessages(
  supabase: SupabaseClient,
  instructorId: string,
): Promise<UnreadMessageRow[]> {
  const { data } = await supabase
    .from("patient_messages")
    .select("patient_id, body, created_at, patients(full_name)")
    .eq("instructor_id", instructorId)
    .eq("sender", "patient")
    .is("read_by_instructor_at", null)
    .order("created_at", { ascending: false });

  return (data ?? []).map((m) => ({
    patientId: m.patient_id as string,
    patientName: ((m.patients as unknown) as { full_name: string | null } | null)?.full_name ?? "Patient",
    body: m.body as string,
    createdAt: m.created_at as string,
  }));
}
