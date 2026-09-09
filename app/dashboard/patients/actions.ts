"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { clerkClient } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { precreateAppUserId } from "@/lib/auth/user-map";
import { createAdminClient } from "@/lib/supabase/admin";
import { ATTACHMENT_BUCKET, isAttachmentPathFor } from "@/lib/messages/attachment";
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
    .select("id, body, created_at, sender, read_at, read_by_instructor_at, attachment_path, attachment_name")
    .eq("instructor_id", user.id)
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false })
    .limit(50);
  const rows = [...(data ?? [])].reverse();

  // Liens signés (1 h) pour les pièces jointes du fil affiché.
  const paths = rows.map((m) => m.attachment_path as string | null).filter((p): p is string => !!p);
  const signed = new Map<string, string>();
  if (paths.length > 0) {
    const { data: urls } = await supabase.storage.from(ATTACHMENT_BUCKET).createSignedUrls(paths, 3600);
    for (const u of urls ?? []) if (u.path && u.signedUrl) signed.set(u.path, u.signedUrl);
  }

  const thread: ThreadMessage[] = rows.map((m) => ({
    id: m.id as string,
    body: m.body as string,
    created_at: m.created_at as string,
    sender: m.sender as string,
    read_at: (m.read_at as string | null) ?? null,
    attachment_name: (m.attachment_name as string | null) ?? null,
    attachmentUrl: m.attachment_path ? (signed.get(m.attachment_path as string) ?? null) : null,
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

  return { thread };
}

export async function sendPatientMessage(formData: FormData): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const patientId = String(formData.get("patient_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  const attachmentPath = String(formData.get("attachment_path") ?? "") || null;
  const attachmentName = String(formData.get("attachment_name") ?? "") || null;

  if (!patientId) return { error: "Patient introuvable." };
  if (!body && !attachmentPath) return { error: "Écrivez un message ou joignez un fichier." };
  if (attachmentPath && !isAttachmentPathFor(attachmentPath, patientId)) return { error: "Pièce jointe invalide." };

  const { error } = await supabase.from("patient_messages").insert({
    patient_id: patientId,
    instructor_id: user.id,
    sender: "instructor",
    body,
    attachment_path: attachmentPath,
    attachment_name: attachmentPath ? (attachmentName ?? "Fichier") : null,
  });
  if (error) return { error: error.message };

  revalidatePath("/dashboard/messages");
  revalidatePath("/dashboard");
  return { ok: true };
}
