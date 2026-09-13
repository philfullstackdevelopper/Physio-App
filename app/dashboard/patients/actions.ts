"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { clerkClient } from "@clerk/nextjs/server";
import { isClerkAPIResponseError } from "@clerk/shared/error";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { precreateAppUserId } from "@/lib/auth/user-map";
import type { ThreadMessage } from "@/components/MessageThread";

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

  const { data: instructor } = await supabase
    .from("instructors")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

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
  // redirectUrl must point at a page rendering <SignUp/> (not <SignIn/>):
  // that's the component that reads the __clerk_ticket Clerk appends to this
  // URL and completes the invited identity, instead of the generic
  // instructor-facing /signup marketing page. The kiné's name rides along as
  // a query param so /invitation can greet the patient by name.
  //
  // Bug fixed 2026-09-09: this was previously `redirectTo`, which isn't a
  // real field on Clerk's CreateParams — the SDK silently dropped it, so
  // every invitation fell back to Clerk's own generic hosted acceptance page
  // ("My Application", no EasyPhysio branding at all).
  try {
    const client = await clerkClient();
    await client.invitations.createInvitation({
      emailAddress: email,
      redirectUrl: `${origin}/invitation${instructor?.full_name ? `?kine=${encodeURIComponent(instructor.full_name)}` : ""}`,
      // instructor_name rides along in metadata (not just the redirect query
      // param above) so Clerk's own invitation EMAIL template can reference
      // {{public_metadata.instructor_name}} — the in-app /invitation page
      // was already personalized, the raw email itself wasn't.
      publicMetadata: { full_name: fullName, role: "patient", instructor_name: instructor?.full_name ?? null },
    });
  } catch (e) {
    // Clerk throws a ClerkAPIResponseError whose own top-level `.message` is
    // a generic summary (e.g. "Unprocessable Entity") — the actual reason
    // ("email already exists", "invitation already pending", ...) lives in
    // `.errors[]`, not `.message`. Matching on `.message` (as this used to)
    // meant the friendly duplicate-email message never fired, and every
    // failure — including a genuine duplicate — fell through to the same
    // opaque "Impossible d'inviter ce patient." with no way to diagnose it.
    const clerkErrors = isClerkAPIResponseError(e) ? e.errors : [];
    // Full detail stays server-side only (console.error) — the redirect URL
    // must never carry Clerk's raw error text (browser history, referrer
    // headers, server access logs all see query params). The user only ever
    // gets one of a fixed set of pre-approved, code-mapped messages below.
    console.error("addPatient: Clerk invitation failed", clerkErrors.length ? clerkErrors : e);
    const isDuplicate = clerkErrors.some((ce) => ce.code === "duplicate_record" || ce.code === "form_identifier_exists");
    const isPending = clerkErrors.some((ce) => ce.code === "invitation_already_pending" || ce.code === "duplicate_invitation");
    const message = isDuplicate
      ? "Un compte existe déjà avec cette adresse."
      : isPending
        ? "Une invitation est déjà en attente pour cette adresse."
        : "Impossible d'inviter ce patient.";
    redirect(`/dashboard/patients/new?error=${encodeURIComponent(message)}`);
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

// Renvoie l'invitation Clerk à un patient qui n'a jamais accepté les CGU
// (patients.terms_accepted_at toujours null — voir PatientsTable, bouton
// « Réactiver »). N'a de sens que pour ce cas : un patient qui a déjà un
// compte actif mais n'a pas terminé son questionnaire santé n'a rien à
// recevoir de plus par ce biais (pas de rappel e-mail/SMS automatisé, voir
// CLAUDE.md §5).
export async function reactivatePatient(formData: FormData): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const patientId = String(formData.get("patient_id") ?? "");
  if (!patientId) return { error: "Patient introuvable." };

  const { data: patient } = await supabase
    .from("patients")
    .select("email, full_name, terms_accepted_at")
    .eq("id", patientId)
    .eq("instructor_id", user.id)
    .maybeSingle();
  if (!patient) return { error: "Patient introuvable." };
  if (patient.terms_accepted_at) return { error: "Ce patient a déjà activé son compte." };
  if (!patient.email) return { error: "Ce patient n'a pas d'adresse e-mail enregistrée." };

  const { data: instructor } = await supabase.from("instructors").select("full_name").eq("id", user.id).maybeSingle();

  const hdrs = await headers();
  const origin = hdrs.get("origin") ?? `https://${hdrs.get("host")}`;

  try {
    const client = await clerkClient();
    await client.invitations.createInvitation({
      emailAddress: patient.email,
      redirectUrl: `${origin}/invitation${instructor?.full_name ? `?kine=${encodeURIComponent(instructor.full_name)}` : ""}`,
      publicMetadata: { full_name: patient.full_name, role: "patient", instructor_name: instructor?.full_name ?? null },
    });
  } catch (e) {
    // Même logique de lecture d'erreur que addPatient ci-dessus : le détail
    // utile est dans `.errors[]`, jamais dans `.message`.
    const clerkErrors = isClerkAPIResponseError(e) ? e.errors : [];
    const isPending = clerkErrors.some((ce) => ce.code === "invitation_already_pending" || ce.code === "duplicate_invitation");
    if (isPending) return { ok: true }; // une invitation est déjà en cours — rien de plus à faire, pas une erreur à afficher
    console.error("reactivatePatient: Clerk invitation failed", clerkErrors.length ? clerkErrors : e);
    const isDuplicate = clerkErrors.some((ce) => ce.code === "duplicate_record" || ce.code === "form_identifier_exists");
    return {
      error: isDuplicate
        ? "Ce patient a déjà un compte : il doit simplement se reconnecter et accepter les CGU."
        : "Impossible de renvoyer l'invitation.",
    };
  }

  revalidatePath("/dashboard/patients");
  return { ok: true };
}

// =============================================================================
// Actions dédiées à la pop-up « Messages » ouverte directement depuis la liste
// des patients (PatientsTable). Même table et même format de fil que la boîte
// de réception complète (voir app/dashboard/messages/{page,actions}.tsx),
// mais sans redirection : on reste sur /dashboard/patients.
// =============================================================================

export async function getPatientThread(patientId: string): Promise<{ thread: ThreadMessage[] } | { error: string }> {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const { data: patient } = await supabase
    .from("patients")
    .select("id")
    .eq("id", patientId)
    .eq("instructor_id", user.id)
    .maybeSingle();
  if (!patient) return { error: "Patient introuvable." };

  const { data } = await supabase
    .from("patient_messages")
    .select("id, body, created_at, sender, read_at, read_by_instructor_at")
    .eq("instructor_id", user.id)
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false })
    .limit(50);
  const rows = [...(data ?? [])].reverse();

  const thread: ThreadMessage[] = rows.map((m) => ({
    id: m.id as string,
    body: m.body as string,
    created_at: m.created_at as string,
    sender: m.sender as string,
    read_at: (m.read_at as string | null) ?? null,
  }));

  await supabase
    .from("patient_messages")
    .update({ read_by_instructor_at: new Date().toISOString() })
    .eq("instructor_id", user.id)
    .eq("patient_id", patientId)
    .eq("sender", "patient")
    .is("read_by_instructor_at", null);

  revalidatePath("/dashboard/messages");
  revalidatePath("/dashboard");
  // The "Messages" badge count lives in app/dashboard/layout.tsx, a layout
  // shared by every /dashboard/* route — revalidating "/dashboard" as a page
  // doesn't touch it, so the badge could keep showing messages just marked
  // read here until a full reload (Philippe, 2026-09-09).
  revalidatePath("/dashboard", "layout");

  return { thread };
}

export async function sendPatientMessage(formData: FormData): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const patientId = String(formData.get("patient_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();

  if (!patientId) return { error: "Patient introuvable." };
  if (!body) return { error: "Écrivez un message." };

  const { error } = await supabase.from("patient_messages").insert({
    patient_id: patientId,
    instructor_id: user.id,
    sender: "instructor",
    body,
  });
  if (error) return { error: error.message };

  revalidatePath("/dashboard/messages");
  revalidatePath("/dashboard");
  return { ok: true };
}
