import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/billing/stripe";
import { connectStatusFromAccount, verifiedInstructorId } from "@/lib/billing/connectStatus";
import { upsertConnectAccount } from "@/lib/db/admin";
import { handleFollowUpSetupEvent, syncReviewPaymentFromIntent } from "@/lib/billing/followUp";
import { finalizePlatformBillingSetup, syncPlatformInvoice } from "@/lib/billing/platformInvoice";
import { refreshPatientSubscription, syncPatientSubscription } from "@/lib/billing/patientSubscription";

// Stripe needs the Node runtime (not Edge) and the raw request body to verify
// the signature, so this route reads req.text() and never parses JSON first.
export const runtime = "nodejs";

// Stripe envoie les événements des comptes Connect des kinés et ceux du
// compte plateforme par deux points d'envoi distincts, chacun avec SON secret
// (audit du 2026-10-08). Les deux peuvent viser cette même adresse :
// STRIPE_WEBHOOK_SECRET (plateforme) et STRIPE_CONNECT_WEBHOOK_SECRET
// (Connect) — on accepte une signature valide pour l'un ou l'autre.
const webhookSecrets = [process.env.STRIPE_WEBHOOK_SECRET, process.env.STRIPE_CONNECT_WEBHOOK_SECRET].filter(
  (s): s is string => !!s,
);

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig || webhookSecrets.length === 0) {
    return NextResponse.json({ error: "Webhook non configuré." }, { status: 400 });
  }

  const stripe = getStripe();

  let event: Stripe.Event | null = null;
  for (const secret of webhookSecrets) {
    try {
      event = stripe.webhooks.constructEvent(body, sig, secret);
      break;
    } catch {
      /* secret suivant */
    }
  }
  if (!event) {
    return NextResponse.json({ error: "Signature invalide." }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      // Nouveau modèle (2026-10-24) : enregistrement d'une carte, sans
      // prélèvement. Sur un compte Connect = suivi mensuel d'un patient ;
      // sur la plateforme = moyen de paiement du kiné pour sa facture EasyPhysio.
      if (session.mode === "setup") {
        if (event.account) await handleFollowUpSetupEvent(session, event.account);
        else await finalizePlatformBillingSetup(session.id);
        break;
      }
      // Formule patient payée (2026-11-02), sur le compte Connect du kiné.
      if (session.mode === "subscription" && event.account) {
        const subId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
        if (subId) await refreshPatientSubscription(subId, event.account);
      }
      break;
    }
    // Formule patient créée, renouvelée, résiliée, paiement refusé… (compte
    // Connect du kiné). Ignorée si elle n'a pas été créée par EasyPhysio.
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      if (event.account) await syncPatientSubscription(event.data.object as Stripe.Subscription, event.account);
      break;
    }
    case "account.updated": {
      // (Philippe, 2026-10-07) Le statut du compte Connect d'un kiné change
      // chez Stripe (vérification terminée, paiements suspendus…) : on le
      // recopie localement, avec la même règle que le retour d'onboarding.
      // Le kiné n'est identifié que par les metadata SIGNÉES posées par
      // EasyPhysio (lib/billing/connectStatus.ts) — jamais par une valeur
      // que le kiné pourrait écrire lui-même. Pas de signature → ignoré
      // (la page Facturation resynchronise de toute façon à sa prochaine visite).
      const account = event.data.object as Stripe.Account;
      const instructorId = verifiedInstructorId(account);
      if (instructorId) {
        await upsertConnectAccount({
          instructorId,
          stripeConnectAccountId: account.id,
          status: connectStatusFromAccount(account),
        });
      } else {
        console.warn(`[stripe/webhook] account.updated ignoré : ${account.id} sans rattachement signé.`);
      }
      break;
    }
    // Prélèvement d'un bilan mensuel (compte Connect du kiné) : résultat final,
    // utile surtout quand la banque répond après coup.
    case "payment_intent.succeeded":
    case "payment_intent.processing":
    case "payment_intent.payment_failed": {
      if (event.account) {
        await syncReviewPaymentFromIntent(event.data.object as Stripe.PaymentIntent, event.account);
      }
      break;
    }
    // Facture EasyPhysio du kiné (compte plateforme).
    case "invoice.paid":
    case "invoice.payment_failed":
    case "invoice.marked_uncollectible": {
      if (!event.account) await syncPlatformInvoice(event.data.object as Stripe.Invoice);
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
