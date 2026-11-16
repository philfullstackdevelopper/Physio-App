"use server";

// Suppression du compte kiné (Philippe, 2026-11-07 ; Apple, règle 5.1.1(v) :
// on doit pouvoir la demander depuis l'appli). Elle touche aussi les patients
// du kiné : ce n'est qu'une DEMANDE, que Philippe traite depuis /admin.
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { requireApprovedInstructor } from "@/lib/dashboard/requireApprovedInstructor";
import { cancelAccountDeletion, requestAccountDeletion, rppsInUse, setInstructorRppsVerified } from "@/lib/db/admin";
import { verifyRpps } from "@/lib/instructor/rppsVerification";

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

// Nom du kiné (Philippe, 2026-11-16) : celui que voient ses patients (page du
// QR code, messages) et qui figure sur ses notes d'honoraires. Écrit avec SA
// session (règle instructors_update_own). Le badge « RPPS vérifié » compare ce
// nom à l'Annuaire Santé : il est donc revérifié à chaque changement de nom.
export async function updateInstructorNameAction(formData: FormData): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const { user } = await requireApprovedInstructor(supabase);
  const t = await getTranslations("dashboard.infos.name");
  const firstName = String(formData.get("first_name") ?? "").trim().slice(0, 60);
  const lastName = String(formData.get("last_name") ?? "").trim().slice(0, 60);
  if (!firstName || !lastName) return { error: t("errorRequired") };
  const fullName = `${firstName} ${lastName}`;

  const { data: row, error: readError } = await supabase.from("instructors").select("full_name, rpps_number").eq("id", user.id).maybeSingle();
  if (readError || !row) return { error: t("errorSave") };
  if (row.full_name === fullName) return { ok: true };

  const { error } = await supabase.from("instructors").update({ full_name: fullName }).eq("id", user.id);
  if (error) {
    console.error("updateInstructorNameAction", error);
    return { error: t("errorSave") };
  }

  const rpps = (row.rpps_number as string | null) ?? null;
  if (rpps) {
    // Annuaire injoignable (C1, audit du 2026-11-16) : on ne touche pas au
    // badge — seule une réponse « ce nom ne correspond pas » le retire.
    const verification = await verifyRpps(rpps, fullName).catch(() => ({ status: "unavailable" as const }));
    if (verification.status === "verified") {
      const inUse = await rppsInUse(rpps, user.id).catch(() => null);
      if (inUse === false) await setInstructorRppsVerified(user.id, verification.verifiedAt);
    } else if (verification.status === "unverified") {
      await setInstructorRppsVerified(user.id, null);
    }
  }
  revalidatePath("/dashboard", "layout");
  return { ok: true };
}
