"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/supabase/require-user";
import { verifyRpps } from "@/lib/instructor/rppsVerification";

// Saves the cabinet/practice details collected right after Clerk signup (see
// app/signup/onboarding/page.tsx).
//
// Uses the admin client, NOT the instructor's own RLS-scoped client: this
// update can set `status` to "approved" (auto-approval on a confirmed RPPS
// match, Philippe 2026-09-10), and instructors_update_own
// (0031_rls_clerk_identity.sql) checks only row ownership, not which columns
// are written — same reasoning as instructor_connect_accounts living in its
// own table (see 0020_connect_pricing.sql). Writing `status` through the
// instructor's own session would let any kiné self-approve by calling
// Supabase directly, bypassing verifyRpps() entirely. requireUser() below
// already confirms identity, and .eq("id", user.id) scopes the write to
// their own row, so admin-client here is safe.
export async function saveInstructorOnboarding(formData: FormData) {
  const user = await requireUser();
  const supabase = createAdminClient();

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
      ...(autoApproved && { status: "approved" }),
    })
    .eq("id", user.id);

  if (error) {
    redirect(`/signup/onboarding?error=${encodeURIComponent(error.message)}`);
  }

  redirect(autoApproved ? "/dashboard" : "/signup/pending");
}
