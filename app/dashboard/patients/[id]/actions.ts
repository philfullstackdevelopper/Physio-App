"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { clerkClient } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { applyAdjustment, adjustmentMessage } from "@/lib/exercise/adjustPlan";
import { thisWeekStartDateKey } from "@/lib/patient/weeks";

// PatientActionsMenu is used both on the patient detail page and inline in
// the "Mes patients" table, so its forms carry where to land afterwards.
// Constrained to this feature's own routes — a hidden field is still
// attacker-editable form data, and redirect() must never be handed an
// unvalidated destination.
function ownRedirect(formData: FormData, fallback: string): string {
  const raw = String(formData.get("redirect_to") ?? "");
  return raw.startsWith("/dashboard/patients") ? raw : fallback;
}

// Instructor marks a patient as no longer paying (see supabase/migrations/0049 —
// this app has no automatic view into the instructor's own Stripe Connect
// account, so this is a manual record, not a webhook-driven one).
export async function markPaymentLapsed(formData: FormData) {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const patientId = String(formData.get("patient_id") ?? "");
  const dest = ownRedirect(formData, `/dashboard/patients/${patientId}`);
  const { error } = await supabase
    .from("patients")
    .update({ payment_lapsed_at: new Date().toISOString() })
    .eq("id", patientId)
    .eq("instructor_id", user.id);
  if (error) redirect(`/dashboard/patients/${patientId}?error=${encodeURIComponent(error.message)}`);

  revalidatePath(`/dashboard/patients/${patientId}`);
  revalidatePath("/dashboard/patients");
  redirect(dest);
}

// Reverses the above — the patient resumed paying, or it was marked by mistake.
export async function clearPaymentLapsed(formData: FormData) {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const patientId = String(formData.get("patient_id") ?? "");
  const dest = ownRedirect(formData, `/dashboard/patients/${patientId}`);
  const { error } = await supabase
    .from("patients")
    .update({ payment_lapsed_at: null })
    .eq("id", patientId)
    .eq("instructor_id", user.id);
  if (error) redirect(`/dashboard/patients/${patientId}?error=${encodeURIComponent(error.message)}`);

  revalidatePath(`/dashboard/patients/${patientId}`);
  revalidatePath("/dashboard/patients");
  redirect(dest);
}

// Permanently removes a patient: all their data (workout logs, profile,
// messages, documents, recommendations — every table with an
// `on delete cascade` FK to patients.id, see migration 0001 onward) plus the
// Clerk identity and the app_users email mapping, so the same email can later
// be invited fresh via the normal "Ajouter un patient" flow (addPatient in
// ../actions.ts) without hitting Clerk's "an account already exists" error.
//
// Bug fixed 2026-09-09: Clerk cleanup used to branch on our OWN app_users.clerk_id
// to decide "does a Clerk user already exist for this email" — but that column
// is only ever backfilled once the person actually logs into this app
// (resolveAppUserId, lib/auth/user-map.ts). Someone who accepted the invite and
// set a password, but never completed a first login here (their patients row
// vanished before that, as happened to a real patient — see the addPatient
// investigation), has a real Clerk user with clerk_id still null in our DB. The
// old code then took the "no clerk_id" branch, which only revokes *pending*
// invitations — an *accepted* one isn't pending, so nothing got revoked AND the
// live Clerk user was never deleted, permanently blocking every future
// re-invite of that email with "that email is taken". Fixed by asking Clerk
// directly (source of truth) instead of trusting our own possibly-stale record.
//
// Clerk cleanup is still best-effort: if it fails (API hiccup), the Supabase
// data — the part the instructor actually asked to remove — is deleted
// regardless. A failure there just means a future re-invite of that exact
// email may need a retry or Philippe's help clearing the stale Clerk identity.
export async function deletePatient(formData: FormData) {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const patientId = String(formData.get("patient_id") ?? "");
  const { data: patient } = await supabase
    .from("patients")
    .select("id, email")
    .eq("id", patientId)
    .eq("instructor_id", user.id)
    .maybeSingle();
  if (!patient) redirect(`/dashboard/patients/${patientId}?error=${encodeURIComponent("Patient introuvable.")}`);

  const admin = createAdminClient();

  try {
    const client = await clerkClient();
    const existingUsers = await client.users.getUserList({ emailAddress: [patient!.email] });
    if (existingUsers.data.length > 0) {
      await Promise.all(existingUsers.data.map((u) => client.users.deleteUser(u.id)));
    } else {
      const pending = await client.invitations.getInvitationList({ query: patient!.email, status: "pending" });
      await Promise.all(pending.data.map((inv) => client.invitations.revokeInvitation(inv.id)));
    }
  } catch (e) {
    console.error("deletePatient: Clerk cleanup failed", e);
  }

  await admin.from("app_users").delete().eq("email", patient!.email);

  const { error } = await supabase.from("patients").delete().eq("id", patientId).eq("instructor_id", user.id);
  if (error) redirect(`/dashboard/patients/${patientId}?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/dashboard/patients");
  redirect("/dashboard/patients");
}

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

// Assigns the patient's séance from a given week onward (migration 0047: a
// séance applies from a given week until a later assignment replaces it — see
// lib/exercise/activeRecommendation.ts). The week comes from the frise on the
// patient page (`week_start_date`, that week's Monday as "YYYY-MM-DD"); when
// the form doesn't send one we fall back to the current week. Upserts that
// week's row rather than wiping the patient's whole history: other weeks'
// assignments must stay in place for resolveWorkoutForWeek to keep resolving
// them correctly.
export async function addRecommendedWorkout(formData: FormData) {
  const supabase = await createClient();
  await requireUser(supabase);

  const patientId = String(formData.get("patient_id") ?? "");
  const workoutId = String(formData.get("workout_id") ?? "");
  if (!patientId || !workoutId) redirect(`/dashboard/patients/${patientId}`);

  // Only accept a well-formed "YYYY-MM-DD" — anything else (empty, tampered)
  // falls back to this week rather than sending garbage to the `date` column.
  const rawWeek = String(formData.get("week_start_date") ?? "");
  const weekStartDate = /^\d{4}-\d{2}-\d{2}$/.test(rawWeek) ? rawWeek : thisWeekStartDateKey();

  const { error } = await supabase
    .from("patient_recommended_workouts")
    .upsert(
      { patient_id: patientId, workout_id: workoutId, week_start_date: weekStartDate },
      { onConflict: "patient_id,week_start_date" },
    );
  if (error) redirect(`/dashboard/patients/${patientId}?error=${encodeURIComponent(error.message)}`);

  revalidatePath(`/dashboard/patients/${patientId}`);
  redirect(`/dashboard/patients/${patientId}`);
}

// Unassigns the patient's recommended workout, with no replacement.
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
  // Which assignment row (patient_recommended_workouts.id) to repoint at the
  // copy. Needed rather than matching on workout_id: since migration 0047 the
  // same séance can be assigned at two different periods (two rows), and
  // adjusting one of them must not silently repoint the other.
  const recId = String(formData.get("rec_id") ?? "");
  const removeIds = formData.getAll("remove_ids").map(String).filter(Boolean);
  const addIds = formData.getAll("add_ids").map(String).filter(Boolean);

  const fail = (msg: string): never => redirect(`/dashboard/patients/${patientId}?error=${encodeURIComponent(msg)}`);
  if (!patientId || !workoutId || !recId) return fail("Séance introuvable.");
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
      .eq("id", recId)
      .eq("patient_id", patientId)
      // Belt and braces: the row must really point at the séance we copied,
      // otherwise a stale form (page left open while the assignment changed)
      // would repoint the wrong assignment.
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
  if (next.length === 0) return fail("Une séance doit garder au moins un exercice.");

  const removedCount = current.filter((s) => removeIds.includes(s.exerciseId)).length;
  const addedCount = next.length - (current.length - removedCount);

  await supabase.from("workout_exercises").delete().eq("workout_id", targetId);
  if (next.length) {
    const { error: insertError } = await supabase
      .from("workout_exercises")
      .insert(next.map((s) => ({ workout_id: targetId, exercise_id: s.exerciseId, position: s.position })));
    if (insertError) {
      // Pas de transaction ici : on vient de vider la table, donc on
      // réinsère les lignes précédentes en meilleur effort (compensating
      // write) pour ne pas laisser la séance vide si l'insertion échoue.
      await supabase
        .from("workout_exercises")
        .insert(current.map((s) => ({ workout_id: targetId, exercise_id: s.exerciseId, position: s.position })));
      return fail(insertError.message);
    }
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
