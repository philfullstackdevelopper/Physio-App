import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { resolveAppUserId } from "@/lib/auth/user-map";
import { createAdminClient } from "@/lib/supabase/admin";

// Landing page right after a new instructor finishes Clerk's sign-up flow.
// Clerk created the identity; this page records the instructor profile row the
// app needs (same job the old signup() server action did inline), with
// status "pending" so the manual approval gate still applies.
//
// Uses the service-role client: at this instant RLS would refuse the insert —
// the person is logged in to Clerk, but their uuid has no instructors row yet,
// which is exactly what we're creating.
export default async function SignupFinalizePage() {
  const user = await currentUser();
  if (!user) redirect("/login");

  const email = user.primaryEmailAddress?.emailAddress ?? "";
  if (!email) redirect("/login");

  const appId = await resolveAppUserId(user.id, email);
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("instructors")
    .select("status")
    .eq("id", appId)
    .maybeSingle();

  if (!existing) {
    const fullName =
      [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
      email.split("@")[0];

    const { error } = await admin.from("instructors").insert({
      id: appId,
      full_name: fullName,
      email,
      status: "pending",
    });

    if (error) {
      redirect(`/connection-error?next=${encodeURIComponent("/dashboard")}`);
    }
    redirect("/signup/pending");
  }

  // Already had a profile (re-run, or previously approved account re-signing up).
  redirect(existing.status === "approved" ? "/dashboard" : "/signup/pending");
}
