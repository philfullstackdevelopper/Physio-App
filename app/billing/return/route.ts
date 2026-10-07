import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/billing/stripe";
import { syncSubscription } from "@/lib/billing/sync";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";

// Where Stripe sends the user after a successful checkout. We retrieve the
// session, sync the subscription into our DB (the "easy path", no webhook
// needed for local testing), then redirect to the right home with a flag.
export const runtime = "nodejs";

// The patient tier checkout is a Direct charge created ON the kiné's own
// Connect account (app/patient/abonnement/actions.ts, `stripeAccount`), so
// the session only exists there — retrieving it from the platform account
// fails with "No such checkout session", which used to be swallowed and
// left the patient bounced back to /patient/abonnement right after paying
// (Philippe, 2026-10-01). Resolve that account exactly the way the checkout
// did: the signed-in patient's own instructor, readable through
// connect_accounts_patient_read (migration 0057).
async function patientConnectAccount(): Promise<{ userId: string; account: string } | null> {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const { data: patient } = await supabase
    .from("patients")
    .select("instructor_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!patient?.instructor_id) return null;
  const { data: connect } = await supabase
    .from("instructor_connect_accounts")
    .select("stripe_connect_account_id")
    .eq("instructor_id", patient.instructor_id as string)
    .maybeSingle();
  const account = (connect?.stripe_connect_account_id as string | null) ?? null;
  return account ? { userId: user.id, account } : null;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sessionId = url.searchParams.get("session_id");

  if (sessionId) {
    try {
      const connect = await patientConnectAccount();
      let session: Stripe.Checkout.Session;
      if (connect) {
        session = await getStripe().checkout.sessions.retrieve(
          sessionId,
          { expand: ["subscription"] },
          { stripeAccount: connect.account },
        );
        // Only ever sync a session that belongs to the signed-in patient.
        if (session.metadata?.user_id !== connect.userId) {
          throw new Error("La session Stripe n'appartient pas à ce patient.");
        }
      } else {
        // Platform-account checkouts (the older /billing flow).
        session = await getStripe().checkout.sessions.retrieve(sessionId, { expand: ["subscription"] });
      }
      const sub = session.subscription;
      if (sub && typeof sub !== "string") {
        await syncSubscription(
          sub,
          {
            user_id: session.metadata?.user_id,
            plan: session.metadata?.plan,
          },
          { stripeAccount: connect?.account ?? null },
        );
      }
    } catch (err) {
      // requireUser() signals "not signed in" by throwing a redirect — let
      // Next handle that one rather than logging it as a sync failure.
      const digest = (err as { digest?: unknown })?.digest;
      if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) throw err;
      // Still redirect the user somewhere sensible — but never silently:
      // a failed sync (e.g. the local `scalingo db-tunnel` not running, so
      // lib/db/admin.ts can't reach Postgres) leaves the patient bounced
      // back to /patient/abonnement right after paying, with nothing in the
      // logs to say why (Philippe, 2026-10-01).
      console.error("[billing/return] syncSubscription a échoué :", err);
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
