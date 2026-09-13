"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { setInstructorStatus } from "@/lib/db/admin";
import { isAdminEmail } from "@/lib/admin";

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
