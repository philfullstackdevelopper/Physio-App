import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { getInstructor } from "@/lib/dashboard/instructor";
import ClientRedirect from "./ClientRedirect";

// Single landing spot for the SignIn component's fallbackRedirectUrl — Clerk
// doesn't know the role before sign-in completes, so every login lands here
// first. The role is resolved server-side, but the actual navigation happens
// client-side (see ClientRedirect) rather than via redirect(): a redirect()
// thrown as the direct target of Clerk's post-sign-in push hangs the
// transition in this app's dev environment (Next 16 + Turbopack).
export default async function AfterSignIn() {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const instructor = await getInstructor(supabase, user.id);
  return <ClientRedirect to={instructor ? "/dashboard" : "/patient"} />;
}
