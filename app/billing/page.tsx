import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { getInstructor } from "@/lib/dashboard/instructor";

// The old patient → EasyPhysio €10/month subscription page. Retired on
// 2026-09-10: patients now pick one of their kiné's three offers on
// /patient/abonnement and manage it from /patient/compte; kinés manage their
// money on /dashboard/facturation. Kept only so old links land somewhere real.
export default async function BillingPage() {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const instructor = await getInstructor(supabase, user.id);
  redirect(instructor ? "/dashboard/facturation" : "/patient/compte");
}
