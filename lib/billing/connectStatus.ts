// Statut local d'un compte Stripe Connect de kiné, à partir de ce que Stripe
// en dit (Philippe, 2026-10-07 : avant, le statut n'était écrit qu'au retour
// de l'onboarding — app/dashboard/connect/return/route.ts — et restait figé
// ensuite). Une seule règle, partagée par ce retour, la page Facturation et
// le webhook `account.updated`.
//
// Server-only (clé secrète Stripe, connexion Postgres directe).
import { createHmac, timingSafeEqual } from "node:crypto";
import type Stripe from "stripe";
import { upsertConnectAccount } from "@/lib/db/admin";
import { getStripe } from "./stripe";

export type ConnectStatus = "active" | "onboarding";

/** "active" = Stripe a validé le compte ET le kiné peut encaisser. */
export function connectStatusFromAccount(
  account: Pick<Stripe.Account, "details_submitted" | "charges_enabled">,
): ConnectStatus {
  return account.details_submitted && account.charges_enabled ? "active" : "onboarding";
}

// ---- Rattachement compte Stripe → kiné, pour le webhook ----------------------
// Le webhook n'a aucune session et ne peut pas lire instructor_connect_accounts
// (FORCE ROW LEVEL SECURITY sur Scalingo, aucune fonction `internal` de
// lecture). On range donc l'id du kiné dans les metadata du compte Stripe —
// SIGNÉ (HMAC, clé = STRIPE_SECRET_KEY, jamais connue du kiné) : sans
// signature, un kiné qui modifierait ces metadata pourrait faire pointer la
// fiche d'un AUTRE kiné vers son propre compte et détourner les paiements de
// ses patients (CLAUDE.md §3, la raison même de cette table à part).

function signature(instructorId: string, accountId: string): string {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set.");
  return createHmac("sha256", key).update(`connect:${instructorId}:${accountId}`).digest("hex");
}

/** Metadata à poser sur le compte Connect d'un kiné. */
export function connectAccountMetadata(instructorId: string, accountId: string): Record<string, string> {
  return { instructor_id: instructorId, instructor_sig: signature(instructorId, accountId) };
}

/** L'id du kiné rattaché à ce compte, seulement si la signature est valide. */
export function verifiedInstructorId(account: Pick<Stripe.Account, "id" | "metadata">): string | null {
  const instructorId = account.metadata?.instructor_id;
  const sig = account.metadata?.instructor_sig;
  if (!instructorId || !sig) return null;
  const expected = Buffer.from(signature(instructorId, account.id), "hex");
  const given = Buffer.from(sig, "hex");
  return given.length === expected.length && timingSafeEqual(given, expected) ? instructorId : null;
}

/**
 * Relit le compte chez Stripe, enregistre son statut, et (re)pose les
 * metadata signées si besoin (comptes créés avant le 2026-10-07). À n'appeler
 * qu'avec le couple kiné/compte lu depuis la base pour le kiné CONNECTÉ.
 * Les erreurs Stripe/DB remontent : à l'appelant de décider.
 */
export async function refreshConnectStatus(instructorId: string, accountId: string): Promise<ConnectStatus> {
  const stripe = getStripe();
  const account = await stripe.accounts.retrieve(accountId);
  const status = connectStatusFromAccount(account);
  await upsertConnectAccount({ instructorId, stripeConnectAccountId: accountId, status });

  if (verifiedInstructorId(account) !== instructorId) {
    try {
      await stripe.accounts.update(accountId, { metadata: connectAccountMetadata(instructorId, accountId) });
    } catch (err) {
      // Sans ces metadata, seul le webhook account.updated est aveugle — le
      // statut, lui, vient d'être enregistré.
      console.error("[connect] metadata du compte Connect non posées :", err);
    }
  }
  return status;
}
