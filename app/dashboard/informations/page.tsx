import { createClient } from "@/lib/supabase/server";
import KineInfosView from "@/components/KineInfosView";
import AccountDeletionCard from "@/components/AccountDeletionCard";
import { requireApprovedInstructor } from "@/lib/dashboard/requireApprovedInstructor";
import { cancelAccountDeletionAction, requestAccountDeletionAction } from "./actions";

// Onglet « Mes informations » (téléphone) — voir components/KineInfosView.tsx.
// En bas, « Supprimer mon compte » (Apple, règle 5.1.1(v), migration 0083).
export default async function InformationsPage() {
  const supabase = await createClient();
  const { instructor, user } = await requireApprovedInstructor(supabase);
  // Table absente tant que la migration 0083 n'est pas appliquée : pas de demande.
  const { data: request } = await supabase
    .from("account_deletion_requests")
    .select("requested_at")
    .eq("instructor_id", user.id)
    .maybeSingle();
  return (
    <KineInfosView
      instructorName={(instructor?.full_name as string | null) ?? null}
      footer={
        <AccountDeletionCard
          requestedAt={(request?.requested_at as string | null) ?? null}
          requestAction={requestAccountDeletionAction}
          cancelAction={cancelAccountDeletionAction}
        />
      }
    />
  );
}
