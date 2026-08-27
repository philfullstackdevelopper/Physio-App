import { cache } from "react";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { auth } from "@clerk/nextjs/server";

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
      accessToken: async () => {
        const { getToken } = await auth();
        return (await getToken()) ?? null;
      },
    },
  );
});
