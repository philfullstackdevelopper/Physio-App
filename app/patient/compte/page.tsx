import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { effectiveReviewPrice } from "@/lib/billing/reviewModel";
import CompteView, { type FollowUpSummary } from "./CompteView";

// « Paramètres » du patient. Nouveau modèle (2026-10-24) : plus d'abonnement
// patient (l'appli est offerte par le kiné) ; la carte « Suivi mensuel »
// résume le suivi payé au kiné et mène à /patient/suivi. Le reste (compte,
// export des données, suppression — droits RGPD) ne change pas.
export default async function CompteePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const [{ data: patient }, { data: followUp }] = await Promise.all([
    supabase.from("patients").select("full_name, instructors ( full_name, review_price_cents )").eq("id", user.id).maybeSingle(),
    supabase.from("patient_follow_ups").select("status, price_cents, card_label").eq("patient_id", user.id).maybeSingle(),
  ]);
  const kine = patient?.instructors as unknown as { full_name: string | null; review_price_cents: number | null } | null;

  const summary: FollowUpSummary = {
    status: (followUp?.status as FollowUpSummary["status"] | undefined) ?? "none",
    priceCents: (followUp?.price_cents as number | undefined) ?? effectiveReviewPrice(kine?.review_price_cents ?? null),
    cardLabel: (followUp?.card_label as string | null | undefined) ?? null,
    kineName: kine?.full_name ?? null,
  };

  return <CompteView fullName={(patient?.full_name as string | null) ?? null} error={error} followUp={summary} />;
}
