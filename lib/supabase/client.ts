import { createBrowserClient } from "@supabase/ssr";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "@/i18n/locales";
import { localizingFetch } from "@/lib/i18n/dbContent";

// Langue de l'interface, lue dans le cookie (voir i18n/request.ts).
function browserLocale(): Locale {
  if (typeof document === "undefined") return DEFAULT_LOCALE;
  const m = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]+)`));
  return m && isLocale(m[1]) ? m[1] : DEFAULT_LOCALE;
}

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
      // Textes de la plateforme dans la langue de l'interface (lib/i18n/dbContent.ts).
      global: { fetch: localizingFetch(browserLocale) },
    },
  );
}

// Storage-only browser client. Since the Scalingo migration (CLAUDE.md §7),
// createClient() above points at PostgREST (the database), which has no
// Storage API at all — Supabase Storage (still the only file-storage
// backend, see lib/storage/*) needs its own client pointed at Supabase's
// real project URL regardless of which database is live. Used by
// lib/storage/client.ts's uploadFile() for the one bucket that still
// uploads through Supabase Storage directly (exercise-media).
export function createStorageClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_STORAGE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
