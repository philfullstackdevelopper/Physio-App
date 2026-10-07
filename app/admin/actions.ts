"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { setInstructorStatus } from "@/lib/db/admin";
import { isAdminEmail } from "@/lib/admin";
import { suspendInstructor } from "@/lib/billing/suspendInstructor";

// Approving/rejecting ANOTHER instructor's row needs a privileged write: the
// instructors RLS policy only lets a user read/write their OWN row
// (id = current_app_user_id()), which is correct for everyone except this
// one admin screen. The regular client here only proves who's asking.
async function requireAdmin() {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  if (!isAdminEmail(user.email)) redirect("/");
}

export async function approveInstructor(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await setInstructorStatus(id, "approved");
  revalidatePath("/admin");
}

export async function rejectInstructor(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await setInstructorStatus(id, "rejected");
  revalidatePath("/admin");
}

// Suspension d'un kiné (Philippe, 2026-10-07) : accès coupé, abonnements de
// ses patients résiliés et période non utilisée remboursée — détail dans
// lib/billing/suspendInstructor.ts. Le bilan revient dans l'URL pour être
// affiché en haut de /admin.
export async function suspendInstructorAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  let query: string;
  try {
    const r = await suspendInstructor(id);
    query = `suspended=1&cancelled=${r.cancelled}&refunds=${r.refunds}&cents=${r.refundedCents}&failures=${r.failures}`;
  } catch (e) {
    console.error("[admin] suspension :", e);
    query = `error=${encodeURIComponent("La suspension a échoué. Réessayez : les étapes déjà faites ne seront pas refaites.")}`;
  }
  revalidatePath("/admin");
  redirect(`/admin?${query}`);
}

// Réactiver un kiné suspendu : il retrouve son dashboard. Les abonnements
// résiliés ne reviennent pas — ses patients choisiront à nouveau une offre.
export async function reactivateInstructor(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await setInstructorStatus(id, "approved");
  revalidatePath("/admin");
}
