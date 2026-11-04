import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { patientMustSubscribe, subscriptionNeedsRefresh, type SubscriptionRow } from "@/lib/billing/patientPlans";
import { refreshPatientSubscription } from "@/lib/billing/patientSubscription";
import SuiviView from "./SuiviView";

// « Mon suivi » côté patient : choisir, voir ou résilier sa formule
// (modèle définitif du 2026-11-04 : 3,99 € d'accès + 6 € du kiné). C'est aussi l'écran où
// app/patient/layout.tsx envoie un patient qui n'a pas encore accès.
export default async function SuiviPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string; attente?: string; arret?: string; reprise?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const { data: patient } = await supabase.from("patients").select("instructor_id, trial_ends_at").eq("id", user.id).maybeSingle();
  const instructorId = (patient?.instructor_id as string | null) ?? null;
  const loadSub = () =>
    supabase
      .from("subscriptions")
      .select("plan, status, current_period_end, cancel_at_period_end, stripe_subscription_id, stripe_account_id")
      .eq("user_id", user.id)
      .maybeSingle();
  const [{ data: kine }, { data: connect }, subRes] = await Promise.all([
    instructorId
      ? supabase.from("instructors").select("full_name, status").eq("id", instructorId).maybeSingle()
      : Promise.resolve({ data: null }),
    instructorId
      ? supabase.from("instructor_connect_accounts").select("status").eq("instructor_id", instructorId).maybeSingle()
      : Promise.resolve({ data: null }),
    loadSub(),
  ]);
  let sub = subRes.data;
  // Période payée dépassée sans nouvelles de Stripe : on relit l'abonnement.
  if (sub && subscriptionNeedsRefresh(sub as unknown as SubscriptionRow) && sub.stripe_subscription_id) {
    await refreshPatientSubscription(sub.stripe_subscription_id as string, (sub.stripe_account_id as string | null) ?? null);
    sub = (await loadSub()).data;
  }

  const kineReady = ((kine?.status as string | null) ?? "approved") === "approved" && connect?.status === "active";
  const required = patientMustSubscribe({
    kineCanCharge: connect?.status === "active",
    kineSuspended: (kine?.status as string | null) === "suspended",
    freeAccessUntil: (patient?.trial_ends_at as string | null) ?? null,
    subscription: (sub as unknown as SubscriptionRow | null) ?? null,
  });

  return (
    <SuiviView
      sp={sp}
      kineName={(kine?.full_name as string | null) ?? "votre kiné"}
      kineReady={kineReady}
      required={required}
      subscription={
        sub
          ? {
              plan: sub.plan as string,
              status: sub.status as string,
              periodEnd: (sub.current_period_end as string | null) ?? null,
              cancelAtPeriodEnd: !!sub.cancel_at_period_end,
            }
          : null
      }
    />
  );
}
