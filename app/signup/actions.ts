"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Creates a new INSTRUCTOR account, then saves their profile row in `instructors`.
export async function signup(formData: FormData) {
  const supabase = await createClient();

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();

  if (!email || !password || !fullName) {
    redirect(`/signup?error=${encodeURIComponent("Veuillez remplir tous les champs.")}`);
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });

  if (error || !data.user) {
    redirect(
      `/signup?error=${encodeURIComponent(error?.message ?? "Erreur lors de l'inscription.")}`,
    );
  }

  // With email confirmation OFF, signUp returns an active session, so this insert
  // runs as the new user and satisfies the instructors RLS policy (id = auth.uid()).
  const { error: profileError } = await supabase.from("instructors").insert({
    id: data.user.id,
    full_name: fullName,
    email,
  });

  if (profileError) {
    redirect(
      `/signup?error=${encodeURIComponent("Compte créé mais profil non enregistré : " + profileError.message)}`,
    );
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
