import { createClient } from "@supabase/supabase-js";

// SERVER-ONLY admin client. Uses the secret service-role key, which BYPASSES all
// Row-Level Security. Never import this into a Client Component or expose it to the
// browser. Only used for privileged actions like creating/inviting patient accounts.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
