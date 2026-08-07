import { redirect } from "next/navigation";
import { auth } from "@/auth";

// NOT YET WIRED INTO THE LIVE APP (Scalingo migration, Phase 2/3).
// Auth.js equivalent of lib/supabase/require-user.ts's requireUser(): every
// server file that today does `const user = await requireUser(supabase)`
// will do `const user = await requireUser()` (no client argument — there's
// no per-request Supabase client to pass anymore, auth() reads the session
// cookie directly). Same redirect-to-/login behavior on no session.
export async function requireUser() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  return session.user as { id: string; email: string; role?: string };
}
