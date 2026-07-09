// Server helper: resolve the CURRENT user's access level in one call, so any
// page/route can gate features through the same source of truth. Reads role
// (patient vs kiné) + trial + subscription, then delegates to the pure logic
// in access.ts.
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  patientAccess,
  instructorAccess,
  type PatientAccess,
  type InstructorAccess,
} from "./access";

export type AccessContext =
  | { role: "patient"; access: PatientAccess; trialEndsAt: string | null }
  | { role: "instructor"; access: InstructorAccess }
  | { role: "unknown" };

export async function getCurrentAccess(
  supabase: SupabaseClient,
  userId: string,
): Promise<AccessContext> {
  const [{ data: kine }, { data: pat }, { data: sub }] = await Promise.all([
    supabase.from("instructors").select("id").eq("id", userId).maybeSingle(),
    supabase.from("patients").select("id, trial_ends_at").eq("id", userId).maybeSingle(),
    supabase.from("subscriptions").select("status, current_period_end").eq("user_id", userId).maybeSingle(),
  ]);

  const subStatus = (sub?.status as string | null) ?? null;
  const subCurrentPeriodEnd = (sub?.current_period_end as string | null) ?? null;

  if (kine) {
    return { role: "instructor", access: instructorAccess({ subStatus, subCurrentPeriodEnd }) };
  }
  if (pat) {
    const trialEndsAt = (pat.trial_ends_at as string | null) ?? null;
    return {
      role: "patient",
      access: patientAccess({ trialEndsAt, subStatus, subCurrentPeriodEnd }),
      trialEndsAt,
    };
  }
  return { role: "unknown" };
}
