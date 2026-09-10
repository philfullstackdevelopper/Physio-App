import Link from "next/link";
import { CheckCircle2, CreditCard } from "lucide-react";
import { SignOutButton } from "@clerk/nextjs";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { TIERS, isTierKey } from "@/lib/billing/plans";
import { hasActiveTier, isSubscriptionActive } from "@/lib/billing/access";
import { getTierBilling } from "@/lib/billing/context";
import { openBillingPortal } from "@/app/billing/actions";
import { deleteMyAccount } from "./actions";

const frDate = (iso: string) =>
  new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));
// Hors du composant : react-hooks/purity refuse Date.now() dans le rendu.
const isFuture = (iso: string) => new Date(iso).getTime() > Date.now();

export default async function CompteePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; refreshed?: string }>;
}) {
  const { error, refreshed } = await searchParams;
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const [billing, { data: sub }] = await Promise.all([
    getTierBilling(supabase, user.id),
    supabase.from("subscriptions").select("stripe_customer_id").eq("user_id", user.id).maybeSingle(),
  ]);
  const hasCustomer = !!(sub?.stripe_customer_id as string | null);
  const active = hasActiveTier(billing);
  const paid = isSubscriptionActive(billing.subStatus, billing.subCurrentPeriodEnd);

  // « Mon abonnement » : l'offre, où on en est, et le bouton d'annulation
  // (portail client Stripe) — Philippe, 2026-09-10 : annuler doit être aussi
  // simple que s'abonner. Le libellé couvre aussi les comptes historiques
  // (essai maison, ancien abonnement à 10 €) que hasActiveTier laisse entrer.
  const offerLabel = isTierKey(billing.subPlan)
    ? `Offre ${TIERS[billing.subPlan].label}`
    : billing.subPlan === "patient_monthly"
      ? "Abonnement EasyPhysio (offre historique)"
      : active
        ? "Essai gratuit (offre historique)"
        : "Aucune offre active";
  const statusLine =
    billing.subStatus === "trialing" && billing.subCurrentPeriodEnd
      ? `Essai gratuit en cours — premier prélèvement le ${frDate(billing.subCurrentPeriodEnd)}.`
      : paid && billing.subCurrentPeriodEnd
        ? `Actif — prochain prélèvement le ${frDate(billing.subCurrentPeriodEnd)}.`
        : billing.subStatus === "canceled" && billing.subCurrentPeriodEnd
          ? isFuture(billing.subCurrentPeriodEnd)
            ? `Résilié — vous gardez l'accès jusqu'au ${frDate(billing.subCurrentPeriodEnd)}.`
            : "Résilié."
          : billing.subStatus === "past_due" || billing.subStatus === "unpaid"
            ? "Paiement en échec — mettez à jour votre carte pour conserver l'accès."
            : !billing.subPlan && billing.trialEndsAt && active
              ? `Jusqu'au ${frDate(billing.trialEndsAt)}.`
              : active
                ? "Actif."
                : "Choisissez une offre pour accéder à votre programme.";

  return (
    <main className="min-h-screen p-6 sm:p-8">
      <div className="mx-auto max-w-md">
        <h1 className="text-2xl font-semibold text-ink">Paramètres</h1>
        <p className="mt-1 text-sm text-muted">Gérez votre abonnement, votre compte et vos données.</p>

        {error && <p className="mt-4 rounded-xl bg-danger-soft p-3 text-sm text-danger">{error}</p>}
        {refreshed === "1" && (
          <p className="mt-4 flex items-center gap-1.5 rounded-xl bg-ok-soft p-3 text-sm text-ok">
            <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            Abonnement mis à jour.
          </p>
        )}

        <section className="mt-6 rounded-2xl border border-line bg-surface p-6 shadow-sm">
          <h2 className="flex items-center gap-2 font-medium text-ink">
            <CreditCard className="h-4 w-4 text-brand" strokeWidth={1.75} />
            Mon abonnement
          </h2>
          <p className="mt-3 text-lg font-semibold text-ink">{offerLabel}</p>
          <p className="mt-1 text-sm text-muted">{statusLine}</p>

          {hasCustomer ? (
            <form action={openBillingPortal} className="mt-4">
              <button
                type="submit"
                className="w-full rounded-full border border-line bg-surface py-2.5 text-sm font-medium text-ink shadow-sm hover:bg-app-bg"
              >
                Gérer ou annuler mon abonnement
              </button>
            </form>
          ) : (
            !active && (
              <Link
                href="/patient/abonnement"
                className="mt-4 inline-block rounded-full bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                Choisir une offre
              </Link>
            )
          )}
          {hasCustomer && (
            <p className="mt-2 text-center text-xs text-muted">
              Changement de carte, factures et résiliation — sur la page sécurisée Stripe, effet immédiat.
            </p>
          )}
        </section>

        <section className="mt-6 rounded-2xl border border-line bg-surface p-6 shadow-sm">
          <h2 className="font-medium text-ink">Télécharger mes données</h2>
          <p className="mt-1 text-sm text-muted">
            Récupérez un fichier avec toutes les données que EasyPhysio conserve à votre sujet
            (profil, ressenti, séances, messages).
          </p>
          <Link
            href="/patient/compte/export"
            prefetch={false}
            className="mt-4 inline-block rounded-full border border-brand px-4 py-2 text-sm font-medium text-brand hover:bg-brand-soft"
          >
            Télécharger (.json)
          </Link>
        </section>

        <section className="mt-6 rounded-2xl border border-danger/30 bg-surface p-6 shadow-sm">
          <h2 className="font-medium text-danger">Supprimer mon compte</h2>
          <p className="mt-1 text-sm text-muted">
            Cette action est définitive : votre compte, votre profil, vos séances et vos
            messages seront supprimés. Tapez « SUPPRIMER » pour confirmer.
          </p>
          <form action={deleteMyAccount} className="mt-4 flex flex-col gap-2">
            <input
              type="text"
              name="confirmation"
              placeholder="SUPPRIMER"
              required
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-ink focus:border-danger focus:outline-none focus:ring-2 focus:ring-danger-soft"
            />
            <button
              type="submit"
              className="rounded-full bg-danger px-4 py-2 text-sm font-medium text-white hover:brightness-95"
            >
              Supprimer définitivement mon compte
            </button>
          </form>
        </section>

        <SignOutButton redirectUrl="/login">
          <button
            type="button"
            className="mt-6 w-full rounded-full border border-line bg-surface py-2.5 text-sm font-medium text-muted shadow-sm hover:bg-app-bg"
          >
            Se déconnecter
          </button>
        </SignOutButton>

        <p className="mt-6 text-center text-xs text-muted">
          <Link href="/confidentialite" className="underline">
            Politique de confidentialité
          </Link>
        </p>
      </div>
    </main>
  );
}
