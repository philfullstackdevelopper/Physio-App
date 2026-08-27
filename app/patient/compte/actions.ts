"use server";

import { redirect } from "next/navigation";
import { clerkClient } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/supabase/require-user";
import { revokeCurrentSession } from "@/lib/auth/clerk-session";

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

  const admin = createAdminClient();

  // Delete the patient's files from Supabase Storage first — the DB row for
  // each document cascades away with the account below, but the file bytes
  // in storage don't, and would otherwise be orphaned.
  const { data: files } = await admin.storage.from("patient-documents").list(user.id);
  if (files && files.length > 0) {
    const paths = files.map((f) => `${user.id}/${f.name}`);
    await admin.storage.from("patient-documents").remove(paths);
  }

  // Delete the Clerk identity itself (login, e-mail, password)...
  try {
    const client = await clerkClient();
    await client.users.deleteUser(user.clerkId);
  } catch {
    redirect(`/patient/compte?error=${encodeURIComponent("Suppression du compte impossible.")}`);
  }

  // ...and drop the internal identity-mapping row.
  const admin2 = createAdminClient();
  await admin2.from("app_users").delete().eq("app_id", user.id);

  await revokeCurrentSession();
  redirect("/login?deleted=1");
}
