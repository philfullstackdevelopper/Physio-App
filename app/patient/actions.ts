"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Patient marks a whole workout session as completed.
export async function completeWorkout(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

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

export async function signout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
