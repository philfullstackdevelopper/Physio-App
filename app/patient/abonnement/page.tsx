import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { TRIAL_DAYS, resolveTierPrices, type InstructorTierPriceRow } from "@/lib/billing/plans";
import { lockReason } from "@/lib/billing/access";
import PatientLockScreen from "@/components/PatientLockScreen";
import { hasPatientAppAccess } from "@/lib/billing/context";
import { openBillingPortal } from "@/app/billing/actions";
import { startTierCheckout } from "./actions";
import AbonnementView from "./AbonnementView";

// Hors du composant : la règle react-hooks/purity refuse Date.now() dans le
// corps d'un composant, même serveur. « 17 septembre », pas de millisecondes.
const firstChargeDateLabel = () =>
  new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" }).format(
    new Date(Date.now() + TRIAL_DAYS * 86_400_000),
  );

// Étape entre l'onboarding et l'app (Philippe, 2026-09-10) : le patient
// choisit l'une des trois offres de son kiné, avec 7 jours gratuits avant le
// premier prélèvement. Gabarit Road to Offer : trois cartes, celle du milieu
// surélevée et remplie de la couleur de marque avec un ruban, prix en gros,
// bouton pleine largeur, réassurance sous le bouton, liste à coches.
// Rendu plein écran sans la nav de l'app (app/patient/layout.tsx), comme
// l'onboarding : tant qu'il n'y a pas d'offre, il n'y a pas d'app à naviguer.
export default async function AbonnementPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; checkout?: string; offres?: string }>;
}) {
  const { error, checkout, offres } = await searchParams;
  const supabase = await createClient();
  const user = await requireUser(supabase);

  // Déjà une offre active (ou un accès historique) : rien à choisir ici.
  // hasPatientAppAccess : couvre aussi le patient d'un kiné suspendu (accès gratuit).
  if (await hasPatientAppAccess(supabase, user.id)) redirect("/patient");

  const [{ data: patient }, { data: sub }] = await Promise.all([
    supabase.from("patients").select("instructor_id, full_name").eq("id", user.id).maybeSingle(),
    supabase
      .from("subscriptions")
      .select("stripe_customer_id, stripe_subscription_id, status, current_period_end")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);
  const instructorId = (patient?.instructor_id as string | null) ?? null;

  // (Philippe, 2026-10-07) Paiement en échec (past_due/unpaid) : l'abonnement
  // existe toujours chez Stripe — on propose de corriger la carte (portail
  // Stripe), pas d'en souscrire un deuxième (startTierCheckout refuse aussi).
  const paymentFailed =
    (sub?.status === "past_due" || sub?.status === "unpaid") && !!(sub?.stripe_customer_id as string | null);
  // Même règle que startTierCheckout : l'essai gratuit n'est offert qu'une fois.
  const trialAvailable = !(sub?.stripe_subscription_id as string | null) && !(sub?.stripe_customer_id as string | null);

  const [{ data: kine }, { data: connect }] = await Promise.all([
    instructorId
      ? supabase
          .from("instructors")
          .select("full_name, tier_essentiel_cents, tier_standard_cents, tier_premium_cents")
          .eq("id", instructorId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    // Un patient peut lire le compte Connect de SON PROPRE kiné (voir
    // connect_accounts_patient_read, migration 0057).
    instructorId
      ? supabase.from("instructor_connect_accounts").select("status").eq("instructor_id", instructorId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const prices = resolveTierPrices(kine as InstructorTierPriceRow | null);
  const kineName = (kine?.full_name as string | null) ?? null;
  const paymentsReady = connect?.status === "active";
  const firstChargeDate = firstChargeDateLabel();

  // Écran cadenas (Philippe, 2026-10-10) : un patient qui AVAIT un abonnement
  // et n'a plus accès (carte refusée, abonnement terminé) arrive d'abord sur
  // le cadenas ; son bouton mène ici avec ?offres=1. Un nouveau patient, qui
  // n'a jamais eu d'abonnement, voit directement les offres. Un retour de
  // paiement (?checkout) ou un message d'erreur passent aussi directement.
  const reason = lockReason(sub?.status as string | null, sub?.current_period_end as string | null);
  if (reason && offres !== "1" && !error && !checkout) {
    const fullName = (patient?.full_name as string | null) ?? null;
    return <PatientLockScreen reason={reason} firstName={fullName ? fullName.split(" ")[0] : null} kineName={kineName} />;
  }

  return (
    <AbonnementView
      error={error}
      checkout={checkout}
      paymentFailed={paymentFailed}
      trialAvailable={trialAvailable}
      prices={prices}
      kineName={kineName}
      paymentsReady={paymentsReady}
      firstChargeDate={firstChargeDate}
      startTierCheckout={startTierCheckout}
      openBillingPortal={openBillingPortal}
    />
  );
}
