import { redirect } from "next/navigation";
import { Info } from "lucide-react";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import PatientNav from "@/components/PatientNav";
import PatientAppOpening from "@/components/PatientAppOpening";
import PatientWelcomeGate from "@/components/PatientWelcomeGate";
import PatientNoRecordGate from "@/components/PatientNoRecordGate";
import { createClient } from "@/lib/supabase/server";
import { loadPatientGate } from "@/lib/patient/patientGate";

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
//
// Les barrières elles-mêmes (fiche patient, CGU, accès payé, consentement
// santé) sont calculées par lib/patient/patientGate.ts — le même calcul que
// dans les pages (requirePatientAccess) et les actions du patient, pour qu'ils
// ne puissent pas diverger (audit du 2026-11-10, B4). cache() : la page qui
// suit ne refait pas les lectures.
export default async function PatientLayout({ children }: { children: React.ReactNode }) {
  const gate = await loadPatientGate();
  const { user } = gate;

  // Lecture impossible (PostgREST qui redémarre, souci de clés…) : on ne sait
  // PAS si la fiche existe. Surtout ne pas afficher « compte non associé », qui
  // propose de supprimer l'identifiant (audit du 2026-11-10, A1) : erreur,
  // rattrapée par app/error.tsx (« Réessayer »).
  if (gate.readFailed) {
    throw new Error("Lecture du dossier patient impossible.");
  }

  // No `patients` row at all for this identity — not "hasn't onboarded yet",
  // genuinely nothing to attach a profile to (e.g. this Clerk account was
  // never actually invited by an instructor). Block here, before any
  // /patient/* page — including onboarding, whose patient_profiles insert
  // has a foreign key onto patients.id and would otherwise fail with a raw
  // Postgres error instead of an explanation (Philippe, 2026-09-13).
  if (!gate.hasPatient) {
    return <PatientNoRecordGate />;
  }

  if (!gate.termsAccepted) {
    return <PatientWelcomeGate instructorName={gate.kineName} />;
  }

  // Kiné suspendu ou refusé par l'administrateur : ses patients gardent l'accès
  // GRATUIT, sans écran de paiement (règle détaillée dans patientGate.ts).
  const kineSuspended = gate.kineSuspended;

  const pathname = (await headers()).get("x-pathname") ?? "";
  const onOnboardingPath = pathname.startsWith(ONBOARDING_PATH);
  const onSuiviPath = pathname.startsWith(SUIVI_PATH);
  const fullBleed = onOnboardingPath;

  // Accès (modèle définitif du 2026-11-04, lib/billing/patientPlans.ts) : juste
  // après les CGU, AVANT le questionnaire — c'est le premier écran du patient
  // arrivé par le QR code ou le lien de son kiné (Philippe, 2026-11-04 : « tant
  // que cela n'a pas été débloqué, le patient ne peut pas accéder au reste »).
  // Pas d'écran de paiement si le kiné est suspendu ou si l'accès est offert au
  // patient (comptes de test).
  const mustAcceptFollowUp = gate.mustSubscribe;
  // Le compte reste ouvert (RGPD) : exporter ou supprimer ses données ne
  // dépend jamais d'un paiement.
  const onAccountPage = pathname === "/patient/compte";
  if (mustAcceptFollowUp && !onSuiviPath && !onAccountPage) redirect(SUIVI_PATH);
  // Écran de suivi à accepter : plein écran, sans la barre d'onglets.
  if (mustAcceptFollowUp) return <>{children}</>;

  // Puis le questionnaire (profil, matériel, consentement données de santé).
  if (!onOnboardingPath && !gate.healthConsent) {
    redirect(ONBOARDING_PATH);
  }

  // Onboarding renders full-bleed, its own step-wizard layout — the real nav
  // only makes sense once there's a real profile to navigate around
  // (Philippe, 2026-09-09: "sans les trucs sur la barre latérale pour le début").
  if (fullBleed) return <>{children}</>;

  // Messages FROM the instructor this patient hasn't opened yet — mirrors
  // lib/dashboard/unreadMessages.ts's loadUnreadCount, sender flipped.
  const supabase = await createClient();
  const { count: unreadCount } = await supabase
    .from("patient_messages")
    .select("id", { count: "exact", head: true })
    .eq("patient_id", user.id)
    .eq("sender", "instructor")
    .is("read_at", null);

  // Séance guidée (…/seance) : PatientNav n'affiche rien (pas de barre
  // d'onglets), donc pas de marge du bas non plus — sinon bande vide en bas
  // du téléphone (Philippe, 2026-10-07). Même test que PatientNav.
  const inGuidedSession = pathname.endsWith("/seance");
  const t = await getTranslations("patient");

  return (
    <div className="flex min-h-screen flex-col bg-app-bg text-ink max-sm:bg-phone-bg sm:flex-row">
      {/* Téléphone : ouverture douce de l'appli, une fois par visite. */}
      <PatientAppOpening />
      <PatientNav patientName={gate.patientName} unreadCount={unreadCount ?? 0} />
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
            <span>{t("layout.kineSuspended", { name: gate.kineName ?? t("common.yourKineCap") })}</span>
          </p>
        )}
        {children}
      </div>
    </div>
  );
}
