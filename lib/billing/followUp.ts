// =============================================================================
// Suivi mensuel payé au kiné (nouveau modèle, 2026-10-24) — côté serveur.
//
// 1. Le patient accepte le tarif de son kiné et enregistre sa carte : Stripe
//    Checkout en mode « setup » (aucun prélèvement), créé SUR le compte
//    Connect du kiné (Direct charge, comme avant) — la carte vit chez le kiné.
// 2. Quand le bilan du mois se valide (lib/billing/autoReview.ts), le serveur prélève la carte
//    (PaymentIntent hors session) sur le compte du kiné, SANS frais de
//    plateforme : 100 % des honoraires au kiné, rien pour EasyPhysio
//    (art. R.4321-72 CSP — c'est ce qui sépare les deux flux d'argent).
//
// Signatures HMAC (clé = STRIPE_SECRET_KEY, que le kiné ne connaît pas) :
// les comptes des kinés sont « Standard », un kiné pourrait créer à la main
// une session ou un paiement portant de fausses metadata. Le webhook n'accepte
// que ce qu'EasyPhysio a signé (même principe que subscriptionSignature.ts).
// =============================================================================
import { createHmac, timingSafeEqual } from "node:crypto";
import type Stripe from "stripe";
import { getStripe } from "./stripe";
import { upsertFollowUp, setReviewPayment, reviewForPayment } from "@/lib/db/admin";

function hmac(payload: string): string {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set.");
  return createHmac("sha256", key).update(payload).digest("hex");
}

function sameHex(given: string | undefined, expected: string): boolean {
  if (!given || !/^[0-9a-f]+$/i.test(given)) return false;
  const a = Buffer.from(given, "hex");
  const b = Buffer.from(expected, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

// ---- 1. Enregistrement de la carte --------------------------------------------

export function followUpSetupMetadata(p: { patientId: string; instructorId: string; priceCents: number; accountId: string }) {
  const payload = `follow_up:${p.patientId}:${p.instructorId}:${p.priceCents}:${p.accountId}`;
  return {
    kind: "follow_up",
    patient_id: p.patientId,
    instructor_id: p.instructorId,
    price_cents: String(p.priceCents),
    follow_up_sig: hmac(payload),
  };
}

function verifiedFollowUp(metadata: Stripe.Metadata | null | undefined, accountId: string) {
  if (metadata?.kind !== "follow_up") return null;
  const patientId = metadata.patient_id;
  const instructorId = metadata.instructor_id;
  const priceCents = Number(metadata.price_cents);
  if (!patientId || !instructorId || !Number.isInteger(priceCents)) return null;
  const expected = hmac(`follow_up:${patientId}:${instructorId}:${priceCents}:${accountId}`);
  return sameHex(metadata.follow_up_sig, expected) ? { patientId, instructorId, priceCents } : null;
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

// ---- 2. Prélèvement d'un bilan validé ------------------------------------------

function reviewSig(reviewId: string, accountId: string): string {
  return hmac(`review:${reviewId}:${accountId}`);
}

/**
 * Prélève un bilan validé sur la carte enregistrée du patient, sur le compte
 * Stripe du kiné, sans frais de plateforme. Ne lève pas d'erreur : renvoie
 * l'état obtenu (et l'enregistre). La clé d'idempotence garantit qu'un double
 * clic ne prélève jamais deux fois le même bilan.
 */
export async function chargeReview(p: {
  reviewId: string;
  amountCents: number;
  accountId: string;
  customerId: string;
  paymentMethodId: string;
  description: string;
}): Promise<"paid" | "pending" | "failed"> {
  const stripe = getStripe();
  let status: "paid" | "pending" | "failed" = "failed";
  let intentId: string | null = null;
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
        metadata: { kind: "review", review_id: p.reviewId, review_sig: reviewSig(p.reviewId, p.accountId) },
      },
      { stripeAccount: p.accountId, idempotencyKey: `review-charge-${p.reviewId}` },
    );
    intentId = intent.id;
    status = intent.status === "succeeded" ? "paid" : intent.status === "processing" ? "pending" : "failed";
  } catch (e) {
    // Carte refusée, authentification demandée par la banque, etc. Le paiement
    // échoué existe quand même chez Stripe (e.payment_intent) : on garde son id.
    const err = e as { payment_intent?: { id?: string } };
    intentId = err.payment_intent?.id ?? null;
    console.error("[followUp] prélèvement du bilan refusé", p.reviewId, e);
  }
  await setReviewPayment(p.reviewId, status, intentId);
  return status;
}

/**
 * Webhook `payment_intent.succeeded` / `payment_intent.payment_failed` d'un
 * compte Connect : met à jour le bilan correspondant, seulement si le paiement
 * a été signé par EasyPhysio pour CE compte.
 */
export async function syncReviewPaymentFromIntent(intent: Stripe.PaymentIntent, accountId: string): Promise<void> {
  const reviewId = intent.metadata?.review_id;
  if (intent.metadata?.kind !== "review" || !reviewId) return;
  if (!sameHex(intent.metadata.review_sig, reviewSig(reviewId, accountId))) return;
  const review = await reviewForPayment(reviewId);
  if (!review || review.connect_account_id !== accountId) return;
  const status = intent.status === "succeeded" ? "paid" : intent.status === "processing" ? "pending" : "failed";
  await setReviewPayment(reviewId, status, intent.id);
}

/** Webhook `checkout.session.completed` en mode setup sur un compte Connect. */
export async function handleFollowUpSetupEvent(session: Stripe.Checkout.Session, accountId: string): Promise<void> {
  if (session.mode !== "setup" || session.metadata?.kind !== "follow_up") return;
  await finalizeFollowUpSetup(session.id, accountId);
}
