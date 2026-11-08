// Statut local d'un compte Stripe Connect de kiné, à partir de ce que Stripe
// en dit (Philippe, 2026-10-07 : avant, le statut n'était écrit qu'au retour
// de l'onboarding — app/dashboard/connect/return/route.ts — et restait figé
// ensuite). Une seule règle, partagée par ce retour, la page Facturation et
// le webhook `account.updated`.
//
// Server-only (clé secrète Stripe, connexion Postgres directe).
import type Stripe from "stripe";
import { upsertConnectAccount } from "@/lib/db/admin";
import { sign, verify } from "./signing";
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
// SIGNÉ (HMAC, clé STRIPE_SIGNING_SECRET de lib/billing/signing.ts, jamais connue du kiné) : sans
// signature, un kiné qui modifierait ces metadata pourrait faire pointer la
// fiche d'un AUTRE kiné vers son propre compte et détourner les paiements de
// ses patients (CLAUDE.md §3, la raison même de cette table à part).

const payload = (instructorId: string, accountId: string) => `connect:${instructorId}:${accountId}`;

/** Metadata à poser sur le compte Connect d'un kiné. */
export function connectAccountMetadata(instructorId: string, accountId: string): Record<string, string> {
  return { instructor_id: instructorId, instructor_sig: sign(payload(instructorId, accountId)) };
}

/**
 * Vrai si Stripe ne connaît pas (ou plus) cet objet — typiquement un compte
 * Connect créé en mode TEST, relu avec les clés du mode RÉEL (passage en
 * production du 2026-11-02). L'appelant le traite alors comme « pas de compte ».
 */
export function isMissingStripeObject(err: unknown): boolean {
  const e = err as { code?: string; type?: string; message?: string } | null;
  if (!e) return false;
  if (e.code === "resource_missing" || e.code === "account_invalid") return true;
  // Compte que le kiné a déconnecté d'EasyPhysio (« application access may have been revoked »).
  if (e.type === "StripePermissionError" && /does not have access to account|access may have been revoked/i.test(e.message ?? "")) return true;
  return e.type === "StripeInvalidRequestError" && /no such|does not exist|exists in (test|live) mode/i.test(e.message ?? "");
}

/** L'id du kiné rattaché à ce compte, seulement si la signature est valide. */
export function verifiedInstructorId(account: Pick<Stripe.Account, "id" | "metadata">): string | null {
  const instructorId = account.metadata?.instructor_id;
  const sig = account.metadata?.instructor_sig;
  if (!instructorId || !sig) return null;
  return verify(payload(instructorId, account.id), sig) ? instructorId : null;
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
