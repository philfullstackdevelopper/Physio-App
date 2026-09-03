"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { applyAdjustment, adjustmentMessage } from "@/lib/exercise/adjustPlan";

// Assigns a condition to a patient. The condition's workouts become available to
// the patient. Changing the condition clears any previous recommendations —
// they belonged to the old condition's workouts.
export async function assignCondition(formData: FormData) {
  const supabase = await createClient();
  await requireUser(supabase);

  const patientId = String(formData.get("patient_id") ?? "");
  const conditionId = String(formData.get("condition_id") ?? "");
  if (!patientId || !conditionId) {
    redirect(`/dashboard/patients/${patientId}?error=${encodeURIComponent("Veuillez choisir une condition.")}`);
  }

  const { error } = await supabase.from("patients").update({ condition_id: conditionId }).eq("id", patientId);
  if (error) {
    redirect(`/dashboard/patients/${patientId}?error=${encodeURIComponent(error.message)}`);
  }
  await supabase.from("patient_recommended_workouts").delete().eq("patient_id", patientId);

  revalidatePath(`/dashboard/patients/${patientId}`);
  redirect(`/dashboard/patients/${patientId}`);
}

// Sends a short message from the instructor to one of their patients (e.g.
// reacting to a recent session). RLS re-checks the patient is really theirs.
export async function sendMessage(formData: FormData) {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const patientId = String(formData.get("patient_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();

  const fail = (msg: string) =>
    redirect(`/dashboard/patients/${patientId}?error=${encodeURIComponent(msg)}`);

  if (!patientId) fail("Patient introuvable.");
  if (!body) fail("Le message ne peut pas être vide.");

  const { error } = await supabase.from("patient_messages").insert({
    patient_id: patientId,
    instructor_id: user.id,
    body,
  });
  if (error) fail(error.message);

  revalidatePath(`/dashboard/patients/${patientId}`);
  redirect(`/dashboard/patients/${patientId}`);
}

// Adds a workout to the patient's recommended list, at the end (lowest priority).
export async function addRecommendedWorkout(formData: FormData) {
  const supabase = await createClient();
  await requireUser(supabase);

  const patientId = String(formData.get("patient_id") ?? "");
  const workoutId = String(formData.get("workout_id") ?? "");
  if (!patientId || !workoutId) redirect(`/dashboard/patients/${patientId}`);

  const { data: last } = await supabase
    .from("patient_recommended_workouts")
    .select("priority")
    .eq("patient_id", patientId)
    .order("priority", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextPriority = ((last?.priority as number | undefined) ?? 0) + 1;

  const { error } = await supabase
    .from("patient_recommended_workouts")
    .insert({ patient_id: patientId, workout_id: workoutId, priority: nextPriority });
  if (error) redirect(`/dashboard/patients/${patientId}?error=${encodeURIComponent(error.message)}`);

  revalidatePath(`/dashboard/patients/${patientId}`);
  redirect(`/dashboard/patients/${patientId}`);
}

// Removes one workout from the patient's recommended list.
export async function removeRecommendedWorkout(formData: FormData) {
  const supabase = await createClient();
  await requireUser(supabase);

  const patientId = String(formData.get("patient_id") ?? "");
  const recId = String(formData.get("rec_id") ?? "");

  const { error } = await supabase.from("patient_recommended_workouts").delete().eq("id", recId);
  if (error) redirect(`/dashboard/patients/${patientId}?error=${encodeURIComponent(error.message)}`);

  revalidatePath(`/dashboard/patients/${patientId}`);
  redirect(`/dashboard/patients/${patientId}`);
}

// Swaps one recommended workout's priority with its neighbor — the whole
// "reordering" UI, on purpose: no drag-and-drop, just two arrows.
export async function moveRecommendedWorkout(formData: FormData) {
  const supabase = await createClient();
  await requireUser(supabase);

  const patientId = String(formData.get("patient_id") ?? "");
  const recId = String(formData.get("rec_id") ?? "");
  const direction = String(formData.get("direction") ?? "");

  const { data: rows } = await supabase
    .from("patient_recommended_workouts")
    .select("id, priority")
    .eq("patient_id", patientId)
    .order("priority");
  const list = rows ?? [];
  const idx = list.findIndex((r) => r.id === recId);
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;

  if (idx !== -1 && swapIdx >= 0 && swapIdx < list.length) {
    const a = list[idx];
    const b = list[swapIdx];
    await supabase.from("patient_recommended_workouts").update({ priority: b.priority }).eq("id", a.id);
    await supabase.from("patient_recommended_workouts").update({ priority: a.priority }).eq("id", b.id);
  }

  revalidatePath(`/dashboard/patients/${patientId}`);
  redirect(`/dashboard/patients/${patientId}`);
}

// « Ajuster la séance » : la séance devient une copie personnelle du patient
// (workouts.patient_id), la recommandation pointe vers la copie, puis les
// retraits/ajouts s'appliquent à la copie. Le patient reçoit un message.
// Voir docs/superpowers/specs/2026-09-03-kine-interface-redesign-design.md § 7.
// Schéma : migration 0044_patient_workouts.sql (workouts.patient_id, source_workout_id).
export async function adjustPatientWorkout(formData: FormData) {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const patientId = String(formData.get("patient_id") ?? "");
  const workoutId = String(formData.get("workout_id") ?? "");
  const removeIds = formData.getAll("remove_ids").map(String).filter(Boolean);
  const addIds = formData.getAll("add_ids").map(String).filter(Boolean);

  const fail = (msg: string): never => redirect(`/dashboard/patients/${patientId}?error=${encodeURIComponent(msg)}`);
  if (!patientId || !workoutId) return fail("Séance introuvable.");
  if (removeIds.length === 0 && addIds.length === 0) return redirect(`/dashboard/patients/${patientId}`);

  const { data: patient } = await supabase
    .from("patients")
    .select("id")
    .eq("id", patientId)
    .eq("instructor_id", user.id)
    .maybeSingle();
  if (!patient) return fail("Patient introuvable.");

  const { data: workout } = await supabase
    .from("workouts")
    .select("id, name, description, condition_id, stage, duration_minutes, times_per_week, patient_id")
    .eq("id", workoutId)
    .maybeSingle();
  if (!workout) return fail("Séance introuvable.");
  if (workout.patient_id && workout.patient_id !== patientId) return fail("Séance introuvable.");

  let targetId = workout.id as string;

  if (workout.patient_id !== patientId) {
    const { data: copy, error: copyError } = await supabase
      .from("workouts")
      .insert({
        name: workout.name,
        description: workout.description,
        condition_id: workout.condition_id,
        stage: workout.stage,
        duration_minutes: workout.duration_minutes,
        times_per_week: workout.times_per_week,
        created_by: user.id,
        patient_id: patientId,
        source_workout_id: workout.id,
      })
      .select("id")
      .single();
    if (copyError || !copy) return fail(copyError?.message ?? "Impossible de créer la séance du patient.");
    targetId = copy.id as string;

    const { data: originalRows } = await supabase
      .from("workout_exercises")
      .select("exercise_id, position")
      .eq("workout_id", workout.id);
    if (originalRows && originalRows.length) {
      const { error: copyExercisesError } = await supabase.from("workout_exercises").insert(
        originalRows.map((r) => ({ workout_id: targetId, exercise_id: r.exercise_id, position: r.position })),
      );
      if (copyExercisesError) return fail(copyExercisesError.message);
    }

    const { data: repointed, error: recError } = await supabase
      .from("patient_recommended_workouts")
      .update({ workout_id: targetId })
      .eq("patient_id", patientId)
      .eq("workout_id", workout.id)
      .select("id");
    if (recError) {
      await supabase.from("workouts").delete().eq("id", targetId);
      return fail(recError.message);
    }
    if (!repointed || repointed.length === 0) {
      await supabase.from("workouts").delete().eq("id", targetId);
      return fail("Cette séance n'est pas recommandée à ce patient.");
    }
  }

  const { data: currentRows } = await supabase
    .from("workout_exercises")
    .select("exercise_id, position")
    .eq("workout_id", targetId);
  const current = (currentRows ?? []).map((r) => ({ exerciseId: r.exercise_id as string, position: r.position as number }));
  const next = applyAdjustment(current, removeIds, addIds);

  const removedCount = current.filter((s) => removeIds.includes(s.exerciseId)).length;
  const addedCount = next.length - (current.length - removedCount);

  await supabase.from("workout_exercises").delete().eq("workout_id", targetId);
  if (next.length) {
    const { error: insertError } = await supabase
      .from("workout_exercises")
      .insert(next.map((s) => ({ workout_id: targetId, exercise_id: s.exerciseId, position: s.position })));
    if (insertError) return fail(insertError.message);
  }

  if (removedCount + addedCount > 0) {
    await supabase.from("patient_messages").insert({
      patient_id: patientId,
      instructor_id: user.id,
      sender: "instructor",
      body: adjustmentMessage(workout.name, removedCount, addedCount),
    });
  }

  revalidatePath(`/dashboard/patients/${patientId}`);
  revalidatePath("/patient");
  revalidatePath("/patient/seance-du-jour");
  redirect(`/dashboard/patients/${patientId}?adjusted=1`);
}
