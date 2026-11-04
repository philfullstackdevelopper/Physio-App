"use server";

// Vérification des exercices créés par les kinés (migration 0081) : publier,
// demander une modification, garder privé, et « dessin fait ».
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { isAdminEmail } from "@/lib/admin";
import { markKineExerciseSeen, reviewKineExercise } from "@/lib/db/admin";
// Plus aucune remise accordée (modèle du 2026-11-04) : un seuil impossible à
// atteindre neutralise cette partie de internal.admin_review_exercise.
const NO_FEE_WAIVER = { threshold: 1_000_000, months: 0 } as const;

const UUID = /^[0-9a-f-]{36}$/i;

async function requireAdmin() {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  if (!isAdminEmail(user.email)) redirect("/");
}

export async function reviewExerciseAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const note = String(formData.get("note") ?? "").trim().slice(0, 1000);
  if (!UUID.test(id) || !["publish", "changes", "decline"].includes(decision)) return;
  if (decision !== "publish" && !note) {
    redirect(`/admin?error=${encodeURIComponent("Écrivez un message au kiné pour demander une modification ou garder l'exercice privé.")}#exercices-kines`);
  }
  let res: { published_count: number; waived_until: string | null };
  try {
    res = await reviewKineExercise(id, decision as "publish" | "changes" | "decline", note, NO_FEE_WAIVER.threshold, NO_FEE_WAIVER.months);
  } catch (e) {
    console.error("reviewExerciseAction failed", e);
    redirect(`/admin?error=${encodeURIComponent("Vérification impossible : réessayez.")}#exercices-kines`);
  }
  revalidatePath("/admin");
  const params = new URLSearchParams({ exercice: decision });
  if (decision === "publish") {
    params.set("publies", String(res.published_count));
  }
  redirect(`/admin?${params.toString()}#exercices-kines`);
}

export async function markExerciseSeenAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const seen = String(formData.get("seen") ?? "1") === "1";
  if (!UUID.test(id)) return;
  await markKineExerciseSeen(id, seen);
  revalidatePath("/admin");
}
