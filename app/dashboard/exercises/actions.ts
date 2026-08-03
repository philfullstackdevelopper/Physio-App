"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import type { SupabaseClient } from "@supabase/supabase-js";

async function requireInstructor(supabase: SupabaseClient): Promise<string> {
  const user = await requireUser(supabase);
  const { data: instr } = await supabase
    .from("instructors")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  if (!instr) redirect("/patient");
  return user.id;
}

export async function createExercise(formData: FormData) {
  const supabase = await createClient();
  const userId = await requireInstructor(supabase);

  const name = String(formData.get("name") ?? "").trim();
  const instructions = String(formData.get("instructions") ?? "").trim() || null;
  if (!name) {
    redirect(`/dashboard/exercises?error=${encodeURIComponent("Nom requis.")}`);
  }

  const { error } = await supabase.from("exercises").insert({
    name,
    instructions,
    created_by: userId,
  });
  if (error) {
    redirect(`/dashboard/exercises?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard/exercises");
  redirect("/dashboard/exercises");
}
