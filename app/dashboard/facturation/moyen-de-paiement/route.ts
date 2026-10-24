import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireApprovedInstructor } from "@/lib/dashboard/requireApprovedInstructor";
import { finalizePlatformBillingSetup } from "@/lib/billing/platformInvoice";
import { requestOrigin } from "@/lib/requestOrigin";

// Retour de Stripe après l'enregistrement de la carte ou de l'IBAN du kiné
// pour sa facture EasyPhysio. Enregistre tout de suite (le webhook le fait
// aussi, mais il peut arriver après le kiné), puis revient à la page.
export const runtime = "nodejs";

export async function GET(req: Request) {
  const supabase = await createClient();
  const { user } = await requireApprovedInstructor(supabase);
  const base = await requestOrigin();
  const sessionId = new URL(req.url).searchParams.get("session_id");
  let ok = false;
  if (sessionId) {
    try {
      ok = (await finalizePlatformBillingSetup(sessionId)) === user.id;
    } catch (e) {
      console.error("[moyen-de-paiement] enregistrement impossible :", e);
    }
  }
  return NextResponse.redirect(`${base}/dashboard/facturation?${ok ? "saved=moyen" : "moyen=attente"}`);
}
