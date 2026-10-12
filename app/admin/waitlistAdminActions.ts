"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { isAdminEmail } from "@/lib/admin";
import { deleteWaitlistEntry } from "@/lib/db/admin";

// Retirer une adresse de la liste d'attente (demande de la personne, ou
// adresse fantaisiste). Réservé à l'administrateur.
export async function removeFromWaitlist(formData: FormData) {
  const user = await requireUser(await createClient());
  if (!isAdminEmail(user.email)) redirect("/");
  const email = String(formData.get("email") ?? "");
  if (!email) return;
  await deleteWaitlistEntry(email);
  revalidatePath("/admin");
}
