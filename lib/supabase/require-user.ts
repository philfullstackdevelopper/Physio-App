import { cache } from "react";
import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { resolveAppUserId } from "@/lib/auth/user-map";

// currentUser() makes a live network call to Clerk's API (unlike auth(),
// which only verifies the JWT locally) — and Clerk dev instances have
// strict rate limits. requireUser() is called independently by both the
// dashboard layout and its pages on every request, which was enough to
// intermittently trip that limit and cause a bogus "not signed in" redirect
// on a real, valid session. cache() dedupes repeat calls within one request
// so currentUser() only actually runs once no matter how many places on the
// same page call requireUser().
//
// That bogus redirect used to be indistinguishable from a real "not signed
// in": both showed up as currentUser() returning null. Redirecting to
// /login while a valid session cookie is still present is what caused the
// infinite bounce — Clerk's client-side <SignIn> immediately re-detects the
// (still valid) session and redirects straight back into the app, which can
// hit the rate limit again, and so on. auth() below verifies the session
// locally (no network call, so it can't be rate-limited) and is the real
// source of truth for "is this session valid at all".
const getClerkUser = cache(() => currentUser());

// The Clerk replacement of the old Supabase-based requireUser().
// Same call signature as before — existing callers do
// `const user = await requireUser(supabase)` and keep working.
//
// Returns:
//   id      – the internal uuid used across the database (instructors.id,
//             patients.id, ...), resolved from public.app_users. NOT the raw
//             Clerk id; every `eq("id", user.id)` query keeps meaning the same
//             thing it always did.
//   email   – primary e-mail address on the Clerk account.
//   clerkId – the raw Clerk user id ("user_2abc..."), rarely needed directly.
export type AppUser = {
  id: string;
  email: string;
  clerkId: string;
};

// The Clerk lookup above was already cache()-deduped, but resolveAppUserId()
// — a real Supabase round trip — was not, so every extra requireUser() call
// on the same request (layout + page is the common case) still paid for it
// twice. Wrapping the whole thing dedupes both. Takes no arguments (the
// unused _supabase param below is never read here), so every call within one
// request hits the same cache entry regardless of which client instance the
// caller happened to pass in.
const loadUser = cache(async (): Promise<AppUser> => {
  // Local JWT check first — cheap, no network call, can't be rate-limited.
  // If this says there's no session, the user really is signed out.
  const { userId } = await auth();
  if (!userId) {
    redirect("/login");
  }

  const user = await getClerkUser();

  if (!user) {
    // auth() just confirmed a valid session, so a null user here means the
    // live currentUser() call itself failed (rate limit, transient network
    // error) — not that the user is signed out. Do NOT redirect to /login:
    // that's exactly the bogus redirect that caused the infinite bounce
    // (see comment above getClerkUser). /connection-error already exists
    // for this "probably still signed in, just couldn't verify" case (see
    // the no-email branch below) — reuse it instead of inventing a new one.
    redirect("/connection-error?next=/login");
  }

  const email = user.primaryEmailAddress?.emailAddress ?? "";
  if (!email) {
    // Accounts here are e-mail based (invites, Stripe customer matching);
    // an account without a verified primary address cannot be mapped safely.
    redirect("/connection-error?next=/login");
  }

  const id = await resolveAppUserId(user.id, email);

  return { id, email, clerkId: user.id };
});

export async function requireUser(_supabase?: unknown): Promise<AppUser> {
  return loadUser();
}
