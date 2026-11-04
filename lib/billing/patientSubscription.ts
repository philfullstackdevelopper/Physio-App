// =============================================================================
// Formules patient — côté serveur (Philippe, 2026-11-02).
// Recopie un abonnement Stripe (vivant sur le compte Connect du kiné) dans la
// table `subscriptions`, après avoir vérifié qu'il a bien été créé par
// EasyPhysio (signature) avec la bonne part EasyPhysio. Utilisé par le
// webhook Stripe, le retour de paiement et la relecture quand la période
// payée est dépassée (pour ne pas dépendre des seuls webhooks).
// =============================================================================
import "server-only";
import type Stripe from "stripe";
import { getStripe } from "./stripe";
import { upsertSubscription } from "@/lib/db/admin";
import { hasValidSubscriptionSignature } from "./subscriptionSignature";
import { applicationFeePercent, isPatientPlanKey, patientPlan } from "./patientPlans";

/** Fin de période : sur l'abonnement ou, depuis les versions récentes de l'API, sur l'article. */
function periodEndISO(sub: Stripe.Subscription): string | null {
  const top = (sub as unknown as { current_period_end?: number }).current_period_end;
  const item = (sub.items?.data?.[0] as unknown as { current_period_end?: number } | undefined)?.current_period_end;
  const unix = top ?? item ?? null;
  return unix ? new Date(unix * 1000).toISOString() : null;
}

/** Enregistre l'abonnement s'il est authentique ; renvoie l'id du patient, ou null s'il est ignoré. */
export async function syncPatientSubscription(sub: Stripe.Subscription, accountId: string): Promise<string | null> {
  if (!hasValidSubscriptionSignature(sub.metadata, accountId)) {
    console.warn(`[abonnement] ${sub.id} ignoré : pas créé par EasyPhysio.`);
    return null;
  }
  const userId = sub.metadata.user_id;
  const plan = sub.metadata.plan;
  if (!isPatientPlanKey(plan)) return null;

  // Part EasyPhysio attendue : un abonnement modifié à la main pour la retirer
  // n'ouvre pas l'accès.
  const fee = (sub as unknown as { application_fee_percent?: number | null }).application_fee_percent ?? null;
  const feeOk = fee != null && Math.abs(fee - applicationFeePercent(patientPlan(plan))) < 0.005;
  const status = feeOk || sub.status === "canceled" ? sub.status : "incomplete";
  if (!feeOk) console.warn(`[abonnement] ${sub.id} : part EasyPhysio ${fee ?? "absente"} au lieu de ${applicationFeePercent(patientPlan(plan))} %.`);

  await upsertSubscription({
    userId,
    plan,
    stripeCustomerId: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
    stripeSubscriptionId: sub.id,
    status,
    currentPeriodEnd: periodEndISO(sub),
    stripeAccountId: accountId,
    cancelAtPeriodEnd: !!sub.cancel_at_period_end,
  });
  return userId;
}

/** Relit un abonnement chez Stripe et le recopie (période dépassée, retour de paiement…). */
export async function refreshPatientSubscription(stripeSubscriptionId: string, accountId: string): Promise<void> {
  try {
    const sub = await getStripe().subscriptions.retrieve(stripeSubscriptionId, undefined, { stripeAccount: accountId });
    await syncPatientSubscription(sub, accountId);
  } catch (e) {
    console.error("[abonnement] relecture impossible :", e);
  }
}
