"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireApprovedInstructor } from "@/lib/dashboard/requireApprovedInstructor";
import type { SupabaseClient } from "@supabase/supabase-js";
import { friendlyDbError } from "@/lib/format/dbError";
import { recordMonthlyReviewIfDue } from "@/lib/billing/autoReview";
import { doseColumnsFromForm, doseColumnsFromRow } from "@/lib/exercise/doseForm";
import { getTranslations } from "next-intl/server";

// Messages d'erreur dans la langue du kiné (cookie NEXT_LOCALE).
async function tx(key: string, values?: Record<string, string | number>): Promise<string> {
  return (await getTranslations("exercise.actions"))(key, values);
}
async function dbErr(error: Parameters<typeof friendlyDbError>[0]): Promise<string> {
  return friendlyDbError(error, undefined, await getTranslations("dashboard.lib"));
}

// Ensure the caller is an approved instructor; returns their user id.
// (Philippe, 2026-10-07 : délègue à la garde commune, qui vérifie aussi que
// le compte kiné a été validé — avant, un kiné « pending » passait ici.)
async function requireInstructor(supabase: SupabaseClient): Promise<string> {
  const { user } = await requireApprovedInstructor(supabase);
  return user.id;
}

// Create a new (empty) séance owned by the instructor, then open its editor.
export async function createSeance(formData: FormData) {
  const supabase = await createClient();
  const userId = await requireInstructor(supabase);

  const conditionId = String(formData.get("condition_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const stage = String(formData.get("stage") ?? "") || null;
  if (!conditionId || !name) {
    redirect(`/dashboard/seances?error=${encodeURIComponent(await tx("nameAndConditionRequired"))}`);
  }

  const { data, error } = await supabase
    .from("workouts")
    .insert({
      condition_id: conditionId,
      name,
      stage,
      created_by: userId,
      duration_minutes: 10,
      times_per_week: 3,
    })
    .select("id")
    .single();
  if (error) {
    redirect(`/dashboard/seances?error=${encodeURIComponent(await dbErr(error))}`);
  }

  // Exercices choisis dans la fenêtre « Nouvelle séance », dans l'ordre de clic.
  const exerciseIds = formData.getAll("exercise_ids").map(String).filter(Boolean);
  if (exerciseIds.length) {
    const { error: exError } = await supabase
      .from("workout_exercises")
      .insert(exerciseIds.map((exId, i) => ({ workout_id: data.id, exercise_id: exId, position: i, ...doseColumnsFromForm(formData, exId) })));
    if (exError) redirect(`/dashboard/seances/${data.id}?error=${encodeURIComponent(exError.message)}`);
  }

  // Venu d'une fiche patient (« Créer une séance ») : on y retourne pour
  // attribuer la nouvelle séance. Seule une fiche patient est acceptée.
  const returnTo = String(formData.get("return_to") ?? "");
  if (/^\/dashboard\/patients\/[0-9a-f-]{36}$/.test(returnTo)) redirect(returnTo);
  // Sinon : séance composée ici, retour à la liste.
  redirect(exerciseIds.length ? "/dashboard/seances" : `/dashboard/seances/${data.id}`);
}

// Save a séance's details AND its exercise list (add/remove).
export async function saveSeance(formData: FormData) {
  const supabase = await createClient();
  const userId = await requireInstructor(supabase);

  const id = String(formData.get("workout_id") ?? "");
  if (!id) redirect("/dashboard/seances");

  // Only the owning instructor can edit (platform séances are read-only).
  const { data: wk } = await supabase.from("workouts").select("created_by, patient_id").eq("id", id).maybeSingle();
  if (!wk || wk.created_by !== userId) {
    redirect(`/dashboard/seances?error=${encodeURIComponent(await tx("notEditable"))}`);
  }

  const name = String(formData.get("name") ?? "").trim();
  const conditionId = String(formData.get("condition_id") ?? "");
  const stage = String(formData.get("stage") ?? "") || null;
  const duration = Number(formData.get("duration_minutes")) || null;
  const tpw = Number(formData.get("times_per_week")) || null;

  // (Philippe, 2026-10-07 : chaque écriture est maintenant vérifiée — avant,
  // une erreur passait inaperçue et la page affichait quand même « Séance
  // enregistrée ».)
  const fail = (msg: string): never => redirect(`/dashboard/seances/${id}?error=${encodeURIComponent(msg)}`);

  // Replace the exercise list with the checked exercises (in DOM order).
  const exerciseIds = formData.getAll("exercise_ids").map(String).filter(Boolean);
  // Une séance sans exercice serait vide pour tous les patients qui l'ont
  // déjà attribuée — même règle que « Ajuster la séance ».
  if (exerciseIds.length === 0) fail(await tx("atLeastOne"));
  if (!name) fail(await tx("nameRequired"));

  const { error: updateError } = await supabase
    .from("workouts")
    .update({ name, condition_id: conditionId, stage, duration_minutes: duration, times_per_week: tpw })
    .eq("id", id);
  if (updateError) fail(await tx("saveFailed", { detail: updateError.message }));

  // Pas de transaction possible ici : pour ne jamais laisser la séance vide
  // (elle est partagée par tous les patients à qui elle est attribuée), on
  // insère d'abord la nouvelle liste, puis on supprime l'ancienne. Si
  // l'insertion échoue, l'ancienne liste reste intacte. Si c'est la
  // suppression qui échoue, on retire la nouvelle liste pour revenir à
  // l'état d'avant.
  const { data: oldRows, error: readError } = await supabase
    .from("workout_exercises")
    .select("id")
    .eq("workout_id", id);
  if (readError) fail(await tx("readFailed", { detail: readError.message }));
  const oldIds = (oldRows ?? []).map((r) => r.id as string);

  const rows = exerciseIds.map((exId, i) => ({ workout_id: id, exercise_id: exId, position: i, ...doseColumnsFromForm(formData, exId) }));
  const { data: inserted, error: insertError } = await supabase.from("workout_exercises").insert(rows).select("id");
  if (insertError) fail(await tx("saveExercisesFailed", { detail: insertError.message }));

  if (oldIds.length) {
    const { error: deleteError } = await supabase.from("workout_exercises").delete().in("id", oldIds);
    if (deleteError) {
      const newIds = (inserted ?? []).map((r) => r.id as string);
      if (newIds.length) await supabase.from("workout_exercises").delete().in("id", newIds);
      fail(await tx("updateExercisesFailed", { detail: deleteError.message }));
    }
  }

  // Séance personnelle d'un patient en suivi mensuel : l'enregistrer valide
  // son bilan du mois. Une séance partagée par plusieurs patients ne facture personne.
  if (wk?.patient_id) {
    await recordMonthlyReviewIfDue({ supabase, instructorId: userId, patientId: wk.patient_id as string, note: `Séance enregistrée : ${name}` });
    revalidatePath("/dashboard/facturation");
  }

  revalidatePath(`/dashboard/seances/${id}`);
  revalidatePath("/patient");
  redirect(`/dashboard/seances/${id}?saved=1`);
}

// Copy a platform séance (template) into a new séance owned by the instructor,
// including its exercises, then open its editor to customise.
export async function duplicateSeance(formData: FormData) {
  const supabase = await createClient();
  const userId = await requireInstructor(supabase);

  const templateId = String(formData.get("template_id") ?? "");
  if (!templateId) redirect("/dashboard/seances");

  const { data: tpl } = await supabase
    .from("workouts")
    .select("name, condition_id, stage, duration_minutes, times_per_week")
    .eq("id", templateId)
    .maybeSingle();
  if (!tpl) redirect("/dashboard/seances");

  const { data: created, error } = await supabase
    .from("workouts")
    .insert({
      name: await tx("copyName", { name: tpl.name }),
      condition_id: tpl.condition_id,
      stage: tpl.stage,
      duration_minutes: tpl.duration_minutes,
      times_per_week: tpl.times_per_week,
      created_by: userId,
    })
    .select("id")
    .single();
  if (error) {
    redirect(`/dashboard/seances?error=${encodeURIComponent(await dbErr(error))}`);
  }

  // select("*") : recopie aussi les doses (migration 0080) quand il y en a.
  const { data: exs } = await supabase
    .from("workout_exercises")
    .select("*")
    .eq("workout_id", templateId)
    .order("position");
  if (exs && exs.length) {
    const { error: exError } = await supabase.from("workout_exercises").insert(
      exs.map((e) => ({ workout_id: created.id, exercise_id: e.exercise_id, position: e.position, ...doseColumnsFromRow(e) })),
    );
    if (exError) {
      redirect(`/dashboard/seances/${created.id}?error=${encodeURIComponent(await tx("copyFailed", { detail: exError.message }))}`);
    }
  }

  redirect(`/dashboard/seances/${created.id}`);
}

// Hide a platform template from this instructor's own "Séances prévues" list.
// Personal filter only — the template itself and every other instructor's
// view of it are untouched (mirrors hideExercise in app/dashboard/exercises).
export async function hideTemplateWorkout(formData: FormData) {
  const supabase = await createClient();
  const userId = await requireInstructor(supabase);

  const workoutId = String(formData.get("workout_id") ?? "");
  if (!workoutId) redirect("/dashboard/seances");

  const { error } = await supabase
    .from("instructor_hidden_workouts")
    .insert({ instructor_id: userId, workout_id: workoutId });
  if (error) {
    redirect(`/dashboard/seances?error=${encodeURIComponent(await dbErr(error))}`);
  }

  revalidatePath("/dashboard/seances");
  redirect("/dashboard/seances");
}

// Reverses hideTemplateWorkout.
export async function unhideTemplateWorkout(formData: FormData) {
  const supabase = await createClient();
  const userId = await requireInstructor(supabase);

  const workoutId = String(formData.get("workout_id") ?? "");
  const { error } = await supabase
    .from("instructor_hidden_workouts")
    .delete()
    .eq("instructor_id", userId)
    .eq("workout_id", workoutId);
  if (error) {
    redirect(`/dashboard/seances?error=${encodeURIComponent(await dbErr(error))}`);
  }

  revalidatePath("/dashboard/seances");
  redirect("/dashboard/seances");
}

// Deleting a workout cascades in the database to its recommendations
// (patient_recommended_workouts) and completed-session history (workout_logs)
// — real adherence data, not just a pointer. So a séance currently
// recommended to a patient, or with any logged session, is never deletable:
// the kiné must unassign/reassign it first. Only unused séances (the common
// case for the broken/empty ones this button exists for) can go straight.
export async function deleteSeance(formData: FormData) {
  const supabase = await createClient();
  const userId = await requireInstructor(supabase);
  const id = String(formData.get("workout_id") ?? "");
  if (!id) redirect("/dashboard/seances");

  const { data: wk } = await supabase.from("workouts").select("created_by, name").eq("id", id).maybeSingle();
  if (!wk || wk.created_by !== userId) {
    redirect(`/dashboard/seances?error=${encodeURIComponent(await tx("notFound"))}`);
  }

  const [{ count: recCount }, { count: logCount }] = await Promise.all([
    supabase
      .from("patient_recommended_workouts")
      .select("id", { count: "exact", head: true })
      .eq("workout_id", id),
    supabase.from("workout_logs").select("id", { count: "exact", head: true }).eq("workout_id", id),
  ]);

  if ((recCount ?? 0) > 0 || (logCount ?? 0) > 0) {
    const reasons: string[] = [];
    if (recCount) reasons.push(await tx("recommendedTo", { count: recCount }));
    if (logCount) reasons.push(await tx("alreadyLogged", { count: logCount }));
    redirect(
      `/dashboard/seances?error=${encodeURIComponent(
        await tx("cannotDelete", { name: wk.name, reasons: reasons.join(", ") }),
      )}`,
    );
  }

  const { error: deleteError } = await supabase.from("workouts").delete().eq("id", id);
  if (deleteError) {
    // 23503 : la base refuse (migration 0063) — la séance a servi à des
    // patients, y compris ceux d'autres kinés (bibliothèque partagée).
    const message =
      deleteError.code === "23503"
        ? await tx("alreadyUsed", { name: wk.name })
        : await tx("deleteFailed", { detail: await dbErr(deleteError) });
    redirect(`/dashboard/seances?error=${encodeURIComponent(message)}`);
  }
  revalidatePath("/dashboard/seances");
  redirect("/dashboard/seances");
}
