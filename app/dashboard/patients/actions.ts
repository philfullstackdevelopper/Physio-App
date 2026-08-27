"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { clerkClient } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { precreateAppUserId } from "@/lib/auth/user-map";
import { createAdminClient } from "@/lib/supabase/admin";

// Instructor invites a new patient by email. Creates the patient's Clerk
// account invitation (they choose their own password from the e-mail), and
// records the patient row owned by the inviting instructor.
export async function addPatient(formData: FormData) {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();

  if (!fullName || !email) {
    redirect(`/dashboard/patients/new?error=${encodeURIComponent("Veuillez remplir tous les champs.")}`);
  }

  const hdrs = await headers();
  const origin = hdrs.get("origin") ?? `https://${hdrs.get("host")}`;

  // Reserve the internal uuid BEFORE the invite goes out, so patients.id and
  // app_users.app_id agree from day one (resolveAppUserId will find this row
  // by email on the patient's first login and attach their Clerk id).
  let appId: string;
  try {
    ({ appId } = await precreateAppUserId(email));
  } catch (e) {
    redirect(
      `/dashboard/patients/new?error=${encodeURIComponent(e instanceof Error ? e.message : "Erreur interne.")}`,
    );
  }

  // Send the Clerk invitation. The patient sets their password via Clerk's own
  // flow — no Supabase invite link, no token confirmation route needed anymore.
  try {
    const client = await clerkClient();
    await client.invitations.createInvitation({
      emailAddress: email,
      redirectTo: `${origin}/login`,
      publicMetadata: { full_name: fullName, role: "patient" },
    });
  } catch (e) {
    redirect(
      `/dashboard/patients/new?error=${
        encodeURIComponent(
          e instanceof Error && e.message.includes("already")
            ? "Un compte existe déjà avec cette adresse."
            : "Impossible d'inviter ce patient.",
        )
      }`,
    );
  }

  // Record the patient, owned by the current instructor. Done with the
  // instructor's own session so the patients RLS policy is enforced.
  const { error: patientError } = await supabase.from("patients").insert({
    id: appId,
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
