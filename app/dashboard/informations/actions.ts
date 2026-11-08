"use server";

// Suppression du compte kiné (Philippe, 2026-11-07 ; Apple, règle 5.1.1(v) :
// on doit pouvoir la demander depuis l'appli). Elle touche aussi les patients
// du kiné : ce n'est qu'une DEMANDE, que Philippe traite depuis /admin.
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { requireApprovedInstructor } from "@/lib/dashboard/requireApprovedInstructor";
import { cancelAccountDeletion, requestAccountDeletion } from "@/lib/db/admin";

export async function requestAccountDeletionAction(formData: FormData): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const { user } = await requireApprovedInstructor(supabase);
  const t = await getTranslations("dashboard.infos.deletion");
  if (formData.get("confirm") !== "on") return { error: t("confirmRequired") };
  try {
    await requestAccountDeletion(user.id, String(formData.get("reason") ?? ""));
  } catch (e) {
    console.error("[compte] demande de suppression impossible :", e);
    return { error: t("requestFailed") };
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
    return { error: (await getTranslations("dashboard.infos.deletion"))("cancelFailed") };
  }
  revalidatePath("/dashboard/informations");
  return { ok: true };
}
