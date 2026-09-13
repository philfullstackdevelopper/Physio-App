"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { setInstructorStatus } from "@/lib/db/admin";
import { verifyRpps } from "@/lib/instructor/rppsVerification";

// Saves the cabinet/practice details collected right after Clerk signup (see
// app/signup/onboarding/page.tsx).
//
// The cabinet fields go through the instructor's own RLS-scoped session
// (instructors_update_own already allows a self-row update). The `status`
// escalation to "approved" is handled separately, through the privileged
// setInstructorStatus() write: writing status through the instructor's own
// session would let any kiné self-approve by calling PostgREST directly,
// bypassing verifyRpps() entirely (see supabase/migrations/0057's
// admin_set_instructor_status(), deliberately unreachable from any session
// but the server's own trusted code).
export async function saveInstructorOnboarding(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: instructor } = await supabase
    .from("instructors")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  const cabinetName = String(formData.get("cabinet_name") ?? "").trim();
  const cabinetAddress = String(formData.get("cabinet_address") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const rppsNumber = String(formData.get("rpps_number") ?? "").replace(/\s+/g, "");
  const siret = String(formData.get("siret") ?? "").replace(/\s+/g, "") || null;

  const missing: string[] = [];
  if (!cabinetName) missing.push("le nom du cabinet");
  if (!cabinetAddress) missing.push("l'adresse du cabinet");
  if (!phone) missing.push("le téléphone professionnel");
  if (!rppsNumber) missing.push("le numéro RPPS ou ADELI");
  if (missing.length > 0) {
    redirect(`/signup/onboarding?error=${encodeURIComponent(`Champ(s) manquant(s) : ${missing.join(", ")}.`)}`);
  }
  if (!/^\d{9,11}$/.test(rppsNumber)) {
    redirect(
      `/signup/onboarding?error=${encodeURIComponent("Le numéro RPPS ou ADELI doit contenir uniquement des chiffres.")}`,
    );
  }
  if (siret && !/^\d{14}$/.test(siret)) {
    redirect(`/signup/onboarding?error=${encodeURIComponent("Le SIRET doit contenir 14 chiffres.")}`);
  }

  // A confirmed RPPS + name match (see lib/instructor/rppsVerification.ts)
  // skips the manual /admin approval queue entirely (Philippe, 2026-09-10),
  // same as the normal signup path in app/signup/finalize/page.tsx — an
  // unverified RPPS, or one whose name doesn't match, still needs a human.
  const verification = await verifyRpps(rppsNumber, instructor?.full_name ?? "");
  const autoApproved = verification.status === "verified";

  const { error } = await supabase
    .from("instructors")
    .update({
      cabinet_name: cabinetName,
      cabinet_address: cabinetAddress,
      phone,
      rpps_number: rppsNumber,
      siret,
      rpps_verified_at: verification.status === "verified" ? verification.verifiedAt : null,
    })
    .eq("id", user.id);

  if (error) {
    redirect(`/signup/onboarding?error=${encodeURIComponent(error.message)}`);
  }

  if (autoApproved) {
    await setInstructorStatus(user.id, "approved");
  }

  redirect(autoApproved ? "/dashboard" : "/signup/pending");
}
