import { redirect } from "next/navigation";
import { currentPatientAccess } from "./patientGate";

// Contrôle complet de app/patient/layout.tsx (fiche patient, CGU, accès payé,
// consentement santé) refait DANS chaque page de contenu (audits du 2026-10-08
// et du 2026-11-10, point B4 : un layout ne se ré-exécute pas à chaque
// navigation). Même calcul que le layout : lib/patient/patientGate.ts.
//
// À appeler ainsi, tout en haut de la page :
//     if (!(await requirePatientAccess())) return null;
//
// - accès à souscrire → /patient/suivi ; questionnaire à faire →
//   /patient/onboarding (ces deux pages n'appellent pas cette fonction : pas de
//   boucle de redirections) ;
// - pas de fiche patient ou CGU non acceptées → renvoie `false` SANS rediriger :
//   le layout affiche déjà un écran à la place de la page (PatientNoRecordGate,
//   PatientWelcomeGate) sur toutes les adresses /patient/*, donc une
//   redirection tournerait en rond. La page ne doit simplement rien montrer ;
// - lecture impossible → erreur, rattrapée par app/patient/error.tsx
//   (« réessayez »), jamais traitée comme « pas de fiche ».
//
// Les paramètres ne servent plus (gardés pour les anciens appels).
export async function requirePatientAccess(_supabase?: unknown, _userId?: string): Promise<boolean> {
  void _supabase;
  void _userId;
  const status = await currentPatientAccess();
  if (status === "error") throw new Error("Lecture du dossier patient impossible (barrière d'accès).");
  if (status === "subscribe") redirect("/patient/suivi");
  if (status === "onboarding") redirect("/patient/onboarding");
  return status === "ok";
}

// Variante pour le questionnaire (/patient/onboarding), qui vient AVANT le
// consentement santé : seulement fiche patient + CGU + accès payé.
export async function requirePatientOnboardingAccess(): Promise<boolean> {
  const status = await currentPatientAccess();
  if (status === "error") throw new Error("Lecture du dossier patient impossible (barrière d'accès).");
  if (status === "subscribe") redirect("/patient/suivi");
  return status === "onboarding" || status === "ok";
}
