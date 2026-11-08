// Server-only Stripe client. The secret key must never reach the browser — only
// import this from server code (server actions, route handlers).
import Stripe from "stripe";

/** Version de l'API Stripe utilisée par EasyPhysio (celle du SDK installé). */
export const STRIPE_API_VERSION = "2026-06-24.dahlia" as const;

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
    // Pinned to the version the installed SDK (stripe 22.x) is typed for
    // (node_modules/stripe/cjs/apiVersion.js). On an SDK upgrade, change both
    // together and re-check lib/billing/patientSubscription.ts periodEndISO
    // (since 2025, the period end lives on the subscription item).
    client = new Stripe(key, { apiVersion: STRIPE_API_VERSION });
  }
  return client;
}
