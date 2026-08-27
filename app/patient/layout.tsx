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
    .select("instructors ( full_name )")
    .eq("id", user.id)
    .maybeSingle();
  const instructorRow = patient?.instructors as { full_name: string | null }[] | null;
  const instructorName = instructorRow?.[0]?.full_name ?? null;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <PatientNav instructorName={instructorName} />
      <div className="flex-1 pb-20 sm:pb-0">{children}</div>
    </div>
  );
}
