import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { effectiveReviewPrice } from "@/lib/billing/reviewModel";
import SuiviView, { type SuiviViewProps } from "./SuiviView";

// « Suivi mensuel » côté patient (nouveau modèle, 2026-10-24). Le patient y
// accepte le tarif de son kiné (information préalable, art. R.4321-98 CSP),
// enregistre sa carte, l'arrête quand il veut, et retrouve ses bilans et
// notes d'honoraires. L'appli elle-même reste ouverte sans ce suivi.
export default async function SuiviPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string; attente?: string; arret?: string; checkout?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const { data: patient } = await supabase.from("patients").select("instructor_id").eq("id", user.id).maybeSingle();
  const instructorId = (patient?.instructor_id as string | null) ?? null;
  const [{ data: kine }, { data: connect }, { data: followUp }, { data: reviews }] = await Promise.all([
    instructorId
      ? supabase.from("instructors").select("full_name, status, review_price_cents").eq("id", instructorId).maybeSingle()
      : Promise.resolve({ data: null }),
    instructorId
      ? supabase.from("instructor_connect_accounts").select("status").eq("instructor_id", instructorId).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("patient_follow_ups").select("status, price_cents, card_label").eq("patient_id", user.id).maybeSingle(),
    supabase
      .from("monthly_reviews")
      .select("id, period, amount_cents, payment_status, fee_note_year, fee_note_seq")
      .eq("patient_id", user.id)
      .order("period", { ascending: false })
      .limit(24),
  ]);

  const kineName = (kine?.full_name as string | null) ?? "votre kiné";
  const kineReady = ((kine?.status as string | null) ?? "approved") === "approved" && connect?.status === "active";
  const status = (followUp?.status as "pending_card" | "active" | "stopped" | undefined) ?? "none";
  const currentPrice = effectiveReviewPrice((kine?.review_price_cents as number | null) ?? null);
  const acceptedPrice = (followUp?.price_cents as number | undefined) ?? currentPrice;
  const price = status === "active" ? acceptedPrice : currentPrice;

  return (
    <SuiviView
      sp={sp}
      kineName={kineName}
      kineReady={kineReady}
      status={status}
      currentPrice={currentPrice}
      acceptedPrice={acceptedPrice}
      price={price}
      cardLabel={(followUp?.card_label as string | null) ?? null}
      reviews={(reviews ?? []) as SuiviViewProps["reviews"]}
    />
  );
}
