"use server";

import { recordMonthlyReviewIfDue } from "@/lib/billing/autoReview";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { clerkClient } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";
import { requireApprovedInstructor } from "@/lib/dashboard/requireApprovedInstructor";
import { applyAdjustment, adjustmentMessage } from "@/lib/exercise/adjustPlan";
import { thisWeekStartDateKey } from "@/lib/patient/weeks";
import { deleteClerkUserWithRetry } from "@/lib/auth/deleteClerkUser";
import { deleteAppUserById } from "@/lib/db/admin";
import { getStripe } from "@/lib/billing/stripe";
import { resolveAppUserId, precreateAppUserId } from "@/lib/auth/user-map";
import { friendlyDbError } from "@/lib/format/dbError";
import { getTranslations } from "next-intl/server";
import { getLocaleByAppId } from "@/lib/db/locale";
import { localizeDbText } from "@/lib/i18n/dbContent";
import { getLibI18n } from "@/lib/dashboard/libI18n";

import { doseColumnsFromForm, doseColumnsFromRow, type DoseColumns } from "@/lib/exercise/doseForm";
import { notifyNewMessage } from "@/lib/push/notify";

// Traducteur « dashboard.lib » pour friendlyDbError (langue du kiné).
const tLib = async () => (await getLibI18n()).t;
// Messages d'erreur de ce fichier (langue du kiné).
const tActions = () => getTranslations("dashboard.patientActions");

// PatientActionsMenu is used both on the patient detail page and inline in
// the "Mes patients" table, so its forms carry where to land afterwards.
// Constrained to this feature's own routes — a hidden field is still
// attacker-editable form data, and redirect() must never be handed an
// unvalidated destination.
function ownRedirect(formData: FormData, fallback: string): string {
  const raw = String(formData.get("redirect_to") ?? "");
  return raw.startsWith("/dashboard/patients") ? raw : fallback;
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
  const { user } = await requireApprovedInstructor(supabase);

  const patientId = String(formData.get("patient_id") ?? "");
  const { data: patient } = await supabase
    .from("patients")
    .select("id, email")
    .eq("id", patientId)
    .eq("instructor_id", user.id)
    .maybeSingle();
  if (!patient) redirect(`/dashboard/patients/${patientId}?error=${encodeURIComponent((await tActions())("notFound"))}`);

  // Ordre revu (Philippe, 2026-10-07) : avant, l'identité Clerk et la ligne
  // app_users étaient supprimées AVANT la ligne patients — si cette dernière
  // échouait, il restait un patient sans compte de connexion, impossible à
  // réinviter proprement. Désormais :
  //   1. on supprime la ligne patients (la donnée que le kiné a demandé de
  //      retirer ; son suivi et sa carte enregistrée partent avec) et on
  //      s'arrête net en cas d'échec ;
  //   2. seulement ensuite, le nettoyage Clerk (toujours en meilleur effort) ;
  //   3. puis la correspondance app_users, via la connexion serveur directe
  //      (lib/db/admin.ts) et non plus via PostgREST, qui n'y a plus accès.
  // 0. Formule en cours (2026-11-02) : arrêtée tout de suite chez Stripe,
  // sinon le patient supprimé continuerait d'être prélevé.
  // Lecture en échec : on ABANDONNE (audit du 2026-11-10, A2) — sinon l'arrêt
  // chez Stripe serait sauté, la fiche supprimée, et le patient encore prélevé.
  const { data: sub, error: subError } = await supabase
    .from("subscriptions")
    .select("stripe_subscription_id, stripe_account_id, status")
    .eq("user_id", patientId)
    .maybeSingle();
  if (subError) {
    console.error("deletePatient: lecture de l'abonnement impossible", subError);
    redirect(`/dashboard/patients/${patientId}?error=${encodeURIComponent((await tActions())("cancelSubFailed"))}`);
  }
  // Abonnement d'accès : compte EasyPhysio (stripe_account_id vide) ; ancienne formule : compte du kiné.
  if (sub?.stripe_subscription_id && sub.status !== "canceled") {
    try {
      await getStripe().subscriptions.cancel(
        sub.stripe_subscription_id as string,
        undefined,
        sub.stripe_account_id ? { stripeAccount: sub.stripe_account_id as string } : undefined,
      );
    } catch (e) {
      if ((e as { code?: string })?.code !== "resource_missing") {
        console.error("deletePatient: résiliation Stripe impossible", e);
        redirect(`/dashboard/patients/${patientId}?error=${encodeURIComponent((await tActions())("cancelSubFailed"))}`);
      }
    }
  }

  const { error } = await supabase.from("patients").delete().eq("id", patientId).eq("instructor_id", user.id);
  if (error) redirect(`/dashboard/patients/${patientId}?error=${encodeURIComponent(friendlyDbError(error, undefined, await tLib()))}`);

  // Sécurité (audit du 2026-10-08) : l'e-mail de la fiche patient est une
  // donnée modifiable — on ne supprime JAMAIS un compte de connexion sur la
  // seule foi de cet e-mail, sinon un kiné qui y mettrait l'adresse de
  // quelqu'un d'autre ferait supprimer le compte de cette personne. Chaque
  // compte Clerk trouvé n'est supprimé que si son identifiant interne est
  // exactement celui du patient supprimé.
  try {
    const client = await clerkClient();
    const existingUsers = await client.users.getUserList({ emailAddress: [patient!.email] });
    if (existingUsers.data.length > 0) {
      for (const u of existingUsers.data) {
        const email = u.primaryEmailAddress?.emailAddress ?? patient!.email;
        // Plusieurs tentatives : sans ça, un raté passager de Clerk laissait
        // l'identifiant en place et l'e-mail impossible à réinviter (2026-10-10).
        if ((await resolveAppUserId(u.id, email)) === patientId) await deleteClerkUserWithRetry(u.id);
      }
    } else {
      // Invitation jamais acceptée : on ne la révoque que si l'e-mail est bien
      // réservé à CE patient (identifiant réservé à l'invitation, addPatient).
      const { appId, isNew } = await precreateAppUserId(patient!.email);
      if (isNew) {
        await deleteAppUserById(appId); // l'e-mail n'appartenait à personne : on n'a rien créé
      } else if (appId === patientId) {
        const pending = await client.invitations.getInvitationList({ query: patient!.email, status: "pending" });
        await Promise.all(pending.data.map((inv) => client.invitations.revokeInvitation(inv.id)));
      }
    }
  } catch (e) {
    console.error("deletePatient: Clerk cleanup failed", e);
  }

  try {
    await deleteAppUserById(patientId);
  } catch (e) {
    // Le patient est déjà supprimé : on ne bloque pas le kiné pour ça, mais
    // la trace reste côté serveur pour un nettoyage manuel éventuel.
    console.error("deletePatient: app_users cleanup failed", e);
  }

  revalidatePath("/dashboard/patients");
  redirect("/dashboard/patients");
}

// Assigns a condition to a patient. The condition's workouts become available to
// the patient. Changing the condition clears any previous recommendations —
// they belonged to the old condition's workouts.
export async function assignCondition(formData: FormData) {
  const supabase = await createClient();
  await requireApprovedInstructor(supabase);

  const patientId = String(formData.get("patient_id") ?? "");
  const conditionId = String(formData.get("condition_id") ?? "");
  if (!patientId || !conditionId) {
    redirect(`/dashboard/patients/${patientId}?error=${encodeURIComponent((await tActions())("chooseCondition"))}`);
  }

  const { data: before } = await supabase.from("patients").select("condition_id").eq("id", patientId).maybeSingle();
  const previousConditionId = (before?.condition_id as string | null) ?? null;

  const { error } = await supabase.from("patients").update({ condition_id: conditionId }).eq("id", patientId);
  if (error) {
    redirect(`/dashboard/patients/${patientId}?error=${encodeURIComponent(friendlyDbError(error, undefined, await tLib()))}`);
  }
  // Only when REPLACING a condition (ConditionSelect confirms that first).
  // A first condition must keep the séances already assigned: the kiné can
  // assign a séance before any condition, and setting one afterwards — which
  // the « Condition à renseigner » nudge now asks for — used to silently
  // wipe them (Philippe, 2026-10-01, patient Padraig).
  if (previousConditionId && previousConditionId !== conditionId) {
    // Vérifié (audit du 2026-11-10, A6) : sans ça, un échec laissait la
    // nouvelle pathologie avec les séances de l'ancienne, sans rien dire.
    const { error: clearError } = await supabase.from("patient_recommended_workouts").delete().eq("patient_id", patientId);
    if (clearError) {
      console.error("assignCondition: séances de l'ancienne pathologie non retirées", clearError);
      // On remet l'ancienne pathologie pour ne pas rester à moitié appliqué.
      const { error: revertError } = await supabase.from("patients").update({ condition_id: previousConditionId }).eq("id", patientId);
      if (revertError) console.error("assignCondition: retour à l'ancienne pathologie impossible", revertError);
      redirect(`/dashboard/patients/${patientId}?error=${encodeURIComponent(friendlyDbError(clearError, undefined, await tLib()))}`);
    }
  }

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
//
// Exercices ajoutés / retirés / doses modifiées AVANT d'appliquer (Philippe,
// 2026-11-05 : « pouvoir y ajouter / enlever ce qui les arrange au moment
// d'assigner ») : la séance attribuée devient aussitôt la copie personnelle
// du patient, exactement comme « Ajuster la séance » juste après.
export async function addRecommendedWorkout(formData: FormData) {
  const supabase = await createClient();
  const { user } = await requireApprovedInstructor(supabase);

  const patientId = String(formData.get("patient_id") ?? "");
  const workoutId = String(formData.get("workout_id") ?? "");
  if (!patientId || !workoutId) redirect(`/dashboard/patients/${patientId}`);

  // Only accept a well-formed "YYYY-MM-DD" — anything else (empty, tampered)
  // falls back to this week rather than sending garbage to the `date` column.
  const rawWeek = String(formData.get("week_start_date") ?? "");
  // …et un LUNDI (audit du 2026-10-08) : une autre date décalait la semaine.
  const isMonday = (key: string) => {
    const [y, m, d] = key.split("-").map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDay() === 1;
  };
  const weekStartDate = /^\d{4}-\d{2}-\d{2}$/.test(rawWeek) && isMonday(rawWeek) ? rawWeek : thisWeekStartDateKey();

  // La séance doit être visible par ce kiné (sa bibliothèque ou celle de la
  // plateforme) et ne pas être la copie personnelle d'un AUTRE patient
  // (audit du 2026-10-08 : un formulaire modifié pouvait l'attribuer).
  const { data: workout } = await supabase.from("workouts").select("id, name, patient_id, times_per_week").eq("id", workoutId).maybeSingle();
  if (!workout || (workout.patient_id !== null && workout.patient_id !== patientId)) {
    redirect(`/dashboard/patients/${patientId}?error=${encodeURIComponent((await tActions())("cannotAssign"))}`);
  }

  // Pendant combien de semaines (migration 0059). Absent, vide ou hors 1-52
  // → null = jusqu'à la prochaine séance attribuée, comme avant.
  const rawCount = Number(formData.get("week_count") ?? "");
  const weekCount = Number.isInteger(rawCount) && rawCount >= 1 && rawCount <= 52 ? rawCount : null;

  const { data: rec, error } = await supabase
    .from("patient_recommended_workouts")
    .upsert(
      { patient_id: patientId, workout_id: workoutId, week_start_date: weekStartDate, week_count: weekCount },
      { onConflict: "patient_id,week_start_date" },
    )
    .select("id")
    .single();
  if (error) redirect(`/dashboard/patients/${patientId}?error=${encodeURIComponent(friendlyDbError(error, undefined, await tLib()))}`);

  // Patient en suivi mensuel : attribuer une séance valide le bilan du mois.
  await recordMonthlyReviewIfDue({ supabase, instructorId: user.id, patientId, note: `Séance attribuée : ${await localizeDbText(workout!.name as string, "fr")}` });

  let adjusted = false;
  if (rec && hasSeanceChanges(formData)) {
    const result = await applySeanceChanges({ supabase, userId: user.id, patientId, workoutId, recId: rec.id as string, formData });
    if ("error" in result) redirect(`/dashboard/patients/${patientId}?error=${encodeURIComponent(result.error)}`);
    adjusted = result.changed;
  }

  revalidatePath(`/dashboard/patients/${patientId}`);
  revalidatePath("/dashboard/facturation");
  revalidatePath("/patient");
  redirect(`/dashboard/patients/${patientId}${adjusted ? "?adjusted=1" : ""}`);
}

// Unassigns the patient's recommended workout, with no replacement.
export async function removeRecommendedWorkout(formData: FormData) {
  const supabase = await createClient();
  await requireApprovedInstructor(supabase);

  const patientId = String(formData.get("patient_id") ?? "");
  const recId = String(formData.get("rec_id") ?? "");

  const { error } = await supabase.from("patient_recommended_workouts").delete().eq("id", recId);
  if (error) redirect(`/dashboard/patients/${patientId}?error=${encodeURIComponent(friendlyDbError(error, undefined, await tLib()))}`);

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
  const { user } = await requireApprovedInstructor(supabase);

  const patientId = String(formData.get("patient_id") ?? "");
  const workoutId = String(formData.get("workout_id") ?? "");
  // Which assignment row (patient_recommended_workouts.id) to repoint at the
  // copy. Needed rather than matching on workout_id: since migration 0047 the
  // same séance can be assigned at two different periods (two rows), and
  // adjusting one of them must not silently repoint the other.
  const recId = String(formData.get("rec_id") ?? "");

  if (!patientId || !workoutId || !recId) redirect(`/dashboard/patients/${patientId}?error=${encodeURIComponent((await tActions())("sessionNotFound"))}`);
  if (!hasSeanceChanges(formData)) redirect(`/dashboard/patients/${patientId}`);

  const result = await applySeanceChanges({ supabase, userId: user.id, patientId, workoutId, recId, formData });
  if ("error" in result) redirect(`/dashboard/patients/${patientId}?error=${encodeURIComponent(result.error)}`);

  revalidatePath(`/dashboard/patients/${patientId}`);
  revalidatePath("/patient");
  redirect(`/dashboard/patients/${patientId}${result.changed ? "?adjusted=1" : ""}`);
}

/** Le formulaire porte-t-il des retraits, ajouts ou doses ? Modifier les
 *  séries/répétitions compte aussi comme un ajustement (migration 0080). */
function hasSeanceChanges(formData: FormData): boolean {
  return (
    formData.getAll("remove_ids").some(Boolean) ||
    formData.getAll("add_ids").some(Boolean) ||
    [...formData.keys()].some((k) => k.startsWith("dose_"))
  );
}

/** Applique retraits / ajouts / doses à la séance attribuée (ligne `recId`) :
 *  copie personnelle du patient d'abord si besoin, puis la nouvelle liste,
 *  un message au patient et le bilan du mois. Partagé par « Ajuster la
 *  séance » et l'attribution d'une séance modifiée avant d'être appliquée. */
async function applySeanceChanges({
  supabase,
  userId,
  patientId,
  workoutId,
  recId,
  formData,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  patientId: string;
  workoutId: string;
  recId: string;
  formData: FormData;
}): Promise<{ error: string } | { changed: boolean }> {
  const removeIds = formData.getAll("remove_ids").map(String).filter(Boolean);
  const t = await tActions();
  const addIds = formData.getAll("add_ids").map(String).filter(Boolean);

  const { data: patient } = await supabase
    .from("patients")
    .select("id")
    .eq("id", patientId)
    .eq("instructor_id", userId)
    .maybeSingle();
  if (!patient) return { error: t("notFound") };

  const { data: workout } = await supabase
    .from("workouts")
    .select("id, name, description, condition_id, stage, duration_minutes, times_per_week, patient_id")
    .eq("id", workoutId)
    .maybeSingle();
  if (!workout) return { error: t("sessionNotFound") };
  if (workout.patient_id && workout.patient_id !== patientId) return { error: t("sessionNotFound") };

  // La nouvelle liste est calculée AVANT de créer la copie : rien n'est
  // écrit si la séance resterait vide ou inchangée.
  // select("*") : lit aussi les doses (migration 0080).
  const { data: sourceRows } = await supabase.from("workout_exercises").select("*").eq("workout_id", workout.id);
  const current = (sourceRows ?? []).map((r) => ({ exerciseId: r.exercise_id as string, position: r.position as number }));
  const oldDose = new Map((sourceRows ?? []).map((r) => [r.exercise_id as string, doseColumnsFromRow(r)]));
  const next = applyAdjustment(current, removeIds, addIds);
  if (next.length === 0) return { error: t("keepOne") };

  // Dose de chaque exercice : celle saisie dans la fenêtre si l'exercice y
  // figurait (vide = règle habituelle), sinon celle d'avant.
  const doseFor = (exId: string): DoseColumns =>
    formData.has(`dose_sets_${exId}`) ? doseColumnsFromForm(formData, exId) : (oldDose.get(exId) ?? {});
  const sameDose = (a: DoseColumns, b: DoseColumns) => a.sets === b.sets && a.reps === b.reps && a.hold_seconds === b.hold_seconds;
  const dosesChanged = next.filter((s) => oldDose.has(s.exerciseId) && !sameDose(oldDose.get(s.exerciseId)!, doseFor(s.exerciseId))).length;
  const removedCount = current.filter((s) => removeIds.includes(s.exerciseId)).length;
  const addedCount = next.length - (current.length - removedCount);
  if (removedCount + addedCount + dosesChanged === 0) return { changed: false };

  let targetId = workout.id as string;
  let copied = false;

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
        created_by: userId,
        patient_id: patientId,
        source_workout_id: workout.id,
      })
      .select("id")
      .single();
    // Jamais le message brut de la base dans le navigateur (audit du 2026-11-10).
    if (copyError || !copy) return { error: friendlyDbError(copyError, t("copyFailed"), await tLib()) };
    targetId = copy.id as string;
    copied = true;

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
    if (recError || !repointed || repointed.length === 0) {
      const { error: undoError } = await supabase.from("workouts").delete().eq("id", targetId);
      if (undoError) console.error("applySeanceChanges: copie orpheline non supprimée", targetId, undoError);
      return { error: recError ? friendlyDbError(recError, undefined, await tLib()) : t("notRecommended") };
    }
  }

  // Copie neuve = vide : on y écrit directement la nouvelle liste. Sinon on
  // remplace la liste de la séance personnelle existante.
  if (!copied) {
    // Vérifié (audit du 2026-11-10, A6) : si le vidage échoue, on s'arrête
    // AVANT d'insérer — sinon la séance garderait l'ancienne liste en plus de
    // la nouvelle (ou l'insertion buterait sur les doublons).
    const { error: clearError } = await supabase.from("workout_exercises").delete().eq("workout_id", targetId);
    if (clearError) return { error: friendlyDbError(clearError, undefined, await tLib()) };
  }
  const { error: insertError } = await supabase
    .from("workout_exercises")
    .insert(next.map((s) => ({ workout_id: targetId, exercise_id: s.exerciseId, position: s.position, ...doseFor(s.exerciseId) })));
  if (insertError) {
    if (copied) {
      // La recommandation revient sur la séance d'origine, la copie part.
      // Écritures de retour vérifiées (audit du 2026-11-10, A6) : la copie
      // n'est supprimée QUE si la recommandation est bien revenue sur la
      // séance d'origine — sinon le patient perdrait sa séance attribuée.
      const { error: backError } = await supabase.from("patient_recommended_workouts").update({ workout_id: workout.id }).eq("id", recId);
      if (backError) {
        console.error("applySeanceChanges: retour à la séance d'origine impossible (copie vide laissée)", { recId, targetId }, backError);
      } else {
        const { error: undoError } = await supabase.from("workouts").delete().eq("id", targetId);
        if (undoError) console.error("applySeanceChanges: copie orpheline non supprimée", targetId, undoError);
      }
    } else {
      // Pas de transaction ici : on vient de vider la table, donc on
      // réinsère les lignes précédentes en meilleur effort (compensating
      // write) pour ne pas laisser la séance vide si l'insertion échoue.
      const { error: restoreError } = await supabase
        .from("workout_exercises")
        .insert(current.map((s) => ({ workout_id: targetId, exercise_id: s.exerciseId, position: s.position, ...(oldDose.get(s.exerciseId) ?? {}) })));
      if (restoreError) {
        console.error("applySeanceChanges: SÉANCE LAISSÉE VIDE, anciennes lignes non réinsérées", targetId, restoreError);
        return { error: t("sessionLeftEmpty") };
      }
    }
    return { error: friendlyDbError(insertError, undefined, await tLib()) };
  }

  // Message automatique écrit dans la langue du PATIENT (pas celle du kiné).
  // La note du bilan mensuel (document de facturation du kiné) reste en français.
  // Note du bilan mensuel : toujours en français (nom de séance compris).
  const message = adjustmentMessage(await localizeDbText(workout.name, "fr"), removedCount, addedCount, dosesChanged);
  const patientLocale = await getLocaleByAppId(patientId);
  const { error: messageError } = await supabase.from("patient_messages").insert({
    patient_id: patientId,
    instructor_id: userId,
    sender: "instructor",
    body: adjustmentMessage(
      // Nom de séance de la plateforme dans la langue du patient (lu ici dans celle du kiné).
      await localizeDbText(workout.name, patientLocale),
      removedCount,
      addedCount,
      dosesChanged,
      await getTranslations({ locale: patientLocale, namespace: "exercise.adjustMessage" }),
    ),
  });
  // La séance EST ajustée : un message non parti n'annule rien, mais il est
  // tracé et aucune notification « nouveau message » n'est envoyée pour rien
  // (audit du 2026-11-10, A6).
  if (messageError) console.error("applySeanceChanges: message automatique au patient non enregistré", patientId, messageError);
  else await notifyNewMessage({ patientId, instructorId: userId, sender: "instructor" });
  // Patient en suivi mensuel : ajuster la séance valide le bilan du mois.
  await recordMonthlyReviewIfDue({ supabase, instructorId: userId, patientId, note: message });
  revalidatePath("/dashboard/facturation");
  return { changed: true };
}
