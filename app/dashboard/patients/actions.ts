"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { clerkClient } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";
import { requireApprovedInstructor } from "@/lib/dashboard/requireApprovedInstructor";
import { precreateAppUserId } from "@/lib/auth/user-map";
import { canInvitePatients } from "@/lib/launch";
import type { ThreadMessage } from "@/components/MessageThread";
import { friendlyDbError } from "@/lib/format/dbError";
import { deleteAppUserById, joinLinkKine } from "@/lib/db/admin";
import { invitePatient } from "@/lib/patient/invitation";
import { thisWeekStartDateKey } from "@/lib/patient/weeks";
import { notifyNewMessage } from "@/lib/push/notify";
import { getTranslations } from "next-intl/server";
import { getLibI18n } from "@/lib/dashboard/libI18n";
import { createRateLimiter } from "@/lib/rateLimit";

// Frein par kiné (audit du 2026-11-10, C4) : 30 invitations par heure. En
// mémoire du serveur (voir les limites assumées dans lib/rateLimit.ts) ; la
// vraie limite par 24 h est en base (migration 0087).
const inviteLimiter = createRateLimiter({ limit: 30, windowMs: 60 * 60_000 });

// Instructor invites a new patient by email. Creates the patient's Clerk
// account invitation (they choose their own password from the e-mail), and
// records the patient row owned by the inviting instructor.
export async function addPatient(formData: FormData) {
  const supabase = await createClient();
  const { user } = await requireApprovedInstructor(supabase);
  const t = await getTranslations("dashboard.patientActions");
  const { t: tLib } = await getLibI18n();

  // Avant le lancement : aucune invitation de vrai patient (lib/launch.ts).
  if (!canInvitePatients(user.email)) {
    redirect(`/dashboard/patients/new?error=${encodeURIComponent((await getTranslations("dashboard.newPatient"))("invitationsClosed"))}`);
  }

  const fullName = String(formData.get("full_name") ?? "").trim();
  // (Philippe, 2026-10-07 : en minuscules partout — Clerk stocke les e-mails
  // en minuscules et lib/auth/user-map.ts compare l'e-mail tel quel, donc une
  // invitation tapée « Jean.Dupont@… » laissait le patient orphelin à sa
  // première connexion.)
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!fullName || !email) {
    redirect(`/dashboard/patients/new?error=${encodeURIComponent(t("fillAll"))}`);
  }
  if (!inviteLimiter.allow(user.id)) {
    redirect(`/dashboard/patients/new?error=${encodeURIComponent(t("tooManyInvites"))}`);
  }

  // Reserve the internal uuid BEFORE the invite goes out, so patients.id and
  // app_users.app_id agree from day one (resolveAppUserId will find this row
  // by email on the patient's first login and attach their Clerk id).
  let appId: string;
  let appIdIsNew = false;
  try {
    ({ appId, isNew: appIdIsNew } = await precreateAppUserId(email));
  } catch (e) {
    console.error("addPatient: precreateAppUserId failed", e);
    redirect(`/dashboard/patients/new?error=${encodeURIComponent(t("prepareFailed"))}`);
  }
  // Un échec plus bas ne doit pas laisser derrière lui l'identifiant que l'on
  // vient de réserver (audit du 2026-10-08) — seulement s'il est neuf.
  const discardReservedId = async () => {
    if (!appIdIsNew) return;
    try {
      await deleteAppUserById(appId);
    } catch (err) {
      console.error("addPatient: identifiant réservé non supprimé", err);
    }
  };

  // Adresse déjà utilisée par un compte kiné : refusée. Seulement si
  // l'identifiant existait déjà (un neuf ne peut pas être celui d'un kiné).
  //
  // UNE SEULE réponse neutre (audit du 2026-11-10, C4) pour « c'est un kiné »,
  // « un compte existe déjà » et « déjà patient » : des messages différents
  // permettaient à un kiné d'apprendre qu'une adresse est suivie par un
  // confrère (donnée de santé indirecte). Le détail reste dans les journaux.
  if (!appIdIsNew) {
    const asKine = await joinLinkKine(appId).catch(() => null);
    if (asKine) redirect(`/dashboard/patients/new?error=${encodeURIComponent(t("cannotInvite"))}`);
  }

  // Invitation Clerk (lib/patient/invitation.ts : rien qui révèle le suivi
  // chez un kiné, validité fixée à 30 jours). Le patient choisit son mot de
  // passe depuis l'e-mail. Le détail d'une erreur Clerk reste dans les
  // journaux du serveur : l'adresse de la page ne porte qu'un message choisi.
  const outcome = await invitePatient(email, fullName, "addPatient");
  if (outcome !== "sent") {
    const message = outcome === "duplicate" ? t("cannotInvite") : outcome === "pending" ? t("pendingInvite") : t("inviteFailed");
    await discardReservedId();
    redirect(`/dashboard/patients/new?error=${encodeURIComponent(message)}`);
  }

  // Record the patient, owned by the current instructor. Done with the
  // instructor's own session so the patients RLS policy is enforced.
  const { error: patientError } = await supabase.from("patients").insert({
    id: appId,
    instructor_id: user.id,
    full_name: fullName,
    email,
  });

  if (patientError) {
    // Without this, the Clerk invitation already sent above stays valid: the
    // patient could accept it, get a real Clerk account, and land on
    // /patient/onboarding with no `patients` row to attach a profile to —
    // patient_profiles.id's foreign key onto patients.id would then reject
    // their very first save with a raw Postgres error (Philippe, 2026-09-13,
    // hit by exactly this after a patients insert failed silently here).
    try {
      const client = await clerkClient();
      const pending = await client.invitations.getInvitationList({ query: email, status: "pending" });
      await Promise.all(pending.data.map((inv) => client.invitations.revokeInvitation(inv.id)));
    } catch (e) {
      console.error("addPatient: failed to revoke invitation after patients insert error", e);
    }
    await discardReservedId();
    const message =
      patientError.code === "23505"
        ? t("cannotInvite")
        : t("saveFailed", { reason: friendlyDbError(patientError, undefined, tLib) });
    redirect(`/dashboard/patients/new?error=${encodeURIComponent(message)}`);
  }

  // Première séance choisie dans le formulaire (facultatif, proposition 4) :
  // attribuée dès cette semaine, et sa pathologie devient celle du patient.
  // Une séance invisible pour ce kiné ou propre à un autre patient est
  // ignorée ; un échec ici n'annule pas l'invitation déjà partie — le kiné
  // choisira la séance depuis la fiche.
  const workoutId = String(formData.get("workout_id") ?? "");
  if (workoutId) {
    const { data: workout } = await supabase.from("workouts").select("id, condition_id, patient_id").eq("id", workoutId).maybeSingle();
    if (workout && workout.patient_id === null) {
      if (workout.condition_id) await supabase.from("patients").update({ condition_id: workout.condition_id }).eq("id", appId);
      const { error: recError } = await supabase
        .from("patient_recommended_workouts")
        .insert({ patient_id: appId, workout_id: workout.id, week_start_date: thisWeekStartDateKey(), week_count: null });
      if (recError) console.error("addPatient: première séance non attribuée", recError);
    }
  }

  revalidatePath("/dashboard/patients");
  redirect("/dashboard/patients");
}

// Renvoie l'invitation Clerk à un patient qui n'a jamais accepté les CGU
// (patients.terms_accepted_at toujours null — voir PatientsTable, bouton
// « Réactiver »). N'a de sens que pour ce cas : un patient qui a déjà un
// compte actif mais n'a pas terminé son questionnaire santé n'a rien à
// recevoir de plus par ce biais (pas de rappel e-mail/SMS automatisé, voir
// CLAUDE.md §5).
export async function reactivatePatient(formData: FormData): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const { user } = await requireApprovedInstructor(supabase);
  const t = await getTranslations("dashboard.patientActions");

  // Avant le lancement : aucune invitation renvoyée non plus (lib/launch.ts).
  if (!canInvitePatients(user.email)) return { error: (await getTranslations("dashboard.newPatient"))("invitationsClosed") };

  const patientId = String(formData.get("patient_id") ?? "");
  if (!patientId) return { error: t("notFound") };

  const { data: patient } = await supabase
    .from("patients")
    .select("email, full_name, terms_accepted_at")
    .eq("id", patientId)
    .eq("instructor_id", user.id)
    .maybeSingle();
  if (!patient) return { error: t("notFound") };
  if (patient.terms_accepted_at) return { error: t("alreadyActive") };
  if (!patient.email) return { error: t("noEmail") };


  const outcome = await invitePatient(patient.email as string, (patient.full_name as string | null) ?? null, "reactivatePatient");
  // Une invitation déjà en cours n'est pas une erreur : rien de plus à faire.
  if (outcome === "duplicate") return { error: t("hasAccount") };
  if (outcome === "failed") return { error: t("resendFailed") };

  revalidatePath("/dashboard/patients");
  return { ok: true };
}

// =============================================================================
// Actions dédiées à la pop-up « Messages » ouverte directement depuis la liste
// des patients (PatientsTable). Même table et même format de fil que la boîte
// de réception complète (voir app/dashboard/messages/{page,actions}.tsx),
// mais sans redirection : on reste sur /dashboard/patients.
// =============================================================================

export async function getPatientThread(patientId: string): Promise<{ thread: ThreadMessage[] } | { error: string }> {
  const supabase = await createClient();
  const { user } = await requireApprovedInstructor(supabase);
  const t = await getTranslations("dashboard.patientActions");

  const { data: patient } = await supabase
    .from("patients")
    .select("id")
    .eq("id", patientId)
    .eq("instructor_id", user.id)
    .maybeSingle();
  if (!patient) return { error: t("notFound") };

  const { data } = await supabase
    .from("patient_messages")
    .select("id, body, created_at, sender, read_at, read_by_instructor_at")
    .eq("instructor_id", user.id)
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false })
    .limit(50);
  const rows = [...(data ?? [])].reverse();

  const thread: ThreadMessage[] = rows.map((m) => ({
    id: m.id as string,
    body: m.body as string,
    created_at: m.created_at as string,
    sender: m.sender as string,
    read_at: (m.read_at as string | null) ?? null,
  }));

  await supabase
    .from("patient_messages")
    .update({ read_by_instructor_at: new Date().toISOString() })
    .eq("instructor_id", user.id)
    .eq("patient_id", patientId)
    .eq("sender", "patient")
    .is("read_by_instructor_at", null);

  revalidatePath("/dashboard/messages");
  revalidatePath("/dashboard");
  // The "Messages" badge count lives in app/dashboard/layout.tsx, a layout
  // shared by every /dashboard/* route — revalidating "/dashboard" as a page
  // doesn't touch it, so the badge could keep showing messages just marked
  // read here until a full reload (Philippe, 2026-09-09).
  revalidatePath("/dashboard", "layout");

  return { thread };
}

export async function sendPatientMessage(formData: FormData): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const { user } = await requireApprovedInstructor(supabase);
  const t = await getTranslations("dashboard.patientActions");

  const patientId = String(formData.get("patient_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();

  if (!patientId) return { error: t("notFound") };
  if (!body) return { error: t("emptyMessage") };

  const { error } = await supabase.from("patient_messages").insert({
    patient_id: patientId,
    instructor_id: user.id,
    sender: "instructor",
    body,
  });
  if (error) return { error: friendlyDbError(error, undefined, (await getLibI18n()).t) };
  await notifyNewMessage({ patientId, instructorId: user.id, sender: "instructor" });

  revalidatePath("/dashboard/messages");
  revalidatePath("/dashboard");
  return { ok: true };
}
