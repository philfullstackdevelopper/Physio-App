// Abonnements patients signés par EasyPhysio (audit du 2026-10-08, repris le
// 2026-11-02 pour les formules 1 / 3 / 6 mois).
//
// Les comptes Stripe des kinés sont des comptes « Standard » : chaque kiné a
// son propre tableau de bord Stripe et pourrait y créer à la main un
// abonnement portant metadata.user_id / metadata.plan de son choix. Seul un
// abonnement créé par EasyPhysio porte une signature valide (HMAC, clé =
// STRIPE_SECRET_KEY, que le kiné ne connaît pas) liant le patient, la
// formule et le compte Stripe où il vit ; les autres sont ignorés.
import { createHmac, timingSafeEqual } from "node:crypto";

function signature(userId: string, plan: string, accountId: string): string {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set.");
  return createHmac("sha256", key).update(`subscription:${userId}:${plan}:${accountId}`).digest("hex");
}

/** Metadata à poser sur un abonnement créé par EasyPhysio. */
export function signedSubscriptionMetadata(userId: string, plan: string, accountId: string): Record<string, string> {
  return { user_id: userId, plan, sub_sig: signature(userId, plan, accountId) };
}

/** Vrai seulement si les metadata ont été signées par EasyPhysio pour ce compte. */
export function hasValidSubscriptionSignature(
  metadata: Record<string, string> | null | undefined,
  accountId: string,
): boolean {
  const userId = metadata?.user_id;
  const plan = metadata?.plan;
  const sig = metadata?.sub_sig;
  if (!userId || !plan || !sig || !/^[0-9a-f]+$/i.test(sig)) return false;
  const expected = Buffer.from(signature(userId, plan, accountId), "hex");
  const given = Buffer.from(sig, "hex");
  return given.length === expected.length && timingSafeEqual(given, expected);
}
