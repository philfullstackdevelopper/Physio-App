"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";

// Envoie un message depuis la boîte de réception du kiné (/dashboard/messages).
export async function sendInboxMessage(formData: FormData) {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const patientId = String(formData.get("patient_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();

  const fail = (msg: string): never =>
    redirect(`/dashboard/messages?patient=${patientId}&error=${encodeURIComponent(msg)}`);

  if (!patientId) fail("Patient introuvable.");
  if (!body) fail("Écrivez un message.");

  const { error } = await supabase.from("patient_messages").insert({
    patient_id: patientId,
    instructor_id: user.id,
    sender: "instructor",
    body,
  });
  if (error) fail(error.message);

  revalidatePath("/dashboard/messages");
  revalidatePath("/dashboard");
  redirect(`/dashboard/messages?patient=${patientId}`);
}

// Marque comme lus les messages du patient sélectionné, dès qu'on ouvre sa
// conversation. Un plain `await supabase...update()` dans le composant serveur
// de la page fonctionnait déjà pour la donnée elle-même, mais revalidatePath
// ne peut s'appeler que dans une Server Action ou un Route Handler — pas
// pendant le rendu d'un composant serveur. Extrait ici pour pouvoir purger le
// badge "Messages" du layout du dashboard, sinon il reste affiché comme non
// lu jusqu'au prochain rechargement complet (Philippe, 2026-09-09).
export async function markConversationRead(patientId: string) {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  await supabase
    .from("patient_messages")
    .update({ read_by_instructor_at: new Date().toISOString() })
    .eq("instructor_id", user.id)
    .eq("patient_id", patientId)
    .eq("sender", "patient")
    .is("read_by_instructor_at", null);

  revalidatePath("/dashboard", "layout");
}

// « Ajouter un suivi » / « Retirer le suivi » : marque-page sur la
// conversation d'un patient (patients.follow_up_at). La politique RLS
// existante limite la mise à jour aux patients du kiné connecté.
export async function toggleFollowUp(formData: FormData) {
  const supabase = await createClient();
  await requireUser(supabase);

  const patientId = String(formData.get("patient_id") ?? "");
  const on = formData.get("follow_up") === "1";
  const tab = String(formData.get("tab") ?? "all");
  if (!patientId) redirect("/dashboard/messages");

  const { error } = await supabase
    .from("patients")
    .update({ follow_up_at: on ? new Date().toISOString() : null })
    .eq("id", patientId);
  if (error) {
    redirect(`/dashboard/messages?patient=${patientId}&error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard/messages");
  redirect(`/dashboard/messages?patient=${patientId}&tab=${tab}`);
}
