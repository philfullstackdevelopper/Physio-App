import Link from "next/link";
import { AlertTriangle, ArrowRight, Calendar, CheckCircle2, ChevronRight, CreditCard, Download, LogOut, ShieldCheck, Trash2, User } from "lucide-react";
import { SignOutButton } from "@clerk/nextjs";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { TIERS, isTierKey, resolveTierPrices, type InstructorTierPriceRow } from "@/lib/billing/plans";
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
    supabase.from("patients").select("full_name, instructor_id").eq("id", user.id).maybeSingle(),
  ]);
  // (Philippe, 2026-10-07) Le prix affiché est celui de SON kiné (lisible par
  // le patient, migration 0028 — même lecture que /patient/abonnement), pas
  // le défaut plateforme de TIERS : c'est ce montant-là que Stripe prélève.
  const instructorId = (patient?.instructor_id as string | null) ?? null;
  const { data: kine } = instructorId
    ? await supabase
        .from("instructors")
        .select("tier_essentiel_cents, tier_standard_cents, tier_premium_cents")
        .eq("id", instructorId)
        .maybeSingle()
    : { data: null };
  const kinePrices = resolveTierPrices(kine as InstructorTierPriceRow | null);
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
  const priceCents = isTierKey(billing.subPlan) ? kinePrices[billing.subPlan] : null;

  return (
    // Téléphone (Philippe, 2026-10-04 : tout sur un écran, plus efficace) :
    // cartes resserrées, textes secondaires masqués, offre + prix sur une
    // ligne. Dès sm : inchangé.
    <main className="bg-app-bg p-4 pt-5 max-sm:bg-transparent max-sm:pt-2 max-sm:flex max-sm:min-h-[calc(100dvh-var(--phone-chrome))] max-sm:flex-col sm:min-h-screen sm:p-8">
      <PhoneSettings
        fullName={(patient?.full_name as string | null) ?? null}
        error={error}
        notice={changed === "1" ? "Offre changée avec succès." : refreshed === "1" ? "Abonnement mis à jour." : null}
        offerLabel={offerLabel}
        priceCents={priceCents}
        badgeLabel={badge.label}
        badgeClass={badgeClass}
        nextChargeLine={nextChargeLine}
        hasCustomer={hasCustomer}
        canChangeOffer={isTierKey(billing.subPlan)}
        active={active}
      />

      <div className="mx-auto max-w-7xl max-sm:hidden max-sm:flex max-sm:w-full max-sm:flex-1 max-sm:flex-col max-sm:justify-between">
        <h1 className="text-xl font-semibold text-ink sm:text-2xl">Paramètres</h1>
        <p className="mt-1 hidden text-sm text-muted sm:block">Gérez votre compte, votre abonnement et vos données.</p>

        {error && <p className="mt-4 rounded-xl bg-danger-soft p-3 text-sm text-danger">{error}</p>}
        {(refreshed === "1" || changed === "1") && (
          <p className="mt-4 flex items-center gap-1.5 rounded-xl bg-ok-soft p-3 text-sm text-ok">
            <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            {changed === "1" ? "Offre changée avec succès." : "Abonnement mis à jour."}
          </p>
        )}

        <div className="mt-4 grid gap-3 sm:mt-6 sm:gap-5 lg:grid-cols-[3fr_2fr]">
          {/* Mon abonnement */}
          <section className="rounded-2xl border border-line bg-surface p-4 shadow-sm sm:p-6">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-medium text-ink">
                <CreditCard className="h-4 w-4 text-brand" strokeWidth={1.75} />
                Mon abonnement
              </h2>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClass}`}>{badge.label}</span>
            </div>

            <div className="mt-3 flex flex-wrap items-baseline gap-x-2 sm:mt-4 sm:block">
            <p className="text-lg font-semibold text-ink">{offerLabel}</p>
            {priceCents !== null && (
              <p className="text-sm text-muted">
                {(priceCents / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2 })}&nbsp;€ / mois
              </p>
            )}
            </div>

            {nextChargeLine && (
              <div className="mt-3 flex items-center gap-2 border-t border-line pt-3 text-sm text-muted sm:mt-4 sm:pt-4">
                <Calendar className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.75} />
                {nextChargeLine}
              </div>
            )}

            {hasCustomer ? (
              <div className="mt-3 sm:mt-5">
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
                      <span className="sm:hidden">Gérer</span>
                      <span className="hidden sm:inline">Gérer mon abonnement</span>
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
                <p className="mt-2 hidden items-center justify-center gap-1 text-center text-xs text-muted sm:flex">
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
          <section className="rounded-2xl border border-line bg-surface p-4 shadow-sm sm:p-6">
            <h2 className="hidden items-center gap-2 font-medium text-ink sm:flex">
              <User className="h-4 w-4 text-brand" strokeWidth={1.75} />
              Mon compte
            </h2>
            <Link
              href="/patient/compte/informations"
              className="flex items-center justify-between gap-3 border-t border-line py-0 first:border-t-0 first:pt-0 hover:opacity-80 max-sm:border-t-0 sm:mt-4 sm:py-4"
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
        <section className="mt-3 rounded-2xl border border-danger/30 bg-danger-soft p-4 sm:mt-5 sm:p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-danger" strokeWidth={1.75} />
            <div className="min-w-0 flex-1">
              <h2 className="font-medium text-danger">Zone de danger</h2>
              <p className="mt-1 text-xs text-muted sm:text-sm">
                Supprimer votre compte est définitif : profil, séances et messages seront effacés.
              </p>
              <form action={deleteMyAccount} className="mt-3 flex gap-2 sm:mt-4 sm:flex-row sm:items-center">
                <input
                  type="text"
                  name="confirmation"
                  placeholder="Tapez SUPPRIMER pour confirmer"
                  required
                  className="w-full min-w-0 rounded-lg border border-line bg-surface px-3 py-2 text-base text-ink sm:text-sm focus:border-danger focus:outline-none focus:ring-2 focus:ring-danger-soft sm:max-w-xs"
                />
                <button
                  type="submit"
                  className="shrink-0 rounded-full bg-danger px-4 py-2 text-sm font-medium text-white hover:brightness-95"
                >
                  <span className="sm:hidden">Supprimer</span>
                  <span className="hidden sm:inline">Supprimer mon compte</span>
                </button>
              </form>
            </div>
          </div>
        </section>

        {/* Actions secondaires — pas le même poids que résilier ou supprimer,
            un simple lien suffit (Philippe, 2026-09-11 : "pas forcément vital"). */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-muted sm:mt-6 sm:gap-x-6 sm:text-sm">
          <Link href="/patient/compte/export" prefetch={false} className="inline-flex items-center gap-1.5 hover:text-ink">
            <Download className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
            Télécharger mes données
          </Link>
          <Link href="/confidentialite" className="hover:text-ink hover:underline">
            <span className="sm:hidden">Confidentialité</span>
            <span className="hidden sm:inline">Politique de confidentialité</span>
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

// Téléphone uniquement (Philippe, 2026-10-06, maquette fournie) : la page en
// liste façon réglages d'appli — carte profil, puis sections étiquetées avec
// des lignes icône + texte + chevron. Exactement les mêmes actions que la
// version ordinateur ci-dessus (rien d'ajouté) ; la suppression du compte se
// déplie depuis sa ligne pour que tout tienne sur un écran.
const ROW = "flex w-full items-center gap-3 px-4 py-3 text-left";
const ROW_ICON = "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-app-bg text-ink";

function PhoneSettings({
  fullName,
  error,
  notice,
  offerLabel,
  priceCents,
  badgeLabel,
  badgeClass,
  nextChargeLine,
  hasCustomer,
  canChangeOffer,
  active,
}: {
  fullName: string | null;
  error?: string;
  notice: string | null;
  offerLabel: string;
  priceCents: number | null;
  badgeLabel: string;
  badgeClass: string;
  nextChargeLine: string | null;
  hasCustomer: boolean;
  canChangeOffer: boolean;
  active: boolean;
}) {
  const priceLine = priceCents !== null ? `${(priceCents / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} € / mois` : null;
  return (
    <div className="flex flex-1 flex-col gap-3 sm:hidden">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Paramètres</h1>
        <p className="mt-0.5 text-sm text-muted">Gérez votre compte, votre abonnement et vos données.</p>
      </div>

      {error && <p className="rounded-xl bg-danger-soft p-3 text-sm text-danger">{error}</p>}
      {notice && (
        <p className="flex items-center gap-1.5 rounded-xl bg-ok-soft p-3 text-sm text-ok">
          <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          {notice}
        </p>
      )}

      <Link href="/patient/compte/informations" className="flex items-center gap-3 rounded-2xl bg-surface p-3.5 shadow-soft">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
          <User className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-base font-semibold text-ink">{fullName ?? "Mes informations"}</span>
          <span className="block truncate text-xs text-muted">Mes informations · profil, situation, coordonnées</span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted" strokeWidth={2} />
      </Link>

      <section>
        <h2 className="mb-1.5 px-1 text-sm font-semibold text-ink">Mon abonnement</h2>
        <div className="rounded-2xl bg-surface p-3.5 shadow-soft">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
              <CreditCard className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-ink">{offerLabel}</span>
              {(priceLine || nextChargeLine) && (
                <span className="block truncate text-xs text-muted">{[priceLine, nextChargeLine].filter(Boolean).join(" · ")}</span>
              )}
            </span>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${badgeClass}`}>{badgeLabel}</span>
          </div>
          {hasCustomer ? (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <form action={openBillingPortal}>
                <input type="hidden" name="intent" value="manage" />
                <button type="submit" className="w-full rounded-full bg-brand py-2.5 text-sm font-semibold text-white">
                  Gérer
                </button>
              </form>
              {canChangeOffer ? (
                <Link
                  href="/patient/compte/changer-offre"
                  className="flex w-full items-center justify-center rounded-full border border-brand py-2.5 text-sm font-semibold text-brand"
                >
                  Changer d&rsquo;offre
                </Link>
              ) : (
                <span />
              )}
            </div>
          ) : (
            !active && (
              <Link href="/patient/abonnement" className="mt-3 block rounded-full bg-brand py-2.5 text-center text-sm font-semibold text-white">
                Choisir une offre
              </Link>
            )
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-1.5 px-1 text-sm font-semibold text-ink">Mes données</h2>
        <div className="divide-y divide-line overflow-hidden rounded-2xl bg-surface shadow-soft">
          <Link href="/patient/compte/export" prefetch={false} className={ROW}>
            <span className={ROW_ICON}>
              <Download className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </span>
            <span className="flex-1 text-sm font-medium text-ink">Télécharger mes données</span>
            <ChevronRight className="h-4 w-4 text-muted" strokeWidth={2} />
          </Link>
          <Link href="/confidentialite" className={ROW}>
            <span className={ROW_ICON}>
              <ShieldCheck className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </span>
            <span className="flex-1 text-sm font-medium text-ink">Politique de confidentialité</span>
            <ChevronRight className="h-4 w-4 text-muted" strokeWidth={2} />
          </Link>
        </div>
      </section>

      <div className="divide-y divide-line overflow-hidden rounded-2xl bg-surface shadow-soft">
        <SignOutButton redirectUrl="/login">
          <button type="button" className={ROW}>
            <span className={ROW_ICON}>
              <LogOut className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </span>
            <span className="flex-1 text-sm font-medium text-ink">Se déconnecter</span>
            <ChevronRight className="h-4 w-4 text-muted" strokeWidth={2} />
          </button>
        </SignOutButton>
        <details className="group">
          <summary className={`${ROW} cursor-pointer list-none [&::-webkit-details-marker]:hidden`}>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-danger-soft text-danger">
              <Trash2 className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </span>
            <span className="flex-1 text-sm font-medium text-danger">Supprimer mon compte</span>
            <ChevronRight className="h-4 w-4 text-muted transition-transform group-open:rotate-90" strokeWidth={2} />
          </summary>
          <div className="px-4 pb-4">
            <p className="flex items-start gap-1.5 text-xs text-muted">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-danger" strokeWidth={1.75} />
              Définitif : profil, séances et messages seront effacés.
            </p>
            <form action={deleteMyAccount} className="mt-2 flex gap-2">
              <input
                type="text"
                name="confirmation"
                placeholder="Tapez SUPPRIMER"
                required
                className="w-full min-w-0 rounded-lg border border-line bg-surface px-3 py-2 text-base text-ink focus:border-danger focus:outline-none focus:ring-2 focus:ring-danger-soft"
              />
              <button type="submit" className="shrink-0 rounded-full bg-danger px-4 py-2 text-sm font-medium text-white">
                Supprimer
              </button>
            </form>
          </div>
        </details>
      </div>
    </div>
  );
}
