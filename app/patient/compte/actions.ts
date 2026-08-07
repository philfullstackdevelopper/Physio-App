"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/supabase/require-user";

// RGPD droit à l'effacement: a patient deletes their own account. Every
// table referencing patients.id has "on delete cascade" (see the
// migrations), so removing the row here removes the profile, feedback,
// logs, documents metadata, and messages with it. Storage files themselves
// aren't auto-deleted by a DB cascade — flagged below, not yet handled.
export async function deleteMyAccount(formData: FormData) {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const confirmation = String(formData.get("confirmation") ?? "");
  if (confirmation !== "SUPPRIMER") {
    redirect(
      `/patient/compte?error=${encodeURIComponent(
        'Tapez exactement "SUPPRIMER" pour confirmer.',
      )}`,
    );
  }

  // TODO(rgpd): also delete the patient's files from Supabase Storage
  // (bucket patient-documents, folder `${user.id}/`) before deleting the
  // account — the DB row for each document cascades away, but the actual
  // file bytes in storage do not, and would be orphaned.

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    redirect(`/patient/compte?error=${encodeURIComponent(error.message)}`);
  }

  await supabase.auth.signOut();
  redirect("/login?deleted=1");
}
