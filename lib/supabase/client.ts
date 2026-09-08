import { createBrowserClient } from "@supabase/ssr";

type ClerkWindow = Window & {
  Clerk?: { session?: { getToken?: () => Promise<string | null> } };
};

// Supabase client for use in Client Components ("use client").
// Same third-party bridge as lib/supabase/server.ts: queries are authenticated
// with the Clerk session token held by window.Clerk (loaded by <ClerkProvider>),
// NOT with a Supabase auth cookie.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      accessToken: () => {
        // This client is also constructed during the server render pass of
        // its "use client" callers (Next.js renders Client Components on the
        // server too, for the initial HTML/RSC payload) — where `window`
        // doesn't exist. Without this guard, that SSR pass throws, and Next
        // silently falls back to client-only rendering, which hangs the
        // client-side navigation that follows Clerk sign-in.
        if (typeof window === "undefined") return Promise.resolve(null);
        const getToken = (window as ClerkWindow).Clerk?.session?.getToken;
        return getToken ? getToken() : Promise.resolve(null);
      },
    },
  );
}
