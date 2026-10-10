import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertCircle, Check, LogOut, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { SignOutButton } from "@clerk/nextjs";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import SubmitButton from "@/components/SubmitButton";
import { TIERS, TIER_KEYS, TRIAL_DAYS, resolveTierPrices, type InstructorTierPriceRow, type TierKey } from "@/lib/billing/plans";
import { HIGHLIGHT, featuresFor } from "@/lib/billing/tierCopy";
import { lockReason } from "@/lib/billing/access";
import PatientLockScreen from "@/components/PatientLockScreen";
import { hasPatientAppAccess } from "@/lib/billing/context";
import { openBillingPortal } from "@/app/billing/actions";
import { startTierCheckout } from "./actions";

const FEATURED: TierKey = "standard";

const euros = (cents: number) => (cents / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2 });

// No pastel bordered box — this page already carries its own visual identity
// (the Road to Offer-style pricing cards); three yellow/red alert cards on
// top of that just read as generic boilerplate (Philippe, 2026-09-10:
// "extrêmement AI slop"). But plain gray text was the other extreme —
// unreadable at a glance ("on le voit à peine") — so the fix is color and
// weight doing the work a box used to: the icon and text carry the tone
// directly, sized to match the rest of the page's copy, not a footnote.
function Notice({ tone, children }: { tone: "danger" | "warn"; children: React.ReactNode }) {
  const color = tone === "danger" ? "text-red-600" : "text-amber-700";
  return (
    <p className={`mx-auto mt-6 flex max-w-xl items-start justify-center gap-2 text-center text-base font-medium leading-relaxed ${color}`}>
      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={2} />
      <span>{children}</span>
    </p>
  );
}

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
    // h-dvh + overflow-hidden pin this to exactly the viewport (same
    // technique as app/patient/onboarding/page.tsx) — no document-level
    // scroll, ever, no matter how tall the pricing cards get. The inner div
    // below is the only thing that can scroll, and only if content on a
    // small screen genuinely doesn't fit (Philippe, 2026-09-11: "il ne
    // faudrait pas DU TOUT être possible de scroller").
    <main className="relative h-dvh overflow-hidden bg-[#f6f8fd]">
      <SignOutButton redirectUrl="/login">
        <button
          type="button"
          className="absolute bottom-4 left-4 z-10 inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 transition-colors hover:text-slate-600 lg:bottom-6 lg:left-6"
        >
          <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          Se déconnecter
        </button>
      </SignOutButton>
      {/* Droits RGPD sans offre active (audit du 2026-10-08) : exporter ses
          données ou supprimer son compte reste possible depuis cette page. */}
      <Link
        href="/patient/compte"
        className="absolute bottom-4 right-4 z-10 inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 transition-colors hover:text-slate-600 lg:bottom-6 lg:right-6"
      >
        <UserRound className="h-4 w-4 shrink-0" strokeWidth={1.75} />
        Mon compte et mes données
      </Link>

      {/* Le scroll (si le contenu dépasse) vit sur ce wrapper plein-largeur ;
          le max-w-6xl/mx-auto qui centre le contenu vit sur le div interne.
          Les deux sur le même élément mettaient la scrollbar au bord de la
          zone à 6xl, pas au bord réel du navigateur — elle semblait flotter
          au milieu de la page (Philippe, 2026-09-11). */}
      <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-10">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            <span className="text-blue-700">EasyPhysio ·</span>{" "}Choisissez votre accompagnement
          </h1>
          <p className="mt-3 text-base leading-relaxed text-slate-600">
            {trialAvailable ? `${TRIAL_DAYS} jours gratuits pour essayer, puis facturation mensuelle` : "Facturation mensuelle"}
            {kineName ? (
              <>
                {" "}
                directement à <span className="font-medium text-slate-800">{kineName}</span>
              </>
            ) : null}
            . Sans engagement, annulable en un clic.
          </p>
        </div>

        {error && <Notice tone="danger">{error}</Notice>}
        {paymentFailed && (
          <div className="mx-auto mt-6 flex max-w-xl flex-col items-center gap-3 text-center">
            <Notice tone="danger">
              Le dernier prélèvement de votre abonnement a échoué. Mettez à jour votre carte pour le réactiver — inutile
              de souscrire une nouvelle offre.
            </Notice>
            <form action={openBillingPortal}>
              <SubmitButton
                pendingText="Ouverture…"
                className="rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
              >
                Mettre à jour ma carte
              </SubmitButton>
            </form>
          </div>
        )}
        {checkout === "cancel" && (
          <Notice tone="warn">Paiement annulé — vous pouvez choisir une offre quand vous voulez.</Notice>
        )}
        {!paymentsReady && (
          <Notice tone="warn">
            {kineName ?? "Votre kinésithérapeute"} n&rsquo;a pas encore activé les paiements en ligne — vous pouvez
            découvrir les offres, l&rsquo;abonnement suivra une fois son compte activé.
          </Notice>
        )}

        <div className="mt-10 grid gap-5 lg:grid-cols-3 lg:items-end">
          {TIER_KEYS.map((key) => {
            const tier = TIERS[key];
            const featured = key === FEATURED;
            return (
              <section
                key={key}
                className={
                  featured
                    ? "relative z-10 rounded-3xl bg-blue-600 p-7 text-white shadow-2xl shadow-blue-900/30 ring-1 ring-blue-700 lg:animate-[floatY_4s_ease-in-out_infinite] lg:scale-[1.05] lg:p-8"
                    : "rounded-3xl border border-slate-200 bg-white p-7 shadow-sm"
                }
              >
                {featured && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-slate-900 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
                    {trialAvailable ? `${TRIAL_DAYS} jours gratuits · le plus choisi` : "Le plus choisi"}
                  </span>
                )}

                <h2 className={`font-display text-2xl font-semibold ${featured ? "text-white" : "text-slate-900"}`}>
                  {tier.label}
                </h2>

                <p
                  className={`mt-1.5 flex items-center gap-1.5 text-sm font-medium ${featured ? "text-blue-50" : "text-blue-700"}`}
                >
                  <Sparkles className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                  {HIGHLIGHT[key]}
                </p>

                {/* Offre de lancement : prix barré seulement si le kiné n'a pas
                    fixé son propre tarif — comparer un prix qu'il a choisi à
                    un "prix normal" plateforme n'aurait pas de sens. */}
                {prices[key] === tier.amount && (
                  <span
                    className={`mt-4 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wide ${
                      featured ? "bg-white/15 text-white" : "bg-red-50 text-red-600"
                    }`}
                  >
                    Offre de lancement · -50&nbsp;%
                  </span>
                )}

                <p className="mt-4 flex items-baseline gap-1.5">
                  {prices[key] === tier.amount && (
                    <span className={`text-lg line-through ${featured ? "text-blue-200" : "text-slate-400"}`}>
                      {euros(tier.listAmount)}&nbsp;€
                    </span>
                  )}
                  <span className={`font-display text-5xl font-semibold tracking-tight ${featured ? "text-white" : "text-slate-900"}`}>
                    {euros(prices[key])}&nbsp;€
                  </span>
                  <span className={`text-sm ${featured ? "text-blue-100" : "text-slate-500"}`}>/mois</span>
                </p>
                <p className={`mt-1 text-xs ${featured ? "text-blue-100" : "text-slate-500"}`}>
                  {trialAvailable
                    ? <>0 € aujourd&rsquo;hui · premier prélèvement le {firstChargeDate}</>
                    : "Prélevé dès aujourd’hui, puis chaque mois"}
                </p>

                <form action={startTierCheckout} className="mt-6">
                  <input type="hidden" name="tier" value={key} />
                  <SubmitButton
                    disabled={!paymentsReady || paymentFailed}
                    pendingText="Redirection vers le paiement…"
                    className={
                      featured
                        ? "w-full rounded-full bg-[length:200%_100%] bg-[linear-gradient(115deg,#ffffff_35%,#dbeafe_50%,#ffffff_65%)] py-3 text-sm font-semibold text-blue-700 shadow-sm transition animate-[shineSweep_2.5s_linear_infinite] hover:bg-blue-50"
                        : "w-full rounded-full bg-blue-600 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                    }
                  >
                    {trialAvailable ? `Commencer mes ${TRIAL_DAYS} jours gratuits` : "Choisir cette offre"}
                  </SubmitButton>
                </form>
                <p
                  className={`mt-2.5 flex items-center justify-center gap-1.5 text-xs ${featured ? "text-blue-100" : "text-slate-500"}`}
                >
                  <ShieldCheck className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                  Sans engagement · annulable à tout moment
                </p>

                <ul className={`mt-6 space-y-2.5 border-t pt-6 text-sm ${featured ? "border-blue-500 text-blue-50" : "border-slate-100 text-slate-700"}`}>
                  {featuresFor(key).map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <span
                        className={`mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full ${featured ? "bg-white/20" : "bg-blue-50"}`}
                      >
                        <Check className={`h-3 w-3 ${featured ? "text-white" : "text-blue-700"}`} strokeWidth={3} />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>

        <p className="mx-auto mt-10 max-w-2xl text-center text-xs leading-relaxed text-slate-500">
          {trialAvailable ? (
            <>
              Paiement sécurisé par Stripe. Votre carte est enregistrée aujourd&rsquo;hui et débitée pour la première
              fois le {firstChargeDate}, sauf annulation avant.
            </>
          ) : (
            <>
              Paiement sécurisé par Stripe. Vous avez déjà profité de l&rsquo;essai gratuit : le premier mois est
              débité dès aujourd&rsquo;hui.
            </>
          )}{" "}
          Vous pourrez changer ou annuler votre offre à tout moment depuis vos paramètres.
        </p>
      </div>
      </div>
    </main>
  );
}
