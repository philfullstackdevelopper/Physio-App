import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/billing/stripe";
import { syncSubscription } from "@/lib/billing/sync";

// Stripe needs the Node runtime (not Edge) and the raw request body to verify
// the signature, so this route reads req.text() and never parses JSON first.
export const runtime = "nodejs";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: "Webhook non configuré." }, { status: 400 });
  }

  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch {
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
        await syncSubscription(sub, {
          user_id: session.metadata?.user_id,
          plan: session.metadata?.plan,
        });
      }
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      await syncSubscription(event.data.object as Stripe.Subscription);
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
