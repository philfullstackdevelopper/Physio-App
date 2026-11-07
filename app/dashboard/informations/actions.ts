"use server";

// Suppression du compte kiné (Philippe, 2026-11-07 ; Apple, règle 5.1.1(v) :
// on doit pouvoir la demander depuis l'appli). Elle touche aussi les patients
// du kiné : ce n'est qu'une DEMANDE, que Philippe traite depuis /admin.
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireApprovedInstructor } from "@/lib/dashboard/requireApprovedInstructor";
import { cancelAccountDeletion, requestAccountDeletion } from "@/lib/db/admin";

export async function requestAccountDeletionAction(formData: FormData): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const { user } = await requireApprovedInstructor(supabase);
  if (formData.get("confirm") !== "on") return { error: "Cochez la case pour confirmer." };
  try {
    await requestAccountDeletion(user.id, String(formData.get("reason") ?? ""));
  } catch (e) {
    console.error("[compte] demande de suppression impossible :", e);
    return { error: "La demande n'a pas pu être envoyée. Réessayez plus tard." };
  }
  revalidatePath("/dashboard/informations");
  return { ok: true };
}

export async function cancelAccountDeletionAction(): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const { user } = await requireApprovedInstructor(supabase);
  try {
    await cancelAccountDeletion(user.id);
  } catch (e) {
    console.error("[compte] annulation impossible :", e);
    return { error: "L'annulation n'a pas pu être enregistrée." };
  }
  revalidatePath("/dashboard/informations");
  return { ok: true };
}
