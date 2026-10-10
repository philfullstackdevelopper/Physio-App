import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/billing/stripe";
import { syncSubscription } from "@/lib/billing/sync";
import { connectStatusFromAccount, verifiedInstructorId } from "@/lib/billing/connectStatus";
import { upsertConnectAccount } from "@/lib/db/admin";

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
      if (session.subscription) {
        const subId =
          typeof session.subscription === "string" ? session.subscription : session.subscription.id;
        // The checkout session (and the subscription it created) lives on the
        // kiné's own Connect account (Direct charge — app/patient/abonnement/actions.ts),
        // never on the platform account. A Connect webhook event carries which
        // connected account it came from in `event.account`; without passing
        // that back as the request option, the platform's own view of Stripe
        // can't see the connected account's objects at all ("No such
        // subscription" — confirmed via a live test, 2026-09-11).
        const sub = await stripe.subscriptions.retrieve(
          subId,
          undefined,
          event.account ? { stripeAccount: event.account } : undefined,
        );
        await syncSubscription(
          sub,
          {
            user_id: session.metadata?.user_id,
            plan: session.metadata?.plan,
          },
          { stripeAccount: event.account },
        );
      }
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      // event.account : le compte Connect du kiné d'où vient l'événement —
      // syncSubscription en a besoin pour vérifier qu'un événement tardif
      // d'un ancien abonnement n'écrase pas l'abonnement en cours.
      // Stripe ne garantit pas l'ordre des événements (audit du 2026-10-08) :
      // un « updated (active) » arrivé APRÈS le « deleted » rendait l'accès.
      // On relit donc l'abonnement chez Stripe et on enregistre son état
      // ACTUEL, pas celui figé dans l'événement.
      const fromEvent = event.data.object as Stripe.Subscription;
      let current = fromEvent;
      try {
        current = await stripe.subscriptions.retrieve(
          fromEvent.id,
          undefined,
          event.account ? { stripeAccount: event.account } : undefined,
        );
      } catch (err) {
        console.error(`[stripe/webhook] relecture de ${fromEvent.id} impossible, état de l'événement utilisé :`, err);
      }
      await syncSubscription(current, undefined, { stripeAccount: event.account });
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
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
