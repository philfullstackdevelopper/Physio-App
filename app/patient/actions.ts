"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { friendlyDbError } from "@/lib/format/dbError";

// First step of patient onboarding, gated in app/patient/layout.tsx.
// patients_update_by_instructor is the only ordinary UPDATE policy on
// `patients` (see supabase/migrations/0001) — a patient has no RLS path to
// write their own row directly, so this goes through the narrow
// accept_patient_terms() RPC instead (supabase/migrations/0057), which only
// ever touches terms_accepted_at and only for the calling patient's own id.
// Renvoie l'erreur au formulaire (useActionState dans PatientWelcomeGate) au
// lieu de rediriger vers /patient?error=… : la barrière CGU s'affiche à la
// place de la page, qui ne lisait jamais ce paramètre — l'échec était muet
// (Philippe, 2026-10-07).
export async function acceptTerms(): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const { error } = await supabase.rpc("accept_patient_terms", { p_patient_id: user.id });
  if (error) {
    return { error: "L'acceptation n'a pas pu être enregistrée. Vérifiez votre connexion et réessayez." };
  }

  revalidatePath("/patient", "layout");
  return { error: null };
}

// Patient marks every unread message from their instructor as read (the
// kiné then sees the double check mark on those messages).
export async function markMessageRead() {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  await supabase
    .from("patient_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("patient_id", user.id)
    .eq("sender", "instructor")
    .is("read_at", null);

  revalidatePath("/patient");
  revalidatePath("/patient/messages");
  redirect("/patient/messages");
}

// Ouvrir la page Messages suffit à lire les messages du kiné (audit du
// 2026-10-08) : avant, le badge et l'accusé de lecture côté kiné restaient
// tant que le patient n'avait pas appuyé sur « Marquer comme lu ». Appelée
// par MarkThreadRead à l'ouverture, sans redirection (le paramètre est
// ignoré : un patient ne lit que SES messages).
export async function markMessagesSeenOnOpen(_patientId: string) {
  void _patientId;
  const supabase = await createClient();
  const user = await requireUser(supabase);
  await supabase
    .from("patient_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("patient_id", user.id)
    .eq("sender", "instructor")
    .is("read_at", null);
  revalidatePath("/patient", "layout");
}

// Patient sends a message to their own instructor. No rate limiting: patients
// are known to their kiné, this is not an open public inbox.
export async function sendPatientMessage(formData: FormData) {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const body = String(formData.get("body") ?? "").trim();
  if (!body) {
    redirect(`/patient/messages?error=${encodeURIComponent("Écrivez un message.")}`);
  }

  const { data: patient } = await supabase
    .from("patients")
    .select("instructor_id, instructors ( status )")
    .eq("id", user.id)
    .maybeSingle();
  if (!patient?.instructor_id) {
    redirect(`/patient/messages?error=${encodeURIComponent("Kiné introuvable.")}`);
  }
  // Kiné suspendu (2026-10-07) : il n'a plus accès à son espace, un message
  // ne serait jamais lu.
  if ((patient!.instructors as unknown as { status: string | null } | null)?.status === "suspended") {
    redirect(`/patient/messages?error=${encodeURIComponent("Votre kiné n'exerce plus sur EasyPhysio : la messagerie est fermée.")}`);
  }

  const { error } = await supabase.from("patient_messages").insert({
    patient_id: user.id,
    instructor_id: patient!.instructor_id,
    sender: "patient",
    body,
  });
  if (error) redirect(`/patient/messages?error=${encodeURIComponent(friendlyDbError(error))}`);

  revalidatePath("/patient");
  revalidatePath("/patient/messages");
  redirect("/patient/messages");
}
