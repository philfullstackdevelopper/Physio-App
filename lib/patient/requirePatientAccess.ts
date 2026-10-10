import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { hasPatientAppAccess } from "@/lib/billing/context";

// Les contrôles de app/patient/layout.tsx (consentement santé, puis offre
// active), refaits DANS la page (audit du 2026-10-08). D'après la doc de
// Next.js 16 (node_modules/next/dist/docs/01-app/02-guides/authentication.md,
// « Layout checks »), un layout ne se ré-exécute pas lors d'une navigation
// dans l'appli : une page qui ne vérifie rien elle-même peut s'afficher sans
// passer par ces contrôles. L'Accueil, le Programme, la Séance du jour et
// l'Historique vérifient déjà (loadPatientHome / getTierBilling) ; ceci sert
// aux autres pages.
export async function requirePatientAccess(supabase: SupabaseClient, userId: string): Promise<void> {
  const [{ data: profile }, access] = await Promise.all([
    supabase.from("patient_profiles").select("health_data_consent_at").eq("id", userId).maybeSingle(),
    hasPatientAppAccess(supabase, userId),
  ]);
  if (!profile?.health_data_consent_at) redirect("/patient/onboarding");
  if (!access) redirect("/patient/abonnement");
}
