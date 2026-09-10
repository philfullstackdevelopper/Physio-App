import { NextResponse } from "next/server";
import { getStripe } from "@/lib/billing/stripe";
import { syncSubscription } from "@/lib/billing/sync";

// Where Stripe sends the user after a successful checkout. We retrieve the
// session, sync the subscription into our DB (the "easy path", no webhook
// needed for local testing), then redirect to the right home with a flag.
export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sessionId = url.searchParams.get("session_id");

  if (sessionId) {
    try {
      const session = await getStripe().checkout.sessions.retrieve(sessionId, {
        expand: ["subscription"],
      });
      const sub = session.subscription;
      if (sub && typeof sub !== "string") {
        await syncSubscription(sub, {
          user_id: session.metadata?.user_id,
          plan: session.metadata?.plan,
        });
      }
    } catch {
      /* ignore — still redirect the user somewhere sensible */
    }
  }

  // `next` lets the caller choose the landing page (the patient tier checkout
  // sends people into the app, not to the old /billing page). Only a
  // same-site path is honoured — never an absolute URL, so this can't be
  // turned into an open redirect.
  const next = url.searchParams.get("next");
  const target = next && next.startsWith("/") && !next.startsWith("//") ? next : "/billing?subscribed=1";
  return NextResponse.redirect(new URL(target, url.origin));
}
