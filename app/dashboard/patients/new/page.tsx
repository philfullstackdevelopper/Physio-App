import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { canInvitePatients } from "@/lib/launch";
import { addPatient } from "../actions";
import JoinQrCard from "@/components/JoinQrCard";
import NewPatientView from "@/components/NewPatientView";

export default async function NewPatientPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  // Avant le lancement, les invitations sont fermées (lib/launch.ts) : le
  // formulaire reste visible, pour montrer comment ça marchera, mais éteint.
  const user = await requireUser(await createClient());
  const open = canInvitePatients(user.email);

  return (
    <NewPatientView
      open={open}
      error={error}
      addPatientAction={addPatient}
      qr={<JoinQrCard instructorId={user.id} open={open} />}
    />
  );
}
