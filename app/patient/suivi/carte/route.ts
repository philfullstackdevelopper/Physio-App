import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { finalizePatientCardChange } from "@/lib/billing/patientSubscription";
import { requestOrigin } from "@/lib/requestOrigin";

// Retour de Stripe après « Changer de carte » (audit du 2026-11-08). On
// enregistre tout de suite la nouvelle carte comme carte de l'abonnement
// d'accès (le webhook le fait aussi) ; la copie chez le kiné est refaite au
// prochain prélèvement de ses honoraires.
export const runtime = "nodejs";

export async function GET(req: Request) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const base = await requestOrigin();
  const sessionId = new URL(req.url).searchParams.get("session_id");

  let ok = false;
  if (sessionId) {
    try {
      ok = (await finalizePatientCardChange(sessionId)) === user.id;
    } catch (e) {
      console.error("[patient/suivi/carte] enregistrement impossible :", e);
    }
  }
  return NextResponse.redirect(`${base}/patient/suivi?${ok ? "carte=1" : "attente=1"}`);
}
