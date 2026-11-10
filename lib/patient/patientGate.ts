import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { requireUser, type AppUser } from "@/lib/supabase/require-user";
import { patientMustSubscribe, subscriptionNeedsRefresh, type SubscriptionRow } from "@/lib/billing/patientPlans";
import { refreshPatientSubscription } from "@/lib/billing/patientSubscription";

// =============================================================================
// Les barrières du patient, calculées À UN SEUL ENDROIT (audit du 2026-11-10,
// point B4). Avant, elles n'existaient que dans app/patient/layout.tsx — or un
// layout n'est pas rejoué à chaque navigation et ne protège jamais une action
// serveur. Le layout, les pages, les actions du patient et la signature des
// vidéos lisent maintenant tous ce même état : ils ne peuvent plus diverger.
//
// Ordre (inchangé, CLAUDE.md §4) : fiche patient → CGU → accès payé
// (lib/billing/patientPlans.ts, `patientMustSubscribe`) → questionnaire avec
// consentement « données de santé ».
//
// cache() : un seul jeu de lectures par requête, quel que soit le nombre
// d'appels (layout + page + composants).
// =============================================================================

export type PatientGate = {
  user: AppUser;
  /** Une lecture a échoué (PostgREST indisponible…) : on ne sait PAS. Ne
   *  jamais conclure « pas de fiche » ni « pas payé » dans ce cas (audit A1). */
  readFailed: boolean;
  /** Aucune ligne `patients` pour cette identité (lecture réussie). */
  hasPatient: boolean;
  patientName: string | null;
  kineName: string | null;
  termsAccepted: boolean;
  /** Kiné suspendu ou refusé : accès gratuit, sans écran de paiement. */
  kineSuspended: boolean;
  /** Le patient doit souscrire avant d'entrer (écran /patient/suivi). */
  mustSubscribe: boolean;
  /** Consentement « données de santé » donné (fin du questionnaire). */
  healthConsent: boolean;
};

export const loadPatientGate = cache(async (): Promise<PatientGate> => {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const gate: PatientGate = {
    user,
    readFailed: false,
    hasPatient: false,
    patientName: null,
    kineName: null,
    termsAccepted: false,
    kineSuspended: false,
    mustSubscribe: false,
    healthConsent: false,
  };

  const { data: patient, error: patientError } = await supabase
    .from("patients")
    .select("full_name, instructor_id, terms_accepted_at, trial_ends_at, instructors ( full_name, status )")
    .eq("id", user.id)
    .maybeSingle();
  if (patientError) {
    console.error("[barrière patient] lecture de la fiche patient impossible", patientError.code ?? "", patientError.message);
    return { ...gate, readFailed: true };
  }
  if (!patient) return gate;

  const kine = patient.instructors as unknown as { full_name: string | null; status: string | null } | null;
  gate.hasPatient = true;
  gate.patientName = (patient.full_name as string | null) ?? null;
  gate.kineName = kine?.full_name ?? null;
  gate.termsAccepted = !!patient.terms_accepted_at;
  // Kiné suspendu par l'administrateur (lib/billing/suspendInstructor.ts) :
  // ses patients gardent l'accès GRATUIT à leur programme, historique et
  // données, sans écran de paiement (Philippe, 2026-10-07 : « I don't want it
  // to be a problem for the clients »). Plus aucun prélèvement : seul le kiné
  // déclenche un prélèvement, et il n'a plus accès.
  // Kiné refusé par l'administrateur : même traitement (audit du 2026-11-08) —
  // il ne peut ni suivre ni facturer, son patient ne doit donc rien payer.
  // Un kiné « en attente » reste soumis au cas général.
  gate.kineSuspended = kine?.status === "suspended" || kine?.status === "rejected";
  if (!gate.termsAccepted) return gate;

  const loadSub = () =>
    supabase
      .from("subscriptions")
      .select("plan, status, current_period_end, cancel_at_period_end, stripe_subscription_id, stripe_account_id")
      .eq("user_id", user.id)
      .maybeSingle();

  // Ces lectures ne dépendent pas l'une de l'autre : en parallèle plutôt qu'à
  // la suite (audit du 2026-10-08 — chaque aller-retour vers PostgREST sur
  // Scalingo se paie).
  const [profileRes, subRes] = await Promise.all([
    supabase.from("patient_profiles").select("health_data_consent_at").eq("id", user.id).maybeSingle(),
    gate.kineSuspended ? Promise.resolve(null) : loadSub(),
  ]);
  if (profileRes.error || subRes?.error) {
    const err = profileRes.error ?? subRes?.error;
    console.error("[barrière patient] lecture du profil ou de l'abonnement impossible", err?.code ?? "", err?.message);
    return { ...gate, readFailed: true };
  }
  gate.healthConsent = !!profileRes.data?.health_data_consent_at;

  // Accès (modèle définitif du 2026-11-04, lib/billing/patientPlans.ts) : juste
  // après les CGU, AVANT le questionnaire — c'est le premier écran du patient
  // arrivé par le QR code ou le lien de son kiné (Philippe, 2026-11-04 : « tant
  // que cela n'a pas été débloqué, le patient ne peut pas accéder au reste »).
  // Pas d'écran de paiement si le kiné est suspendu ou si l'accès est offert au
  // patient (comptes de test).
  if (!gate.kineSuspended) {
    let sub = subRes?.data ?? null;
    // Période payée dépassée sans nouvelles de Stripe : on relit l'abonnement
    // (renouvelé ou non) avant de décider — une seule fois par période.
    if (sub && subscriptionNeedsRefresh(sub as unknown as SubscriptionRow) && sub.stripe_subscription_id) {
      await refreshPatientSubscription(sub.stripe_subscription_id as string, (sub.stripe_account_id as string | null) ?? null);
      const again = await loadSub();
      if (again.error) {
        console.error("[barrière patient] relecture de l'abonnement impossible", again.error.code ?? "", again.error.message);
        return { ...gate, readFailed: true };
      }
      sub = again.data;
    }
    gate.mustSubscribe = patientMustSubscribe({
      kineSuspended: gate.kineSuspended,
      freeAccessUntil: (patient.trial_ends_at as string | null) ?? null,
      subscription: (sub as unknown as SubscriptionRow | null) ?? null,
    });
  }

  return gate;
});

/**
 * Où en est ce patient ?
 * - "error"       : lecture impossible, on ne sait pas (afficher « réessayez ») ;
 * - "no-patient"  : pas de fiche patient ;
 * - "terms"       : CGU pas encore acceptées ;
 * - "subscribe"   : doit souscrire (/patient/suivi) ;
 * - "onboarding"  : questionnaire + consentement santé à faire ;
 * - "ok"          : tout est en règle.
 */
export type PatientAccessStatus = "error" | "no-patient" | "terms" | "subscribe" | "onboarding" | "ok";

export function patientAccessStatus(gate: PatientGate): PatientAccessStatus {
  if (gate.readFailed) return "error";
  if (!gate.hasPatient) return "no-patient";
  if (!gate.termsAccepted) return "terms";
  if (gate.mustSubscribe) return "subscribe";
  if (!gate.healthConsent) return "onboarding";
  return "ok";
}

/** État d'accès de la personne connectée, sans redirection (actions serveur). */
export async function currentPatientAccess(): Promise<PatientAccessStatus> {
  return patientAccessStatus(await loadPatientGate());
}
