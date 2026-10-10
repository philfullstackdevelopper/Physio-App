import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { getInstructor } from "@/lib/dashboard/instructor";
import { loadDashboardHome } from "@/lib/dashboard/homeData";
import { loadUnreadMessages } from "@/lib/dashboard/unreadMessages";
import DashboardHomeView from "@/components/DashboardHomeView";

export default async function DashboardPage() {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const instructor = await getInstructor(supabase, user.id);
  if (!instructor) redirect("/patient");
  // Compte pas (encore) validé : app/dashboard/layout.tsx affiche déjà l'écran
  // d'attente ou de refus ; cette page ne charge rien (audit du 2026-10-08).
  // Pas de redirect("/dashboard") ici, comme dans requireApprovedInstructor :
  // on y est déjà, ce serait une boucle.
  if (((instructor.status as string | null) ?? "approved") !== "approved") return null;

  const h = await loadDashboardHome(supabase, user.id);
  const unread = await loadUnreadMessages(supabase, user.id);
  // Une ligne par patient : on garde le message le plus récent de chacun.
  const unreadByPatient = new Map<string, (typeof unread)[number]>();
  for (const m of unread) {
    const existing = unreadByPatient.get(m.patientId);
    if (!existing || m.createdAt > existing.createdAt) unreadByPatient.set(m.patientId, m);
  }
  const unreadRows = [...unreadByPatient.values()].sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));

  return <DashboardHomeView h={h} unreadRows={unreadRows} />;
}
