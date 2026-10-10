"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireApprovedInstructor } from "@/lib/dashboard/requireApprovedInstructor";
import type { SupabaseClient } from "@supabase/supabase-js";
import { friendlyDbError } from "@/lib/format/dbError";

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
    redirect(`/dashboard/seances?error=${encodeURIComponent("Nom et condition requis.")}`);
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
    redirect(`/dashboard/seances?error=${encodeURIComponent(friendlyDbError(error))}`);
  }

  // Exercices choisis dans la fenêtre « Nouvelle séance », dans l'ordre de clic.
  const exerciseIds = formData.getAll("exercise_ids").map(String).filter(Boolean);
  if (exerciseIds.length) {
    const { error: exError } = await supabase
      .from("workout_exercises")
      .insert(exerciseIds.map((exId, i) => ({ workout_id: data.id, exercise_id: exId, position: i })));
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
  const { data: wk } = await supabase.from("workouts").select("created_by").eq("id", id).maybeSingle();
  if (!wk || wk.created_by !== userId) {
    redirect(`/dashboard/seances?error=${encodeURIComponent("Séance non modifiable.")}`);
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
  if (exerciseIds.length === 0) fail("Une séance doit garder au moins un exercice.");
  if (!name) fail("Le nom de la séance est requis.");

  const { error: updateError } = await supabase
    .from("workouts")
    .update({ name, condition_id: conditionId, stage, duration_minutes: duration, times_per_week: tpw })
    .eq("id", id);
  if (updateError) fail("Impossible d'enregistrer la séance : " + updateError.message);

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
  if (readError) fail("Impossible de lire les exercices de la séance : " + readError.message);
  const oldIds = (oldRows ?? []).map((r) => r.id as string);

  const rows = exerciseIds.map((exId, i) => ({ workout_id: id, exercise_id: exId, position: i }));
  const { data: inserted, error: insertError } = await supabase.from("workout_exercises").insert(rows).select("id");
  if (insertError) fail("Impossible d'enregistrer les exercices : " + insertError.message);

  if (oldIds.length) {
    const { error: deleteError } = await supabase.from("workout_exercises").delete().in("id", oldIds);
    if (deleteError) {
      const newIds = (inserted ?? []).map((r) => r.id as string);
      if (newIds.length) await supabase.from("workout_exercises").delete().in("id", newIds);
      fail("Impossible de mettre à jour les exercices : " + deleteError.message);
    }
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
      name: `${tpl.name} (copie)`,
      condition_id: tpl.condition_id,
      stage: tpl.stage,
      duration_minutes: tpl.duration_minutes,
      times_per_week: tpl.times_per_week,
      created_by: userId,
    })
    .select("id")
    .single();
  if (error) {
    redirect(`/dashboard/seances?error=${encodeURIComponent(friendlyDbError(error))}`);
  }

  const { data: exs } = await supabase
    .from("workout_exercises")
    .select("exercise_id, position")
    .eq("workout_id", templateId)
    .order("position");
  if (exs && exs.length) {
    const { error: exError } = await supabase.from("workout_exercises").insert(
      exs.map((e) => ({ workout_id: created.id, exercise_id: e.exercise_id, position: e.position })),
    );
    if (exError) {
      redirect(`/dashboard/seances/${created.id}?error=${encodeURIComponent("Exercices non copiés : " + exError.message)}`);
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
    redirect(`/dashboard/seances?error=${encodeURIComponent(friendlyDbError(error))}`);
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
    redirect(`/dashboard/seances?error=${encodeURIComponent(friendlyDbError(error))}`);
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
    redirect(`/dashboard/seances?error=${encodeURIComponent("Séance non trouvée.")}`);
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
    if (recCount) reasons.push(`recommandée à ${recCount} patient${recCount > 1 ? "s" : ""}`);
    if (logCount) reasons.push(`${logCount} séance${logCount > 1 ? "s" : ""} déjà enregistrée${logCount > 1 ? "s" : ""}`);
    redirect(
      `/dashboard/seances?error=${encodeURIComponent(
        `« ${wk.name} » ne peut pas être supprimée (${reasons.join(", ")}). Retirez-la des recommandations de ces patients d'abord.`,
      )}`,
    );
  }

  const { error: deleteError } = await supabase.from("workouts").delete().eq("id", id);
  if (deleteError) {
    // 23503 : la base refuse (migration 0063) — la séance a servi à des
    // patients, y compris ceux d'autres kinés (bibliothèque partagée).
    const message =
      deleteError.code === "23503"
        ? `« ${wk.name} » a déjà servi à des patients (les vôtres ou ceux d'autres kinés) : elle ne peut pas être supprimée, pour ne pas effacer leur historique.`
        : "Impossible de supprimer la séance : " + friendlyDbError(deleteError);
    redirect(`/dashboard/seances?error=${encodeURIComponent(message)}`);
  }
  revalidatePath("/dashboard/seances");
  redirect("/dashboard/seances");
}
