import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";

// Contrôle de app/patient/layout.tsx (consentement santé) refait DANS la page
// (audit du 2026-10-08 : un layout ne se ré-exécute pas à chaque navigation).
// Plus de contrôle d'offre depuis le 2026-10-24 : l'appli est offerte par le kiné.
export async function requirePatientAccess(supabase: SupabaseClient, userId: string): Promise<void> {
  const { data: profile } = await supabase.from("patient_profiles").select("health_data_consent_at").eq("id", userId).maybeSingle();
  if (!profile?.health_data_consent_at) redirect("/patient/onboarding");
}
