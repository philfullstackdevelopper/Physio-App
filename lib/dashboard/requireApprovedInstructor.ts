import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireUser, type AppUser } from "@/lib/supabase/require-user";
import { getInstructor, type InstructorSummary } from "@/lib/dashboard/instructor";

// Garde commune à toutes les Server Actions de /dashboard/** (Philippe,
// 2026-10-07 : la validation du compte kiné n'était vérifiée que dans
// app/dashboard/layout.tsx — or une Server Action s'appelle directement par
// POST, sans passer par le layout, donc un kiné « pending » ou refusé pouvait
// quand même inviter des patients, modifier des séances, etc.).
//
// Même règle que le layout : pas de ligne instructors -> côté patient ;
// statut autre que « approved » -> /dashboard, qui affiche l'écran
// d'attente / de refus. Un statut null compte comme validé (comptes créés
// avant la migration 0023), exactement comme dans le layout.
export async function requireApprovedInstructor(
  supabase: SupabaseClient,
): Promise<{ user: AppUser; instructor: InstructorSummary }> {
  const user = await requireUser(supabase);
  const instructor = await getInstructor(supabase, user.id);
  if (!instructor) redirect("/patient");
  const status = (instructor.status as string | null) ?? "approved";
  if (status !== "approved") redirect("/dashboard");
  return { user, instructor };
}
