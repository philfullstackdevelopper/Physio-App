// =============================================================================
// Programme mensuel payé au kiné — côté serveur.
//
// 1. Le patient accepte le tarif de son kiné et enregistre sa carte : Stripe
//    Checkout en mode « setup » (aucun prélèvement), créé SUR le compte
//    Connect du kiné (Direct charge, comme avant) — la carte vit chez le kiné.
// 2. Le premier ajustement du programme dans le mois (lib/billing/autoReview.ts)
//    déclenche le prélèvement de la carte (PaymentIntent hors session) sur le
//    compte du kiné, SANS frais de plateforme : 100 % des honoraires au kiné.
// 3. (Audit du 2026-11-08) Si la banque exige que le patient confirme
//    lui-même (3-D Secure) ou si la carte est refusée, le mois passe à
//    « validation demandée » / « refusé » et le patient voit un bouton
//    « Payer » : Checkout en mode paiement, sur le compte du kiné, pour CE
//    mois-là (même note d'honoraires, même montant). Le webhook le marque payé.
// 4. Remboursements et litiges (webhook Connect) : le mois passe à
//    « remboursé » / « contesté », visible sur les notes et le récapitulatif.
//
// Signatures HMAC (clé STRIPE_SIGNING_SECRET, lib/billing/signing.ts, que le
// kiné ne connaît pas) : les comptes des kinés sont « Standard », un kiné
// pourrait créer à la main une session ou un paiement portant de fausses
// metadata. Le webhook n'accepte que ce qu'EasyPhysio a signé.
// =============================================================================
import type Stripe from "stripe";
import { getStripe } from "./stripe";
import { sign, verify } from "./signing";
import { upsertFollowUp, setReviewPayment, reviewForPayment } from "@/lib/db/admin";
import { reviewFailureReason, reviewStatusFromDispute, reviewStatusFromIntent, type ReviewPaymentStatus } from "./reviewPayment";

// ---- 1. Enregistrement de la carte --------------------------------------------

const followUpPayload = (patientId: string, instructorId: string, priceCents: number, accountId: string) =>
  `follow_up:${patientId}:${instructorId}:${priceCents}:${accountId}`;

export function followUpSetupMetadata(p: { patientId: string; instructorId: string; priceCents: number; accountId: string }) {
  return {
    kind: "follow_up",
    patient_id: p.patientId,
    instructor_id: p.instructorId,
    price_cents: String(p.priceCents),
    follow_up_sig: sign(followUpPayload(p.patientId, p.instructorId, p.priceCents, p.accountId)),
  };
}

function verifiedFollowUp(metadata: Stripe.Metadata | null | undefined, accountId: string) {
  if (metadata?.kind !== "follow_up") return null;
  const patientId = metadata.patient_id;
  const instructorId = metadata.instructor_id;
  const priceCents = Number(metadata.price_cents);
  if (!patientId || !instructorId || !Number.isInteger(priceCents)) return null;
  return verify(followUpPayload(patientId, instructorId, priceCents, accountId), metadata.follow_up_sig)
    ? { patientId, instructorId, priceCents }
    : null;
}

function cardLabel(pm: Stripe.PaymentMethod | null): string | null {
  if (!pm) return null;
  if (pm.card) return `${pm.card.brand.toUpperCase()} •••• ${pm.card.last4}`;
  if (pm.sepa_debit) return `Prélèvement SEPA •••• ${pm.sepa_debit.last4}`;
  return pm.type;
}

/**
 * Après un Checkout « setup » réussi (retour du patient ou webhook) : relit la
 * session chez Stripe, vérifie la signature, et active le suivi. Rejouable.
 * Renvoie l'id du patient activé, ou null si la session n'est pas la nôtre.
 */
export async function finalizeFollowUpSetup(sessionId: string, accountId: string): Promise<string | null> {
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(
    sessionId,
    { expand: ["setup_intent", "setup_intent.payment_method"] },
    { stripeAccount: accountId },
  );
  if (session.mode !== "setup" || session.status !== "complete") return null;
  const meta = verifiedFollowUp(session.metadata, accountId);
  if (!meta) return null;
  const setupIntent = session.setup_intent as Stripe.SetupIntent | null;
  if (!setupIntent || setupIntent.status !== "succeeded") return null;
  const pm = (setupIntent.payment_method as Stripe.PaymentMethod | null) ?? null;
  const customerId = typeof session.customer === "string" ? session.customer : (session.customer?.id ?? null);
  if (!pm || !customerId) return null;

  await upsertFollowUp({
    patientId: meta.patientId,
    instructorId: meta.instructorId,
    priceCents: meta.priceCents,
    status: "active",
    stripeCustomerId: customerId,
    stripePaymentMethodId: pm.id,
    cardLabel: cardLabel(pm),
  });
  return meta.patientId;
}

// ---- 2. Prélèvement d'un mois facturé ------------------------------------------

const reviewPayload = (reviewId: string, accountId: string) => `review:${reviewId}:${accountId}`;

/** Metadata signées d'un paiement d'honoraires (prélèvement automatique ou paiement par le patient). */
function reviewMetadata(reviewId: string, accountId: string): Record<string, string> {
  return { kind: "review", review_id: reviewId, review_sig: sign(reviewPayload(reviewId, accountId)) };
}

/**
 * Prélève un mois facturé sur la carte enregistrée du patient, sur le compte
 * Stripe du kiné, sans frais de plateforme. Ne lève pas d'erreur : renvoie
 * l'état obtenu (et l'enregistre). La clé d'idempotence garantit qu'un double
 * clic ne prélève jamais deux fois le même mois.
 */
export async function chargeReview(p: {
  reviewId: string;
  amountCents: number;
  accountId: string;
  customerId: string;
  paymentMethodId: string;
  description: string;
  /** E-mail du patient : Stripe lui envoie le reçu du paiement. */
  receiptEmail?: string | null;
}): Promise<ReviewPaymentStatus> {
  const stripe = getStripe();
  let status: ReviewPaymentStatus = "failed";
  let intentId: string | null = null;
  let reason: string | null = null;
  try {
    const intent = await stripe.paymentIntents.create(
      {
        amount: p.amountCents,
        currency: "eur",
        customer: p.customerId,
        payment_method: p.paymentMethodId,
        off_session: true,
        confirm: true,
        description: p.description,
        ...(p.receiptEmail ? { receipt_email: p.receiptEmail } : {}),
        metadata: reviewMetadata(p.reviewId, p.accountId),
      },
      { stripeAccount: p.accountId, idempotencyKey: `review-charge-${p.reviewId}` },
    );
    intentId = intent.id;
    status = reviewStatusFromIntent(intent);
    reason = reviewFailureReason(intent.last_payment_error);
  } catch (e) {
    // Carte refusée, authentification demandée par la banque, etc. Le paiement
    // échoué existe quand même chez Stripe (e.payment_intent) : on garde son id.
    const err = e as {
      code?: string;
      decline_code?: string;
      payment_intent?: { id?: string; status?: string; last_payment_error?: { code?: string | null; decline_code?: string | null } | null };
    };
    intentId = err.payment_intent?.id ?? null;
    status = reviewStatusFromIntent({
      status: err.payment_intent?.status ?? "requires_payment_method",
      last_payment_error: err.payment_intent?.last_payment_error ?? { code: err.code, decline_code: err.decline_code },
    });
    reason = reviewFailureReason({ code: err.code, decline_code: err.decline_code });
    console.error("[followUp] prélèvement des honoraires refusé", p.reviewId, reason, e);
  }
  await setReviewPayment(p.reviewId, status, intentId, reason);
  return status;
}

/** Le paiement porte-t-il des metadata signées par EasyPhysio pour CE compte ? Renvoie l'id du mois. */
async function verifiedReviewId(intent: Pick<Stripe.PaymentIntent, "metadata">, accountId: string): Promise<string | null> {
  const reviewId = intent.metadata?.review_id;
  if (intent.metadata?.kind !== "review" || !reviewId) return null;
  if (!verify(reviewPayload(reviewId, accountId), intent.metadata.review_sig)) return null;
  const review = await reviewForPayment(reviewId);
  if (!review || review.connect_account_id !== accountId) return null;
  return reviewId;
}

/**
 * Webhook `payment_intent.*` d'un compte Connect : met à jour le mois
 * correspondant, seulement si le paiement a été signé par EasyPhysio pour CE
 * compte. La base refuse les retours en arrière (migration 0086).
 */
export async function syncReviewPaymentFromIntent(intent: Stripe.PaymentIntent, accountId: string): Promise<void> {
  const reviewId = await verifiedReviewId(intent, accountId);
  if (!reviewId) return;
  await setReviewPayment(reviewId, reviewStatusFromIntent(intent), intent.id, reviewFailureReason(intent.last_payment_error));
}

/** Webhook `checkout.session.completed` en mode setup sur un compte Connect. */
export async function handleFollowUpSetupEvent(session: Stripe.Checkout.Session, accountId: string): Promise<void> {
  if (session.mode !== "setup" || session.metadata?.kind !== "follow_up") return;
  await finalizeFollowUpSetup(session.id, accountId);
}

// ---- 3. Paiement par le patient après un refus / une validation demandée -------

/**
 * Page de paiement Stripe (Checkout, mode paiement, CARTE seulement) sur le
 * compte du kiné, pour un mois précis. Le paiement porte les mêmes metadata
 * signées qu'un prélèvement automatique : le webhook `payment_intent.succeeded`
 * marque le mois payé. Renvoie l'adresse de la page.
 */
export async function createReviewPaymentCheckout(p: {
  reviewId: string;
  amountCents: number;
  accountId: string;
  customerId: string | null;
  productName: string;
  description: string;
  receiptEmail: string | null;
  locale: "fr" | "en";
  successUrl: string;
  cancelUrl: string;
}): Promise<string | null> {
  const session = await getStripe().checkout.sessions.create(
    {
      mode: "payment",
      payment_method_types: ["card"],
      ...(p.customerId ? { customer: p.customerId } : p.receiptEmail ? { customer_email: p.receiptEmail } : {}),
      line_items: [
        {
          quantity: 1,
          price_data: { currency: "eur", unit_amount: p.amountCents, product_data: { name: p.productName } },
        },
      ],
      payment_intent_data: {
        description: p.description,
        metadata: reviewMetadata(p.reviewId, p.accountId),
        ...(p.receiptEmail ? { receipt_email: p.receiptEmail } : {}),
      },
      metadata: { kind: "review_payment", review_id: p.reviewId },
      locale: p.locale,
      // Page valable 30 minutes (minimum Stripe) : limite le risque de deux
      // pages ouvertes en même temps pour le même mois.
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
      success_url: p.successUrl,
      cancel_url: p.cancelUrl,
    },
    { stripeAccount: p.accountId },
  );
  return session.url;
}

// ---- 4. Remboursements et litiges (webhook Connect) ----------------------------

async function intentOf(paymentIntent: string | Stripe.PaymentIntent | null | undefined, accountId: string): Promise<Stripe.PaymentIntent | null> {
  if (!paymentIntent) return null;
  if (typeof paymentIntent !== "string") return paymentIntent;
  try {
    return await getStripe().paymentIntents.retrieve(paymentIntent, undefined, { stripeAccount: accountId });
  } catch (e) {
    console.error("[followUp] paiement introuvable chez Stripe", paymentIntent, e);
    return null;
  }
}

/** `charge.refunded` : remboursement TOTAL → « remboursé » (un remboursement partiel ne change pas l'état). */
export async function syncReviewRefund(charge: Stripe.Charge, accountId: string): Promise<void> {
  if (!charge.refunded && charge.amount_refunded < charge.amount) {
    console.warn(`[followUp] remboursement partiel ${charge.id} (${charge.amount_refunded}/${charge.amount}) : état inchangé.`);
    return;
  }
  const intent = await intentOf(charge.payment_intent, accountId);
  if (!intent) return;
  const reviewId = await verifiedReviewId(intent, accountId);
  if (reviewId) await setReviewPayment(reviewId, "refunded", intent.id, null);
}

/** `charge.dispute.created` / `charge.dispute.closed` : contesté, ou de nouveau payé si le kiné gagne. */
export async function syncReviewDispute(dispute: Stripe.Dispute, accountId: string): Promise<void> {
  const intent = await intentOf(dispute.payment_intent, accountId);
  if (!intent) return;
  const reviewId = await verifiedReviewId(intent, accountId);
  if (reviewId) await setReviewPayment(reviewId, reviewStatusFromDispute(dispute.status), intent.id, null);
}
