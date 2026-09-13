"use server";

import { redirect } from "next/navigation";
import { clerkClient } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";
import { deleteAppUserById } from "@/lib/db/admin";
import { requireUser } from "@/lib/supabase/require-user";
import { revokeCurrentSession } from "@/lib/auth/clerk-session";

// RGPD droit à l'effacement: a patient deletes their own account. Every
// table referencing patients.id has "on delete cascade" (see the
// migrations), so removing the row here removes the profile, feedback,
// logs, and messages with it.
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

  // Delete the Clerk identity itself (login, e-mail, password)...
  try {
    const client = await clerkClient();
    await client.users.deleteUser(user.clerkId);
  } catch {
    redirect(`/patient/compte?error=${encodeURIComponent("Suppression du compte impossible.")}`);
  }

  // ...and drop the internal identity-mapping row. A direct connection, not
  // the normal supabase-js client: the Clerk identity was just deleted
  // above, so a fresh Clerk token may no longer be obtainable here.
  await deleteAppUserById(user.id);

  await revokeCurrentSession();
  redirect("/login?deleted=1");
}
