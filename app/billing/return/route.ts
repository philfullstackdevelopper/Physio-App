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

  // Back to the billing page so the user sees their access level update.
  return NextResponse.redirect(new URL("/billing?subscribed=1", url.origin));
}
