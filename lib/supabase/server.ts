import { cache } from "react";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { auth, clerkClient } from "@clerk/nextjs/server";

// Supabase client for use in Server Components, Route Handlers, and Server Actions.
//
// Uses the plain @supabase/supabase-js client, NOT @supabase/ssr's
// createServerClient: that wrapper unconditionally calls
// client.auth.onAuthStateChange() internally to sync Supabase's own
// cookie-based session, which throws once `accessToken` is set (Supabase
// disallows any supabase.auth.* access in third-party-auth mode). We don't
// need that cookie sync anyway — Clerk owns the session, not Supabase.
//
// cache()-wrapped so every layout/page/action on the same request shares one
// client (and one Clerk token check) instead of each building its own —
// mirrors the same dedupe requireUser() relies on.
//
// The token fetch itself is ALSO cache()-deduped (getAccessToken below) so a
// page issuing several sequential queries (onboarding does several:
// conditions, patient_profiles…) only calls Clerk's getToken() once per
// request — a reasonable dedupe regardless, but NOT a fix for PGRST301 "No
// suitable key or wrong key type": that error means Supabase can't verify the
// Clerk JWT's signature at all, every time, not just under repeated calls.
// It's a Supabase Authentication → Third-Party Auth configuration problem
// (the Clerk domain/JWKS Supabase trusts doesn't match this Clerk instance),
// not something fixable from this file — see Clerk Dashboard → Configure →
// Integrations → Supabase for the values Supabase's side needs.
//
// Fraîcheur du jeton : getToken() renvoie le jeton de session du cookie de la
// requête, qui ne vit que 60 s. Clerk l'accepte jusqu'au bout (et même 5 s
// après), mais une page lente à rendre (compilation Turbopack en dev, réveil
// du PC) peut le laisser expirer AVANT que PostgREST ne le vérifie → « JWT
// expired » (Philippe, 2026-10-01, crash dans resolveAppUserId). S'il reste
// moins de MIN_TOKEN_LIFETIME_S, on en demande un neuf à Clerk — un appel
// réseau seulement dans ce cas rare, donc sans risque pour le rate limit.
const MIN_TOKEN_LIFETIME_S = 30;

function secondsLeft(jwt: string): number {
  try {
    const payload = JSON.parse(Buffer.from(jwt.split(".")[1], "base64url").toString("utf8"));
    return typeof payload.exp === "number" ? payload.exp - Date.now() / 1000 : Infinity;
  } catch {
    return Infinity;
  }
}

const getAccessToken = cache(async () => {
  const { getToken, sessionId } = await auth();
  const token = await getToken();
  if (!token || !sessionId || secondsLeft(token) >= MIN_TOKEN_LIFETIME_S) return token ?? null;
  try {
    const fresh = await (await clerkClient()).sessions.getToken(sessionId);
    return fresh.jwt;
  } catch {
    // Clerk injoignable : on tente quand même avec l'ancien jeton.
    return token;
  }
});

export const createClient = cache(async () => {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Third-party auth bridge: instead of a Supabase-issued JWT, every query
      // now carries the signed Clerk session token. Supabase verifies it
      // against Clerk's JWKS once Clerk is enabled under Authentication →
      // Third-Party Auth, and RLS resolves identity via public.app_users
      // (auth.jwt()->>'sub' = the Clerk id; see migration 0018).
      accessToken: getAccessToken,
    },
  );
});
