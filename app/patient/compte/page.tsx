import Link from "next/link";
import { AlertTriangle, ArrowRight, Calendar, CheckCircle2, CreditCard, Download, ShieldCheck, User } from "lucide-react";
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

// Statut affiché en pastille dans « Mon abonnement » — même logique de
// couleur que le reste du dashboard (ok/warn/danger + -soft).
function statusBadge(status: string | null | undefined, active: boolean) {
  if (status === "trialing") return { label: "Essai en cours", tone: "ok" as const };
  if (status === "past_due" || status === "unpaid") return { label: "Paiement en échec", tone: "danger" as const };
  if (status === "canceled") return { label: "Résilié", tone: "warn" as const };
  if (active) return { label: "Actif", tone: "ok" as const };
  return { label: "Inactif", tone: "warn" as const };
}

// Refonte 2026-09-11 (Philippe, à partir d'une maquette fournie) : deux
// cartes côte à côte (abonnement + compte), une zone de danger en pleine
// largeur bien distincte, et les actions secondaires (export de données,
// déconnexion) réduites à de simples liens en bas — elles n'ont pas besoin
// du même poids visuel que résilier un abonnement ou supprimer un compte.
// "Notifications" de la maquette d'origine a été retiré : rien derrière
// aujourd'hui, pas de préférences à activer/désactiver dans ce projet.
export default async function CompteePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; refreshed?: string; changed?: string }>;
}) {
  const { error, refreshed, changed } = await searchParams;
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const [billing, { data: sub }, { data: patient }] = await Promise.all([
    getTierBilling(supabase, user.id),
    supabase.from("subscriptions").select("stripe_customer_id").eq("user_id", user.id).maybeSingle(),
    supabase.from("patients").select("full_name").eq("id", user.id).maybeSingle(),
  ]);
  const hasCustomer = !!(sub?.stripe_customer_id as string | null);
  const active = hasActiveTier(billing);
  const paid = isSubscriptionActive(billing.subStatus, billing.subCurrentPeriodEnd);
  const badge = statusBadge(billing.subStatus, active);
  const badgeClass = { ok: "bg-ok-soft text-ok", warn: "bg-warn-soft text-warn", danger: "bg-danger-soft text-danger" }[
    badge.tone
  ];

  const offerLabel = isTierKey(billing.subPlan)
    ? TIERS[billing.subPlan].label
    : billing.subPlan === "patient_monthly"
      ? "EasyPhysio (offre historique)"
      : active
        ? "Essai gratuit (offre historique)"
        : "Aucune offre active";
  const nextChargeLine =
    billing.subStatus === "trialing" && billing.subCurrentPeriodEnd
      ? `Premier prélèvement le ${frDate(billing.subCurrentPeriodEnd)}`
      : paid && billing.subCurrentPeriodEnd
        ? `Prochain prélèvement le ${frDate(billing.subCurrentPeriodEnd)}`
        : billing.subStatus === "canceled" && billing.subCurrentPeriodEnd
          ? isFuture(billing.subCurrentPeriodEnd)
            ? `Accès jusqu'au ${frDate(billing.subCurrentPeriodEnd)}`
            : null
          : !billing.subPlan && billing.trialEndsAt && active
            ? `Jusqu'au ${frDate(billing.trialEndsAt)}`
            : null;
  const priceCents = isTierKey(billing.subPlan) ? TIERS[billing.subPlan].amount : null;

  return (
    <main className="min-h-screen bg-app-bg p-6 sm:p-8">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-2xl font-semibold text-ink">Paramètres</h1>
        <p className="mt-1 text-sm text-muted">Gérez votre compte, votre abonnement et vos données.</p>

        {error && <p className="mt-4 rounded-xl bg-danger-soft p-3 text-sm text-danger">{error}</p>}
        {(refreshed === "1" || changed === "1") && (
          <p className="mt-4 flex items-center gap-1.5 rounded-xl bg-ok-soft p-3 text-sm text-ok">
            <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            {changed === "1" ? "Offre changée avec succès." : "Abonnement mis à jour."}
          </p>
        )}

        <div className="mt-6 grid gap-5 lg:grid-cols-[3fr_2fr]">
          {/* Mon abonnement */}
          <section className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-medium text-ink">
                <CreditCard className="h-4 w-4 text-brand" strokeWidth={1.75} />
                Mon abonnement
              </h2>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClass}`}>{badge.label}</span>
            </div>

            <p className="mt-4 text-lg font-semibold text-ink">{offerLabel}</p>
            {priceCents !== null && (
              <p className="text-sm text-muted">
                {(priceCents / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2 })}&nbsp;€ / mois
              </p>
            )}

            {nextChargeLine && (
              <div className="mt-4 flex items-center gap-2 border-t border-line pt-4 text-sm text-muted">
                <Calendar className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.75} />
                {nextChargeLine}
              </div>
            )}

            {hasCustomer ? (
              <div className="mt-5">
                {/* Deux boutons de même poids, côte à côte : "gérer" couvre
                    déjà changer de carte, voir les factures ET résilier (page
                    Stripe) — un 3ème bouton "annuler" séparé était redondant
                    avec lui (Philippe, 2026-09-11). "Changer d'offre" reste à
                    part car Stripe ne peut pas le faire lui-même (tarifs
                    propres à chaque kiné, voir changer-offre/actions.ts). */}
                <div className="grid grid-cols-2 gap-2">
                  <form action={openBillingPortal}>
                    <input type="hidden" name="intent" value="manage" />
                    <button
                      type="submit"
                      className="flex w-full items-center justify-center gap-1.5 rounded-full bg-brand py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark"
                    >
                      Gérer mon abonnement
                    </button>
                  </form>
                  {isTierKey(billing.subPlan) ? (
                    <Link
                      href="/patient/compte/changer-offre"
                      className="flex w-full items-center justify-center rounded-full border border-brand py-2.5 text-sm font-semibold text-brand transition hover:bg-brand-soft"
                    >
                      Changer d&rsquo;offre
                    </Link>
                  ) : (
                    <span />
                  )}
                </div>
                <p className="mt-2 flex items-center justify-center gap-1 text-center text-xs text-muted">
                  <ShieldCheck className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                  Facturation et résiliation gérées via Stripe
                </p>
              </div>
            ) : (
              !active && (
                <Link
                  href="/patient/abonnement"
                  className="mt-5 inline-block rounded-full bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90"
                >
                  Choisir une offre
                </Link>
              )
            )}
          </section>

          {/* Mon compte */}
          <section className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
            <h2 className="flex items-center gap-2 font-medium text-ink">
              <User className="h-4 w-4 text-brand" strokeWidth={1.75} />
              Mon compte
            </h2>
            <Link
              href="/patient/compte/informations"
              className="mt-4 flex items-center justify-between gap-3 border-t border-line py-4 first:border-t-0 first:pt-0 hover:opacity-80"
            >
              <div>
                <p className="text-sm font-medium text-ink">Mes informations</p>
                <p className="text-xs text-muted">{(patient?.full_name as string | null) ?? "Profil, situation, coordonnées"}</p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.75} />
            </Link>
          </section>
        </div>

        {/* Zone de danger */}
        <section className="mt-5 rounded-2xl border border-danger/30 bg-danger-soft p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-danger" strokeWidth={1.75} />
            <div className="min-w-0 flex-1">
              <h2 className="font-medium text-danger">Zone de danger</h2>
              <p className="mt-1 text-sm text-muted">
                Supprimer votre compte est définitif : profil, séances et messages seront effacés.
              </p>
              <form action={deleteMyAccount} className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  type="text"
                  name="confirmation"
                  placeholder="Tapez SUPPRIMER pour confirmer"
                  required
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-danger focus:outline-none focus:ring-2 focus:ring-danger-soft sm:max-w-xs"
                />
                <button
                  type="submit"
                  className="shrink-0 rounded-full bg-danger px-4 py-2 text-sm font-medium text-white hover:brightness-95"
                >
                  Supprimer mon compte
                </button>
              </form>
            </div>
          </div>
        </section>

        {/* Actions secondaires — pas le même poids que résilier ou supprimer,
            un simple lien suffit (Philippe, 2026-09-11 : "pas forcément vital"). */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted">
          <Link href="/patient/compte/export" prefetch={false} className="inline-flex items-center gap-1.5 hover:text-ink">
            <Download className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
            Télécharger mes données
          </Link>
          <Link href="/confidentialite" className="hover:text-ink hover:underline">
            Politique de confidentialité
          </Link>
          <SignOutButton redirectUrl="/login">
            <button type="button" className="hover:text-ink">
              Se déconnecter
            </button>
          </SignOutButton>
        </div>
      </div>
    </main>
  );
}
