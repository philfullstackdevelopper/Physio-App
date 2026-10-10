import { cache } from "react";
import { cookies, headers } from "next/headers";
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

// auth()'s own local JWT check turned out NOT to be the network-call-free
// last word the comment above assumes: clerkMiddleware (proxy.ts) can hit a
// "handshake" — a real round-trip to Clerk's Frontend API to refresh a
// stale session token — before auth() ever resolves. On the dev instance,
// that handshake can itself get rate-limited, and when it fails auth()
// reports no userId even though the browser's Clerk client still holds a
// perfectly valid session. Redirecting straight to /login in that case
// recreates the exact /login <-> /apres-connexion bounce this file already
// fixed once for currentUser() (Philippe, 2026-09-15).
//
// __client_uat is Clerk's own signal for this: a non-httpOnly cookie set to
// a session's last-updated timestamp whenever the browser has ever signed
// in, kept in sync independently of the __session JWT. Its presence means
// "the browser believes it's signed in" — so if auth() says no session but
// this cookie is still there, treat it as ambiguous (handshake/rate-limit
// hiccup) rather than a real sign-out.
async function looksSignedInClientSide(): Promise<boolean> {
  const jar = await cookies();
  const uat = jar.get("__client_uat")?.value;
  return !!uat && uat !== "0";
}

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
// Mémoire courte des utilisateurs déjà vérifiés (2026-10-10). Avant, CHAQUE
// page redemandait à Clerk « qui est cette personne ? » (currentUser(), un
// appel réseau) puis à la base son identifiant interne. Sur l'instance Clerk
// de développement, un seul de ces appels en échec suffisait à envoyer un
// patient tout neuf sur « Problème de connexion » en plein milieu de son
// inscription (invitation → CGU → questionnaire : un appel par écran).
// Désormais, une fois la personne vérifiée, on s'en souvient 5 minutes : la
// session elle-même reste contrôlée à chaque requête par auth() (signature
// du jeton, sans appel réseau) — seule la relecture de l'e-mail et de
// l'identifiant interne est évitée. Par conteneur, perdue au redémarrage.
const KNOWN_TTL_MS = 5 * 60_000;
const knownUsers = new Map<string, { id: string; email: string; at: number }>();

/** À appeler quand un compte est supprimé ou change d'identité. */
export function forgetKnownUser(clerkId: string): void {
  knownUsers.delete(clerkId);
}

// Où revenir après « Problème de connexion » : la page où la personne était
// (en-tête x-pathname posé par proxy.ts), pas la page de connexion — sinon
// « Réessayer » repassait par /login et pouvait retomber sur la même panne.
async function connectionErrorUrl(): Promise<string> {
  const here = (await headers()).get("x-pathname") ?? "";
  const next = here.startsWith("/") && !here.startsWith("/connection-error") ? here : "/login";
  return `/connection-error?next=${encodeURIComponent(next)}`;
}

const loadUser = cache(async (): Promise<AppUser> => {
  // Local JWT check first — cheap, no network call, can't be rate-limited
  // *by itself*. But it can come back empty because the middleware's own
  // handshake with Clerk failed (see looksSignedInClientSide above), so a
  // bare "no userId" isn't proof the user is actually signed out.
  const { userId } = await auth();
  if (!userId) {
    if (await looksSignedInClientSide()) {
      redirect(await connectionErrorUrl());
    }
    redirect("/login");
  }

  const known = knownUsers.get(userId);
  if (known && Date.now() - known.at < KNOWN_TTL_MS) {
    return { id: known.id, email: known.email, clerkId: userId };
  }

  // getClerkUser() can also *throw* (e.g. Clerk's dev-instance rate limit —
  // a 429 ClerkAPIResponseError), not just resolve to null. That case wasn't
  // handled at all before: the exception propagated straight out of this
  // Server Component, crashing the whole page instead of falling back to
  // /connection-error like the "resolved to null" case below already does
  // (Philippe, 2026-09-10 — a burst of testing tripped Clerk's rate limit and
  // /patient/onboarding hard-crashed instead of showing a retry screen).
  let user: Awaited<ReturnType<typeof getClerkUser>>;
  try {
    user = await getClerkUser();
  } catch {
    redirect(await connectionErrorUrl());
  }

  if (!user) {
    // auth() just confirmed a valid session, so a null user here means the
    // live currentUser() call itself failed (rate limit, transient network
    // error) — not that the user is signed out. Do NOT redirect to /login:
    // that's exactly the bogus redirect that caused the infinite bounce
    // (see comment above getClerkUser). /connection-error already exists
    // for this "probably still signed in, just couldn't verify" case (see
    // the no-email branch below) — reuse it instead of inventing a new one.
    redirect(await connectionErrorUrl());
  }

  const email = user.primaryEmailAddress?.emailAddress ?? "";
  if (!email) {
    // Accounts here are e-mail based (invites, Stripe customer matching);
    // an account without a verified primary address cannot be mapped safely.
    redirect("/connection-error?next=/login");
  }

  const id = await resolveAppUserId(user.id, email);

  knownUsers.set(user.id, { id, email, at: Date.now() });
  return { id, email, clerkId: user.id };
});

export async function requireUser(_supabase?: unknown): Promise<AppUser> {
  void _supabase; // gardé pour la compatibilité des appels existants (voir loadUser ci-dessus)
  return loadUser();
}
