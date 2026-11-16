"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { requireApprovedInstructor } from "@/lib/dashboard/requireApprovedInstructor";
import { cabinetErrorCode, INVITE_TOKEN, joinCabinetByInvite } from "@/lib/db/cabinets";

// Un kiné qui a DÉJÀ un compte ouvre le lien d'invitation de son cabinet
// (/cabinet/<code>, migration 0091) : il y entre directement. L'identité vient
// de la session, jamais du formulaire ; le code seul désigne le cabinet.
export async function joinCabinetFromInvite(code: string) {
  const page = `/cabinet/${encodeURIComponent(code)}`;
  const supabase = await createClient();
  const { user } = await requireApprovedInstructor(supabase);
  const t = await getTranslations("auth.cabinetInvite");
  if (!INVITE_TOKEN.test(code)) redirect(`${page}?error=${encodeURIComponent(t("invalidBody"))}`);
  try {
    await joinCabinetByInvite(user.id, code);
  } catch (e) {
    const err = cabinetErrorCode(e);
    if (err !== "ALREADY_IN_CABINET" && err !== "CABINET_NOT_FOUND") console.error("joinCabinetFromInvite", e);
    const msg = err === "ALREADY_IN_CABINET" ? t("alreadyIn") : err === "CABINET_NOT_FOUND" ? t("invalidBody") : t("failed");
    redirect(`${page}?error=${encodeURIComponent(msg)}`);
  }
  revalidatePath("/dashboard", "layout");
  redirect("/dashboard/cabinet");
}
