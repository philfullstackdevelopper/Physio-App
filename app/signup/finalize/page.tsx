import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { currentUser } from "@clerk/nextjs/server";
import { resolveAppUserId } from "@/lib/auth/user-map";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyRpps } from "@/lib/instructor/rppsVerification";

const PENDING_CABINET_COOKIE = "pending_cabinet";

type PendingCabinet = {
  cabinetName: string;
  cabinetAddress: string;
  phone: string;
  rppsNumber: string;
  siret: string | null;
};

function readPendingCabinet(raw: string | undefined): PendingCabinet | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw));
    if (!parsed?.cabinetName || !parsed?.cabinetAddress || !parsed?.phone || !parsed?.rppsNumber) return null;
    return parsed as PendingCabinet;
  } catch {
    return null;
  }
}

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

  // Cabinet details filled in BEFORE the Clerk account existed (see
  // components/KineSignupFlow.tsx — cabinet form first, account creation
  // last, like a real professional signup) — stashed in a short-lived
  // cookie because there was no instructors row yet to save them to. If
  // it's missing (cleared cookies, an old link, direct Clerk sign-up), the
  // row is created bare and app/signup/onboarding picks up the slack.
  const pendingCabinet = readPendingCabinet((await cookies()).get(PENDING_CABINET_COOKIE)?.value);

  const { data: existing } = await admin
    .from("instructors")
    .select("status, cabinet_name")
    .eq("id", appId)
    .maybeSingle();

  if (!existing) {
    const fullName =
      [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
      email.split("@")[0];

    const verification = pendingCabinet ? await verifyRpps(pendingCabinet.rppsNumber, fullName) : null;
    // A confirmed RPPS + name match (see lib/instructor/rppsVerification.ts)
    // skips the manual /admin approval queue entirely (Philippe, 2026-09-10)
    // — an unverified or missing RPPS still needs a human to check it by
    // hand, same as today.
    const autoApproved = verification?.status === "verified";

    const { error } = await admin.from("instructors").insert({
      id: appId,
      full_name: fullName,
      email,
      status: autoApproved ? "approved" : "pending",
      ...(pendingCabinet && {
        cabinet_name: pendingCabinet.cabinetName,
        cabinet_address: pendingCabinet.cabinetAddress,
        phone: pendingCabinet.phone,
        rpps_number: pendingCabinet.rppsNumber,
        siret: pendingCabinet.siret,
        rpps_verified_at: verification?.status === "verified" ? verification.verifiedAt : null,
      }),
    });

    if (error) {
      redirect(`/connection-error?next=${encodeURIComponent("/dashboard")}`);
    }
    // Auto-approved → straight into the app. Cabinet details on file but not
    // (yet) verified → the waiting screen. Missing entirely (recovery path,
    // no cookie) → collect them now.
    redirect(autoApproved ? "/dashboard" : pendingCabinet ? "/signup/pending" : "/signup/onboarding");
  }

  // Already had a profile (re-run, or previously approved account re-signing up).
  if (existing.status === "approved") redirect("/dashboard");
  redirect(existing.cabinet_name ? "/signup/pending" : "/signup/onboarding");
}
