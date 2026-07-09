// Server-only Stripe client. The secret key must never reach the browser — only
// import this from server code (server actions, route handlers).
import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  throw new Error("STRIPE_SECRET_KEY is not set — add it to .env.local (see .env.example).");
}

// No apiVersion pinned: uses the version bundled with the installed SDK.
export const stripe = new Stripe(key);
