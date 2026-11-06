import { createClient } from "@/lib/supabase/server";
import { isMissingStripeObject, refreshConnectStatus } from "@/lib/billing/connectStatus";
import { upsertConnectAccount } from "@/lib/db/admin";
import { KINE_FOLLOW_UP_CENTS, isLegacySubscription, isPlatformOfferKey, isPlatformSubscription, platformOffer, type SubscriptionRow } from "@/lib/billing/patientPlans";
import FacturationView, { type ConnectStatus, type SubscriberRow } from "./FacturationView";
import { requireApprovedInstructor } from "@/lib/dashboard/requireApprovedInstructor";

// « Suivi & facturation » du kiné (modèle définitif du 2026-11-04,
// lib/billing/patientPlans.ts) : ses patients abonnés, ce qu'il touche
// (6,00 € par patient, les mois où il met à jour le programme) et
// l'activation de ses paiements.
// L'affichage vit dans FacturationView.tsx.
export default async function FacturationPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  // Validation du compte vérifiée ICI aussi (audit du 2026-10-08) : le
  // layout ne se ré-exécute pas à chaque navigation (doc Next.js 16).
  const { user } = await requireApprovedInstructor(supabase);

  const [{ data: connect }, { data: patients }] = await Promise.all([
    supabase.from("instructor_connect_accounts").select("status, stripe_connect_account_id").eq("instructor_id", user.id).maybeSingle(),
    supabase.from("patients").select("id, full_name").eq("instructor_id", user.id),
  ]);
  const ids = (patients ?? []).map((p) => p.id as string);
  // Abonnements de SES patients seulement (règle subscriptions_instructor_read).
  const { data: subs } = ids.length
    ? await supabase.from("subscriptions").select("user_id, plan, status, current_period_end, cancel_at_period_end, stripe_account_id").in("user_id", ids)
    : { data: [] };

  const nameOf = new Map((patients ?? []).map((p) => [p.id as string, (p.full_name as string | null) ?? "Patient"]));
  const now = new Date();
  let monthlyCents = 0;
  const subscribers: SubscriberRow[] = [];
  for (const s of subs ?? []) {
    const legacy = isLegacySubscription(s as unknown as SubscriptionRow);
    if (!legacy && !isPlatformSubscription(s as unknown as SubscriptionRow)) continue;
    const live = (s.status === "active" || s.status === "trialing") && (!s.current_period_end || new Date(s.current_period_end as string) > now);
    const refused = ["past_due", "unpaid", "incomplete"].includes(s.status as string);
    if (!live && !refused) continue;
    // Ses honoraires : 6 € par patient abonné (hors essai), les mois où il met à jour le programme.
    if (live && !legacy && s.status === "active" && !s.cancel_at_period_end) monthlyCents += KINE_FOLLOW_UP_CENTS;
    subscribers.push({
      patientId: s.user_id as string,
      name: nameOf.get(s.user_id as string) ?? "Patient",
      planLabel: legacy
        ? "Ancienne formule"
        : s.status === "trialing"
          ? "Essai gratuit"
          : isPlatformOfferKey(s.plan)
            ? platformOffer(s.plan).label
            : "Suivi mensuel",
      status: refused ? "refused" : s.cancel_at_period_end ? "cancelled" : "active",
      periodEnd: (s.current_period_end as string | null) ?? null,
    });
  }
  subscribers.sort((a, b) => a.name.localeCompare(b.name, "fr"));

  let connectStatus = ((connect?.status as string | null) ?? "not_started") as ConnectStatus;
  // Le statut stocké peut être en retard sur Stripe (webhook manqué), ou
  // viser un compte de test qui n'existe pas en mode réel : on le relit.
  const accountId = (connect?.stripe_connect_account_id as string | null) ?? null;
  if (accountId) {
    try {
      connectStatus = await refreshConnectStatus(user.id, accountId);
    } catch (err) {
      if (isMissingStripeObject(err)) {
        connectStatus = "not_started";
        try {
          await upsertConnectAccount({ instructorId: user.id, stripeConnectAccountId: accountId, status: "not_started" });
        } catch (dbErr) {
          console.error("[facturation] statut Stripe non remis à zéro :", dbErr);
        }
      } else {
        console.error("[facturation] resynchronisation du compte Stripe impossible :", err);
      }
    }
  }

  return (
    <FacturationView
      connectStatus={connectStatus}
      subscribers={subscribers}
      monthlyCents={monthlyCents}
      patientCount={ids.length}
      error={error}
    />
  );
}
