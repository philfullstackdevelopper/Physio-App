import { createClient } from "@supabase/supabase-js";

// SERVER-ONLY admin client. Uses the secret service-role key, which BYPASSES all
// Row-Level Security. Never import this into a Client Component or expose it to the
// browser.
//
// Storage-only today: since the Scalingo migration (see CLAUDE.md §7),
// NEXT_PUBLIC_SUPABASE_URL points at PostgREST (the database), not at
// Supabase's own API — but Supabase Storage (still the only file-storage
// backend, see lib/storage/*) is a separate product with its own URL, which
// never changes regardless of which database is live. Hence the dedicated
// SUPABASE_STORAGE_URL instead of reusing NEXT_PUBLIC_SUPABASE_URL here.
export function createAdminClient() {
  const url = process.env.SUPABASE_STORAGE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  // Checked here rather than asserted with `!`: an unset key would otherwise build
  // a client that fails later with an opaque auth error far from the real cause.
  if (!url || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_STORAGE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY must be set to use the admin client.",
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
