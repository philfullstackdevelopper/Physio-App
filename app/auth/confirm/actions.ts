"use server";

import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Verifies the one-time token only when the user actively clicks "Continuer"
// on the confirmation page — never on the initial GET of the email link.
// Mail providers (Gmail, Outlook…) prefetch/scan links for safety, which would
// otherwise burn the single-use token before a human ever sees it.
export async function confirmToken(formData: FormData) {
  const token_hash = String(formData.get("token_hash") ?? "");
  const type = String(formData.get("type") ?? "") as EmailOtpType;
  const next = String(formData.get("next") ?? "") || "/dashboard";

  const invalidLink = () =>
    redirect(
      `/login?error=${encodeURIComponent("Lien invalide ou expiré. Demandez une nouvelle invitation.")}`,
    );

  if (!token_hash || !type) invalidLink();

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash });
  if (error) invalidLink();

  redirect(next);
}
