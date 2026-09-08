"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { isAttachmentPathFor } from "@/lib/messages/attachment";

// Patient marks a whole workout session as completed.
export async function completeWorkout(formData: FormData) {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const workoutId = String(formData.get("workout_id") ?? "");
  if (!workoutId) redirect("/patient");

  const { error } = await supabase
    .from("workout_logs")
    .insert({ patient_id: user.id, workout_id: workoutId });
  if (error) {
    redirect(`/patient/${workoutId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/patient");
  revalidatePath(`/patient/${workoutId}`);
  redirect(`/patient/${workoutId}?done=1`);
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

// Patient sends a message to their own instructor. No rate limiting: patients
// are known to their kiné, this is not an open public inbox.
export async function sendPatientMessage(formData: FormData) {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const body = String(formData.get("body") ?? "").trim();
  const attachmentPath = String(formData.get("attachment_path") ?? "") || null;
  const attachmentName = String(formData.get("attachment_name") ?? "") || null;
  if (!body && !attachmentPath) {
    redirect(`/patient/messages?error=${encodeURIComponent("Écrivez un message ou joignez un fichier.")}`);
  }
  if (attachmentPath && !isAttachmentPathFor(attachmentPath, user.id)) {
    redirect(`/patient/messages?error=${encodeURIComponent("Pièce jointe invalide.")}`);
  }

  const { data: patient } = await supabase
    .from("patients")
    .select("instructor_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!patient?.instructor_id) {
    redirect(`/patient/messages?error=${encodeURIComponent("Kiné introuvable.")}`);
  }

  const { error } = await supabase.from("patient_messages").insert({
    patient_id: user.id,
    instructor_id: patient!.instructor_id,
    sender: "patient",
    body,
    attachment_path: attachmentPath,
    attachment_name: attachmentPath ? (attachmentName ?? "Fichier") : null,
  });
  if (error) redirect(`/patient/messages?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/patient");
  revalidatePath("/patient/messages");
  redirect("/patient/messages");
}
