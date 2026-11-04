import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { getStripe } from "@/lib/billing/stripe";
import { ensureKineCard, refreshPatientSubscription } from "@/lib/billing/patientSubscription";
import { requestOrigin } from "@/lib/requestOrigin";

// Retour de Stripe après la souscription de l'accès (modèle définitif du
// 2026-11-04). La session vit sur le compte d'EasyPhysio : on la relit, on
// enregistre l'abonnement tout de suite (le webhook le fait aussi), puis on
// copie la carte chez le kiné pour qu'il puisse prélever ses honoraires
// lui-même (sinon c'est refait au premier prélèvement, lib/billing/autoReview.ts).
export const runtime = "nodejs";

export async function GET(req: Request) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const base = await requestOrigin();
  const sessionId = new URL(req.url).searchParams.get("session_id");

  let ok = false;
  if (sessionId) {
    try {
      const session = await getStripe().checkout.sessions.retrieve(sessionId);
      const subId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
      if (session.metadata?.user_id === user.id && subId) {
        await refreshPatientSubscription(subId, null);
        ok = session.status === "complete";

        const { data: patient } = await supabase.from("patients").select("instructor_id, full_name").eq("id", user.id).maybeSingle();
        const instructorId = (patient?.instructor_id as string | null) ?? null;
        const { data: connect } = instructorId
          ? await supabase
              .from("instructor_connect_accounts")
              .select("stripe_connect_account_id, status")
              .eq("instructor_id", instructorId)
              .maybeSingle()
          : { data: null };
        if (ok && instructorId && connect?.status === "active" && connect.stripe_connect_account_id) {
          await ensureKineCard({
            patientId: user.id,
            instructorId,
            connectAccountId: connect.stripe_connect_account_id as string,
            platformSubscriptionId: subId,
            email: user.email ?? null,
            name: (patient?.full_name as string | null) ?? null,
          });
        }
      }
    } catch (e) {
      console.error("[patient/suivi/retour] enregistrement impossible :", e);
    }
  }
  // Vrai chargement de l'appli (pas de navigation interne).
  return NextResponse.redirect(`${base}/patient/suivi?${ok ? "ok=1" : "attente=1"}`);
}
