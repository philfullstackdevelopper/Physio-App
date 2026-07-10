// Server-only Stripe client. The secret key must never reach the browser — only
// import this from server code (server actions, route handlers).
import Stripe from "stripe";

let client: Stripe | null = null;

// Built on first call, not at import time: Next.js imports this module while
// collecting page data at build time, so throwing at module scope would fail the
// whole production build on any environment without the key set.
export function getStripe(): Stripe {
  if (!client) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error("STRIPE_SECRET_KEY is not set — add it to .env.local (see .env.example).");
    }
    // No apiVersion pinned: uses the version bundled with the installed SDK.
    client = new Stripe(key);
  }
  return client;
}
