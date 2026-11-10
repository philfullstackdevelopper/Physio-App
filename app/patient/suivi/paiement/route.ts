import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { reviewForPayment } from "@/lib/db/admin";
import { finalizeReviewPaymentCheckout } from "@/lib/billing/followUp";
import { requestOrigin } from "@/lib/requestOrigin";

// Retour de Stripe après que le patient a réglé lui-même un mois d'honoraires
// de son kiné (audit du 2026-11-10, M3). Même principe que le retour de
// souscription (app/patient/suivi/retour) : on relit la page de paiement et
// son paiement chez Stripe, sur le compte du kiné, et on marque le mois payé
// tout de suite — sans dépendre du seul webhook Connect. Sans cela, un webhook
// manquant laissait le mois « refusé » et le bouton « Payer » affiché : le
// patient pouvait payer deux fois.
export const runtime = "nodejs";

export async function GET(req: Request) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const base = await requestOrigin();
  const params = new URL(req.url).searchParams;
  const sessionId = params.get("session_id");
  const reviewId = params.get("review");

  let paid = false;
  if (sessionId && reviewId) {
    try {
      // Lecture par la session du patient : la règle d'accès ne lui rend que SES mois.
      const { data: review } = await supabase.from("monthly_reviews").select("id").eq("id", reviewId).eq("patient_id", user.id).maybeSingle();
      // Compte Stripe du kiné de ce mois : lu côté serveur, jamais reçu du navigateur.
      const target = review ? await reviewForPayment(review.id as string) : null;
      if (target?.connect_account_id) {
        const status = await finalizeReviewPaymentCheckout(sessionId, target.connect_account_id, target.review_id);
        paid = status === "paid";
      }
    } catch (e) {
      console.error("[patient/suivi/paiement] vérification impossible :", e);
    }
  }
  // Vrai chargement de l'appli (pas de navigation interne). Sans confirmation,
  // pas de message « payé » : l'écran montre l'état réel du mois.
  return NextResponse.redirect(`${base}/patient/suivi${paid ? "?paye=1" : ""}`);
}
