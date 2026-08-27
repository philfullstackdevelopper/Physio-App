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
        const getToken = (window as ClerkWindow).Clerk?.session?.getToken;
        return getToken ? getToken() : Promise.resolve(null);
      },
    },
  );
}
