"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";

// The patient (already logged in via the invite link) chooses their password.
export async function setPassword(formData: FormData) {
  const supabase = await createClient();
  await requireUser(supabase);

  const password = String(formData.get("password") ?? "");
  if (password.length < 6) {
    redirect(
      `/auth/set-password?error=${encodeURIComponent("Le mot de passe doit contenir au moins 6 caractères.")}`,
    );
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    redirect(`/auth/set-password?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
