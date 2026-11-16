"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { setInstructorStatus } from "@/lib/db/admin";
import { isAdminEmail } from "@/lib/admin";
import { rejectInstructorAndStopBilling, suspendInstructor } from "@/lib/billing/suspendInstructor";
import { adminMergeCabinets } from "@/lib/db/cabinets";

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
  // Comme la suspension (audit du 2026-11-10) : les patients d'un kiné refusé
  // entrent gratuitement dans l'appli, leurs abonnements sont donc arrêtés
  // chez Stripe d'abord. Un kiné jamais approuvé n'a en général aucun patient
  // abonné : dans ce cas rien n'est appelé chez Stripe.
  let query = "";
  try {
    await rejectInstructorAndStopBilling(id);
  } catch (e) {
    console.error("[admin] refus :", e);
    query = `?error=${encodeURIComponent("Le refus a échoué (arrêt des abonnements des patients chez Stripe). Réessayez : les étapes déjà faites ne seront pas refaites.")}`;
  }
  revalidatePath("/admin");
  if (query) redirect(`/admin${query}`);
}

// Suspension d'un kiné (Philippe, 2026-10-07) : accès coupé — détail dans
// lib/billing/suspendInstructor.ts. Le bilan revient dans l'URL pour être
// affiché en haut de /admin.
export async function suspendInstructorAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  let query: string;
  try {
    await suspendInstructor(id);
    query = "suspended=1";
  } catch (e) {
    console.error("[admin] suspension :", e);
    query = `error=${encodeURIComponent("La suspension a échoué. Réessayez : les étapes déjà faites ne seront pas refaites.")}`;
  }
  revalidatePath("/admin");
  redirect(`/admin?${query}`);
}

// Réactiver un kiné suspendu : il retrouve son dashboard.
export async function reactivateInstructor(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await setInstructorStatus(id, "approved");
  revalidatePath("/admin");
}

// Fusion de deux cabinets en double (Philippe, 2026-11-16, migration 0091) :
// les kinés du doublon passent dans le cabinet gardé, puis le doublon est
// supprimé. Les exercices partagés suivent leur auteur.
export async function mergeCabinets(formData: FormData) {
  await requireAdmin();
  const source = String(formData.get("source") ?? "");
  const target = String(formData.get("target") ?? "");
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID.test(source) || !UUID.test(target) || source === target) return;
  try {
    await adminMergeCabinets(source, target);
  } catch (e) {
    console.error("[admin] fusion de cabinets impossible", e);
  }
  revalidatePath("/admin");
}
