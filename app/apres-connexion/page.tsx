import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { getInstructor } from "@/lib/dashboard/instructor";
import ClientRedirect from "./ClientRedirect";

// Single landing spot for the SignIn component's fallbackRedirectUrl — Clerk
// doesn't know the role before sign-in completes, so every login lands here
// first. The role is resolved server-side, but the actual navigation happens
// client-side (see ClientRedirect) rather than via redirect(): a redirect()
// thrown as the direct target of Clerk's post-sign-in push hangs the
// transition in this app's dev environment (Next 16 + Turbopack).
//
// requireUser() itself calls redirect() internally (e.g. to /login, or to
// /connection-error on a Clerk hiccup) — perfectly fine from every other
// page that uses it, but that internal redirect() is just as much "the
// direct target of Clerk's post-sign-in push" here as our own would be, so
// it hangs the exact same way (confirmed 2026-09-15 — this page went blank
// forever instead of the redirect happening, right after wiring up the
// /connection-error fallback below). Catching it and re-issuing it through
// ClientRedirect keeps requireUser()'s contract for every other caller intact
// while never letting an actual redirect() escape this one page's render.
export default async function AfterSignIn() {
  const supabase = await createClient();
  try {
    const user = await requireUser(supabase);
    // getInstructor() throws on a real query failure (PostgREST hiccup)
    // instead of silently returning null — right here, right after a fresh
    // sign-in, is exactly where that would otherwise misroute a real
    // instructor to /patient.
    const instructor = await getInstructor(supabase, user.id);
    return <ClientRedirect to={instructor ? "/dashboard" : "/patient"} />;
  } catch (err) {
    const digest = (err as { digest?: unknown })?.digest;
    if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) {
      const parts = digest.split(";");
      const to = parts.slice(2, -2).join(";") || "/login";
      return <ClientRedirect to={to} />;
    }
    // Not a redirect — a genuine getInstructor() failure.
    return <ClientRedirect to="/connection-error?next=/apres-connexion" />;
  }
}
