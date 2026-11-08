import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/billing/stripe";
import { connectStatusFromAccount, verifiedInstructorId } from "@/lib/billing/connectStatus";
import { connectAccountDeauthorized, upsertConnectAccount } from "@/lib/db/admin";
import { handleFollowUpSetupEvent, syncReviewDispute, syncReviewPaymentFromIntent, syncReviewRefund } from "@/lib/billing/followUp";
import { finalizePlatformBillingSetup, syncPlatformInvoice } from "@/lib/billing/platformInvoice";
import {
  finalizePatientCardChange,
  isPatientCardSession,
  refreshPatientSubscription,
  syncPatientSubscriptionFromEvent,
} from "@/lib/billing/patientSubscription";

// Stripe needs the Node runtime (not Edge) and the raw request body to verify
// the signature, so this route reads req.text() and never parses JSON first.
export const runtime = "nodejs";

// Stripe envoie les événements des comptes Connect des kinés et ceux du
// compte plateforme par deux points d'envoi distincts, chacun avec SON secret
// (audit du 2026-10-08). Les deux peuvent viser cette même adresse :
// STRIPE_WEBHOOK_SECRET (plateforme) et STRIPE_CONNECT_WEBHOOK_SECRET
// (Connect) — on accepte une signature valide pour l'un ou l'autre.
//
// Événements attendus (scripts/configurer-stripe.mjs les règle en mode test) :
//   plateforme : checkout.session.completed, customer.subscription.created /
//                updated / deleted, invoice.paid / payment_failed /
//                marked_uncollectible ;
//   Connect    : checkout.session.completed, account.updated,
//                account.application.deauthorized, payment_intent.succeeded /
//                processing / payment_failed, charge.refunded,
//                charge.dispute.created / closed.
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
      // Enregistrement d'une carte, sans prélèvement. Sur un compte Connect =
      // suivi mensuel d'un patient (ancien parcours) ; sur la plateforme =
      // changement de carte d'un patient, ou ancien moyen de paiement d'un kiné.
      if (session.mode === "setup") {
        if (event.account) await handleFollowUpSetupEvent(session, event.account);
        else if (isPatientCardSession(session)) await finalizePatientCardChange(session.id);
        else await finalizePlatformBillingSetup(session.id);
        break;
      }
      // Abonnement d'accès du patient (compte EasyPhysio, modèle du
      // 2026-11-04) ; sur un compte Connect : formule de l'ancien modèle.
      if (session.mode === "subscription") {
        const subId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
        if (subId) await refreshPatientSubscription(subId, event.account ?? null);
      }
      // Mode « payment » (patient qui règle lui-même un mois refusé) : c'est
      // payment_intent.succeeded, plus bas, qui marque le mois payé.
      break;
    }
    // Abonnement d'accès créé, renouvelé, résilié, paiement refusé… (compte
    // EasyPhysio) ; ou formule de l'ancien modèle (compte Connect du kiné),
    // arrêtée à la fin de sa période. Ignoré s'il n'a pas été créé par
    // EasyPhysio. On relit l'état actuel chez Stripe (événements dans le
    // désordre) et la base ignore un ancien abonnement quand un plus récent
    // est en cours (migration 0086).
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      await syncPatientSubscriptionFromEvent(event.data.object as Stripe.Subscription, event.account ?? null);
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
    // Le kiné a déconnecté son compte Stripe d'EasyPhysio : plus aucun
    // prélèvement possible. Sa fiche repasse à « pas encore activé » et
    // « Suivi & facturation » lui propose de reconnecter un compte.
    // L'identité du compte vient de Stripe (event.account), pas du kiné.
    case "account.application.deauthorized": {
      if (event.account) {
        const instructorId = await connectAccountDeauthorized(event.account);
        console.warn(`[stripe/webhook] compte ${event.account} déconnecté (kiné ${instructorId ?? "inconnu"}).`);
      }
      break;
    }
    // Paiement des honoraires d'un mois (compte Connect du kiné) : résultat
    // final, utile surtout quand la banque répond après coup.
    case "payment_intent.succeeded":
    case "payment_intent.processing":
    case "payment_intent.payment_failed": {
      if (event.account) {
        await syncReviewPaymentFromIntent(event.data.object as Stripe.PaymentIntent, event.account);
      }
      break;
    }
    // Remboursement par le kiné, ou litige ouvert / clos par la banque du patient.
    case "charge.refunded": {
      if (event.account) await syncReviewRefund(event.data.object as Stripe.Charge, event.account);
      break;
    }
    case "charge.dispute.created":
    case "charge.dispute.closed": {
      if (event.account) await syncReviewDispute(event.data.object as Stripe.Dispute, event.account);
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
