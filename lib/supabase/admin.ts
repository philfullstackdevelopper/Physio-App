import { createClient } from "@supabase/supabase-js";

// SERVER-ONLY admin client. Uses the secret service-role key, which BYPASSES all
// Row-Level Security. Never import this into a Client Component or expose it to the
// browser. Only used for privileged actions like creating/inviting patient accounts.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  // Checked here rather than asserted with `!`: an unset key would otherwise build
  // a client that fails later with an opaque auth error far from the real cause.
  if (!url || !serviceRoleKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set to use the admin client.",
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
