"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";

// Envoie un message depuis la boîte de réception du kiné (/dashboard/messages).
// Même contrôle que l'ancienne fiche patient (sendMessage) : patient et corps
// non vides, insertion en tant qu'instructeur, RLS revérifie que le patient
// lui appartient bien.
export async function sendInboxMessage(formData: FormData) {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const patientId = String(formData.get("patient_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();

  const fail = (msg: string): never =>
    redirect(`/dashboard/messages?patient=${patientId}&error=${encodeURIComponent(msg)}`);

  if (!patientId) fail("Patient introuvable.");
  if (!body) fail("Le message ne peut pas être vide.");

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
