"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";

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

// Patient marks a message from their instructor as read.
export async function markMessageRead(formData: FormData) {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const messageId = String(formData.get("message_id") ?? "");
  if (!messageId) redirect("/patient");

  await supabase
    .from("patient_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("id", messageId)
    .eq("patient_id", user.id);

  revalidatePath("/patient");
  redirect("/patient");
}
