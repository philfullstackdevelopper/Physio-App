import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { getStripe } from "@/lib/billing/stripe";
import { refreshPatientSubscription } from "@/lib/billing/patientSubscription";
import { requestOrigin } from "@/lib/requestOrigin";

// Retour de Stripe après le paiement d'une formule (2026-11-02). La session
// vit sur le compte Stripe du kiné : on la relit là et on enregistre
// l'abonnement tout de suite (le webhook le fait aussi), puis retour à la page.
export const runtime = "nodejs";

export async function GET(req: Request) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const base = await requestOrigin();
  const sessionId = new URL(req.url).searchParams.get("session_id");

  const { data: patient } = await supabase.from("patients").select("instructor_id").eq("id", user.id).maybeSingle();
  const { data: connect } = patient?.instructor_id
    ? await supabase
        .from("instructor_connect_accounts")
        .select("stripe_connect_account_id")
        .eq("instructor_id", patient.instructor_id as string)
        .maybeSingle()
    : { data: null };
  const accountId = (connect?.stripe_connect_account_id as string | null) ?? null;

  let ok = false;
  if (sessionId && accountId) {
    try {
      const session = await getStripe().checkout.sessions.retrieve(sessionId, undefined, { stripeAccount: accountId });
      const subId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
      if (session.metadata?.user_id === user.id && subId) {
        await refreshPatientSubscription(subId, accountId);
        ok = session.status === "complete";
      }
    } catch (e) {
      console.error("[patient/suivi/retour] enregistrement impossible :", e);
    }
  }
  // Paiement validé : un vrai chargement de l'appli (pas de navigation interne).
  return NextResponse.redirect(`${base}/patient/suivi?${ok ? "ok=1" : "attente=1"}`);
}
