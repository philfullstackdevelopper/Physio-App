"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Instructor invites a new patient by email. Creates the patient's account,
// emails them an invite link to set their password, and records the patient row.
export async function addPatient(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();

  if (!fullName || !email) {
    redirect(`/dashboard/patients/new?error=${encodeURIComponent("Veuillez remplir tous les champs.")}`);
  }

  const hdrs = await headers();
  const origin = hdrs.get("origin") ?? `https://${hdrs.get("host")}`;

  // Create the patient's auth account and send the invite email (admin action).
  const admin = createAdminClient();
  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
    email,
    {
      data: { full_name: fullName, role: "patient" },
      redirectTo: `${origin}/auth/confirm?next=/auth/set-password`,
    },
  );

  if (inviteError || !invited?.user) {
    redirect(
      `/dashboard/patients/new?error=${encodeURIComponent(inviteError?.message ?? "Impossible d'inviter ce patient.")}`,
    );
  }

  // Record the patient, owned by the current instructor. Done with the instructor's
  // own session so the patients RLS policy (instructor_id = auth.uid()) is enforced.
  const { error: patientError } = await supabase.from("patients").insert({
    id: invited.user.id,
    instructor_id: user.id,
    full_name: fullName,
    email,
  });

  if (patientError) {
    redirect(
      `/dashboard/patients/new?error=${encodeURIComponent("Invitation envoyée mais patient non enregistré : " + patientError.message)}`,
    );
  }

  revalidatePath("/dashboard/patients");
  redirect("/dashboard/patients");
}
