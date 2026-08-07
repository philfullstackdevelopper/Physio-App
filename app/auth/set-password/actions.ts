"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";

// The patient (already logged in via the invite link) chooses their password.
export async function setPassword(formData: FormData) {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const password = String(formData.get("password") ?? "");
  if (password.length < 6) {
    redirect(
      `/auth/set-password?error=${encodeURIComponent("Le mot de passe doit contenir au moins 6 caractères.")}`,
    );
  }

  // CGU acceptance: only enforced for patients who haven't already accepted
  // (same "ask once" shape as health_data_consent_at in the onboarding flow).
  const { data: patientRow } = await supabase
    .from("patients")
    .select("terms_accepted_at")
    .eq("id", user.id)
    .maybeSingle();
  if (patientRow && !patientRow.terms_accepted_at) {
    if (formData.get("terms_accepted") !== "on") {
      redirect(
        `/auth/set-password?error=${encodeURIComponent(
          "Merci d'accepter les conditions générales d'utilisation pour continuer.",
        )}`,
      );
    }
    await supabase
      .from("patients")
      .update({ terms_accepted_at: new Date().toISOString() })
      .eq("id", user.id);
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    redirect(`/auth/set-password?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
