import { redirect } from "next/navigation";
import { Info } from "lucide-react";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import PatientNav from "@/components/PatientNav";
import PatientAppOpening from "@/components/PatientAppOpening";
import PatientWelcomeGate from "@/components/PatientWelcomeGate";
import PatientNoRecordGate from "@/components/PatientNoRecordGate";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { patientMustSubscribe, subscriptionNeedsRefresh, type SubscriptionRow } from "@/lib/billing/patientPlans";
import { refreshPatientSubscription } from "@/lib/billing/patientSubscription";

const ONBOARDING_PATH = "/patient/onboarding";
// Suivi mensuel à accepter quand le kiné a fixé un tarif au-dessus de 0 €.
const SUIVI_PATH = "/patient/suivi";

// The one shared gate for every /patient/* route, mirroring how
// app/dashboard/layout.tsx gates instructors on approval status: a freshly
// invited patient (see app/dashboard/patients/actions.ts's addPatient) has a
// Clerk account and a `patients` row, but nothing beyond that. Two things
// must happen, in order, before the real app shows:
//  1. Accept the CGU (patients.terms_accepted_at) — asked once, standalone,
//     per RGPD (see supabase/migrations/0019's own comment on why this is
//     separate from health-data consent).
//  2. Complete /patient/onboarding (condition, profile, health-data consent)
//     — that page already existed but had no enforcement, so patients could
//     reach the rest of the app with an empty profile.
export default async function PatientLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  // requireUser() is cache()-deduped, so calling it again here doesn't cost an
  // extra Clerk round-trip even though every page under app/patient also
  // calls it — same pattern as the dashboard layout.
  const { data: patient } = await supabase
    .from("patients")
    .select("full_name, instructor_id, terms_accepted_at, instructors ( full_name, status, review_price_cents )")
    .eq("id", user.id)
    .maybeSingle();

  // No `patients` row at all for this identity — not "hasn't onboarded yet",
  // genuinely nothing to attach a profile to (e.g. this Clerk account was
  // never actually invited by an instructor). Block here, before any
  // /patient/* page — including onboarding, whose patient_profiles insert
  // has a foreign key onto patients.id and would otherwise fail with a raw
  // Postgres error instead of an explanation (Philippe, 2026-09-13).
  if (!patient) {
    return <PatientNoRecordGate />;
  }

  if (!patient.terms_accepted_at) {
    const instructor = patient.instructors as unknown as { full_name: string | null } | null;
    return <PatientWelcomeGate instructorName={instructor?.full_name ?? null} />;
  }

  // Kiné suspendu par l'administrateur (lib/billing/suspendInstructor.ts) :
  // ses patients gardent l'accès GRATUIT à leur programme, historique et
  // données, sans écran de paiement (Philippe, 2026-10-07 : « I don't want it
  // to be a problem for the clients »). Plus aucun prélèvement : seul le kiné
  // déclenche un prélèvement, et il n'a plus accès.
  const kine = patient.instructors as unknown as { full_name: string | null; status: string | null } | null;
  const kineSuspended = kine?.status === "suspended";

  const pathname = (await headers()).get("x-pathname") ?? "";
  const onOnboardingPath = pathname.startsWith(ONBOARDING_PATH);
  const onSuiviPath = pathname.startsWith(SUIVI_PATH);
  const fullBleed = onOnboardingPath;

  const loadSub = () =>
    supabase
      .from("subscriptions")
      .select("plan, status, current_period_end, cancel_at_period_end, stripe_subscription_id, stripe_account_id")
      .eq("user_id", user.id)
      .maybeSingle();

  // Ces lectures ne dépendent pas l'une de l'autre : en parallèle plutôt qu'à
  // la suite (audit du 2026-10-08 — chaque aller-retour vers PostgREST sur
  // Scalingo se paie).
  const [profileRes, unreadRes, subRes, trialRes] = await Promise.all([
    onOnboardingPath
      ? Promise.resolve(null)
      : supabase.from("patient_profiles").select("health_data_consent_at").eq("id", user.id).maybeSingle(),
    fullBleed
      ? Promise.resolve(null)
      : // Messages FROM the instructor this patient hasn't opened yet — mirrors
        // lib/dashboard/unreadMessages.ts's loadUnreadCount, sender flipped.
        supabase
          .from("patient_messages")
          .select("id", { count: "exact", head: true })
          .eq("patient_id", user.id)
          .eq("sender", "instructor")
          .is("read_at", null),
    kineSuspended ? Promise.resolve(null) : loadSub(),
    kineSuspended ? Promise.resolve(null) : supabase.from("patients").select("trial_ends_at").eq("id", user.id).maybeSingle(),
  ]);

  // Accès (modèle définitif du 2026-11-04, lib/billing/patientPlans.ts) : juste
  // après les CGU, AVANT le questionnaire — c'est le premier écran du patient
  // arrivé par le QR code ou le lien de son kiné (Philippe, 2026-11-04 : « tant
  // que cela n'a pas été débloqué, le patient ne peut pas accéder au reste »).
  // Pas d'écran de paiement si le kiné est suspendu ou si l'accès est offert au
  // patient (comptes de test).
  let mustAcceptFollowUp = false;
  if (!kineSuspended) {
    let sub = subRes?.data ?? null;
    // Période payée dépassée sans nouvelles de Stripe : on relit l'abonnement
    // (renouvelé ou non) avant de décider — une seule fois par période.
    if (sub && subscriptionNeedsRefresh(sub as unknown as SubscriptionRow) && sub.stripe_subscription_id) {
      await refreshPatientSubscription(sub.stripe_subscription_id as string, (sub.stripe_account_id as string | null) ?? null);
      sub = (await loadSub()).data;
    }
    mustAcceptFollowUp = patientMustSubscribe({
      kineSuspended,
      freeAccessUntil: (trialRes?.data?.trial_ends_at as string | null) ?? null,
      subscription: (sub as unknown as SubscriptionRow | null) ?? null,
    });
  }
  // Le compte reste ouvert (RGPD) : exporter ou supprimer ses données ne
  // dépend jamais d'un paiement.
  const onAccountPage = pathname === "/patient/compte";
  if (mustAcceptFollowUp && !onSuiviPath && !onAccountPage) redirect(SUIVI_PATH);
  // Écran de suivi à accepter : plein écran, sans la barre d'onglets.
  if (mustAcceptFollowUp) return <>{children}</>;

  // Puis le questionnaire (profil, matériel, consentement données de santé).
  if (!onOnboardingPath && !profileRes?.data?.health_data_consent_at) {
    redirect(ONBOARDING_PATH);
  }


  // Onboarding renders full-bleed, its own step-wizard layout — the real nav
  // only makes sense once there's a real profile to navigate around
  // (Philippe, 2026-09-09: "sans les trucs sur la barre latérale pour le début").
  if (fullBleed) return <>{children}</>;
  const unreadCount = unreadRes?.count ?? 0;

  // Séance guidée (…/seance) : PatientNav n'affiche rien (pas de barre
  // d'onglets), donc pas de marge du bas non plus — sinon bande vide en bas
  // du téléphone (Philippe, 2026-10-07). Même test que PatientNav.
  const inGuidedSession = pathname.endsWith("/seance");
  const t = await getTranslations("patient");

  return (
    <div className="flex min-h-screen flex-col bg-app-bg text-ink max-sm:bg-phone-bg sm:flex-row">
      {/* Téléphone : ouverture douce de l'appli, une fois par visite. */}
      <PatientAppOpening />
      <PatientNav patientName={(patient.full_name as string | null) ?? null} unreadCount={unreadCount ?? 0} />
      {/* Téléphone : la marge du bas suit la vraie hauteur de la barre d'onglets,
          zone de la « home bar » des iPhone comprise (env(safe-area-inset-bottom)). */}
      <div
        className={`relative min-w-0 flex-1 ${
          inGuidedSession ? "" : "pb-20 max-sm:pb-[calc(5rem+env(safe-area-inset-bottom))] sm:pb-0"
        }`}
      >
        {kineSuspended && !inGuidedSession && (
          <p className="m-4 mb-0 flex items-start gap-2 rounded-2xl border border-warn/30 bg-warn-soft p-3 text-sm text-warn sm:mx-8 sm:mt-6">
            <Info className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
            <span>{t("layout.kineSuspended", { name: kine?.full_name ?? t("common.yourKineCap") })}</span>
          </p>
        )}
        {children}
      </div>
    </div>
  );
}
