"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { setInstructorStatus } from "@/lib/db/admin";
import { isAdminEmail } from "@/lib/admin";
import { suspendInstructor } from "@/lib/billing/suspendInstructor";
import { runMonthlyInvoicing } from "@/lib/billing/platformInvoice";

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

// Réactiver un kiné suspendu : il retrouve son dashboard. Les abonnements
// résiliés ne reviennent pas — ses patients choisiront à nouveau une offre.
export async function reactivateInstructor(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await setInstructorStatus(id, "approved");
  revalidatePath("/admin");
}

// Facture EasyPhysio du mois écoulé à chaque kiné (nouveau modèle,
// 2026-10-24) : patients actifs × 3 € HT + TVA, premier mois offert, jamais
// deux fois le même mois (lib/billing/platformInvoice.ts). À lancer en début
// de mois depuis /admin ; le bilan revient dans l'URL.
export async function invoiceLastMonth(formData: FormData) {
  await requireAdmin();
  const period = String(formData.get("period") ?? "");
  if (!/^\d{4}-\d{2}-01$/.test(period)) redirect(`/admin?error=${encodeURIComponent("Mois invalide.")}`);
  let q: string;
  try {
    const r = await runMonthlyInvoicing(period);
    q = new URLSearchParams({
      facture: period,
      factures: String(r.invoiced.filter((i) => !i.free).length),
      offerts: String(r.invoiced.filter((i) => i.free).length),
      sans_moyen: String(r.missingPaymentMethod.length),
      deja: String(r.alreadyDone.length),
      erreurs: String(r.errors.length),
    }).toString();
  } catch (e) {
    console.error("invoiceLastMonth:", e);
    q = `error=${encodeURIComponent("Facturation impossible (la migration 0071 est-elle appliquée ?).")}`;
  }
  revalidatePath("/admin");
  redirect(`/admin?${q}`);
}
