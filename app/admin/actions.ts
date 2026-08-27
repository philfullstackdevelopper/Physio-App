"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin";

// Approving/rejecting ANOTHER instructor's row needs the service-role client:
// the instructors RLS policy only lets a user read/write their OWN row
// (id = auth.uid()), which is correct for everyone except this one admin
// screen. The regular client here only proves who's asking.
async function requireAdmin() {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  if (!isAdminEmail(user.email)) redirect("/");
}

export async function approveInstructor(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const admin = createAdminClient();
  await admin.from("instructors").update({ status: "approved" }).eq("id", id);
  revalidatePath("/admin");
}

export async function rejectInstructor(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const admin = createAdminClient();
  await admin.from("instructors").update({ status: "rejected" }).eq("id", id);
  revalidatePath("/admin");
}
