import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { SupabaseClient, User } from "@supabase/supabase-js";

// Same as `supabase.auth.getUser()` + "redirect to /login if missing", except a
// network failure reaching Supabase (AuthRetryableFetchError — a dropped
// connection, a slow cold start, ...) is treated differently from "not logged
// in": it sends the user to a "connection problem, retry" page instead of
// silently bouncing them to /login, which would look like a random logout even
// though their session cookie may still be perfectly valid.
export async function requireUser(supabase: SupabaseClient): Promise<User> {
  const { data, error } = await supabase.auth.getUser();
  if (data.user) return data.user;

  if (error?.name === "AuthRetryableFetchError") {
    const hdrs = await headers();
    redirect(`/connection-error?next=${encodeURIComponent(pathOf(hdrs.get("referer")))}`);
  }

  redirect("/login");
}

// Keeps only the path + query of the referer, discarding its origin, so the
// retry link we build from it can never point off-site.
function pathOf(referer: string | null): string {
  if (!referer) return "/dashboard";
  try {
    const url = new URL(referer);
    return url.pathname + url.search;
  } catch {
    return "/dashboard";
  }
}
