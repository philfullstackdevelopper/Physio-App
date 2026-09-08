import PatientNav from "@/components/PatientNav";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";

export default async function PatientLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  // requireUser() is cache()-deduped, so calling it again here doesn't cost an
  // extra Clerk round-trip even though every page under app/patient also
  // calls it — same pattern as the dashboard layout.
  const { data: patient } = await supabase
    .from("patients")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  // Messages FROM the instructor this patient hasn't opened yet — mirrors
  // lib/dashboard/unreadMessages.ts's loadUnreadCount, sender flipped.
  const { count: unreadCount } = await supabase
    .from("patient_messages")
    .select("id", { count: "exact", head: true })
    .eq("patient_id", user.id)
    .eq("sender", "instructor")
    .is("read_at", null);

  return (
    <div className="flex min-h-screen flex-col bg-app-bg text-ink sm:flex-row">
      <PatientNav patientName={(patient?.full_name as string | undefined) ?? null} unreadCount={unreadCount ?? 0} />
      <div className="relative min-w-0 flex-1 pb-20 sm:pb-0">{children}</div>
    </div>
  );
}
