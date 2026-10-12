import Link from "next/link";
import { AlertCircle, Check, LogOut, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { SignOutButton } from "@clerk/nextjs";
import SubmitButton from "@/components/SubmitButton";
import { TIERS, TIER_KEYS, TRIAL_DAYS, type TierKey } from "@/lib/billing/plans";
import { HIGHLIGHT, featuresFor } from "@/lib/billing/tierCopy";

// Affichage seul du choix d'offre (les données viennent de page.tsx) — séparé
// pour pouvoir le prévisualiser avec des données fictives sans connexion
// (/prototypes/patient-ecrans?ecran=abonnement), audit des formats d'écran
// du 2026-10-10.

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

export default function AbonnementView({
  error,
  checkout,
  paymentFailed,
  trialAvailable,
  prices,
  kineName,
  paymentsReady,
  firstChargeDate,
  startTierCheckout,
  openBillingPortal,
}: {
  error?: string;
  checkout?: string;
  paymentFailed: boolean;
  trialAvailable: boolean;
  prices: Record<TierKey, number>;
  kineName: string | null;
  paymentsReady: boolean;
  firstChargeDate: string;
  startTierCheckout: (formData: FormData) => void | Promise<void>;
  openBillingPortal: (formData: FormData) => void | Promise<void>;
}) {
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
      {/* Audit des formats (2026-10-12) : la zone interne défilait de 130 à
          970 px selon l'écran. Sous 1024 px : une carte compacte par offre
          (prix à gauche, bouton à droite), liste détaillée dès la tablette ;
          écran peu haut : marges et liste resserrées. */}
      <div className="mx-auto max-w-6xl px-4 pb-12 pt-8 max-lg:pt-5 max-sm:short:pb-9 max-sm:short:pt-4 sm:px-8 sm:pt-10 sm:max-lg:pt-6 lg:pt-6 short:pt-4 short:sm:pt-4 short:lg:pb-9 short:lg:pt-3">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-slate-900 max-sm:text-2xl sm:text-4xl short:text-2xl short:sm:text-2xl">
            <span className="text-blue-700">EasyPhysio ·</span>{" "}Choisissez votre accompagnement
          </h1>
          <p className="mt-3 text-base leading-relaxed text-slate-600 max-sm:mt-1.5 max-sm:text-sm short:mt-1 short:text-sm">
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

        <div className="mt-10 grid gap-5 max-lg:mt-5 max-lg:gap-3 max-sm:short:mt-4 max-sm:short:gap-2.5 lg:mt-8 lg:grid-cols-3 lg:items-end short:mt-6 short:lg:mt-4 short:lg:gap-4">
          {TIER_KEYS.map((key) => {
            const tier = TIERS[key];
            const featured = key === FEATURED;
            return (
              <section
                key={key}
                className={
                  featured
                    ? "relative z-10 rounded-3xl bg-blue-600 p-7 text-white shadow-2xl shadow-blue-900/30 ring-1 ring-blue-700 max-lg:rounded-2xl max-lg:p-4 max-lg:shadow-lg lg:animate-[floatY_4s_ease-in-out_infinite] lg:scale-[1.05] lg:p-7 short:lg:p-4"
                    : "rounded-3xl border border-slate-200 bg-white p-7 shadow-sm max-lg:rounded-2xl max-lg:p-4 short:lg:p-4"
                }
              >
                {featured && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-slate-900 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white max-lg:-top-2.5 max-lg:left-auto max-lg:right-3 max-lg:translate-x-0 max-lg:px-2.5 max-lg:py-0.5 max-lg:text-[10px]">
                    {trialAvailable ? `${TRIAL_DAYS} jours gratuits · le plus choisi` : "Le plus choisi"}
                  </span>
                )}

                <h2 className={`font-display text-2xl font-semibold max-lg:text-lg short:lg:text-xl ${featured ? "text-white" : "text-slate-900"}`}>
                  {tier.label}
                </h2>

                <p
                  className={`mt-1.5 flex items-center gap-1.5 text-sm font-medium max-lg:mt-0.5 max-lg:text-xs max-sm:short:hidden short:lg:mt-0.5 ${featured ? "text-blue-50" : "text-blue-700"}`}
                >
                  <Sparkles className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                  {HIGHLIGHT[key]}
                </p>

                {/* Offre de lancement : prix barré seulement si le kiné n'a pas
                    fixé son propre tarif — comparer un prix qu'il a choisi à
                    un "prix normal" plateforme n'aurait pas de sens. */}
                {prices[key] === tier.amount && (
                  <span
                    className={`mt-4 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wide max-lg:hidden short:hidden ${
                      featured ? "bg-white/15 text-white" : "bg-red-50 text-red-600"
                    }`}
                  >
                    Offre de lancement · -50&nbsp;%
                  </span>
                )}

                <div className="max-lg:mt-2 max-lg:flex max-lg:items-center max-lg:justify-between max-lg:gap-3">
                <div className="max-lg:min-w-0">
                <p className="mt-4 flex flex-wrap items-baseline gap-x-1.5 max-lg:mt-0 short:lg:mt-2">
                  {prices[key] === tier.amount && (
                    <span className={`text-lg line-through max-lg:text-sm ${featured ? "text-blue-200" : "text-slate-400"}`}>
                      {euros(tier.listAmount)}&nbsp;€
                    </span>
                  )}
                  <span className={`font-display text-5xl font-semibold tracking-tight max-lg:text-2xl short:lg:text-3xl ${featured ? "text-white" : "text-slate-900"}`}>
                    {euros(prices[key])}&nbsp;€
                  </span>
                  <span className={`text-sm max-lg:text-xs ${featured ? "text-blue-100" : "text-slate-500"}`}>/mois</span>
                </p>
                <p className={`mt-1 text-xs max-lg:mt-0 max-lg:text-[11px] max-sm:hidden ${featured ? "text-blue-100" : "text-slate-500"}`}>
                  {trialAvailable
                    ? <>0 € aujourd&rsquo;hui · premier prélèvement le {firstChargeDate}</>
                    : "Prélevé dès aujourd’hui, puis chaque mois"}
                </p>
                </div>

                <form action={startTierCheckout} className="mt-6 max-lg:mt-0 max-lg:shrink-0 lg:mt-5 short:lg:mt-3">
                  <input type="hidden" name="tier" value={key} />
                  <SubmitButton
                    disabled={!paymentsReady || paymentFailed}
                    pendingText="Redirection vers le paiement…"
                    className={
                      featured
                        ? "w-full rounded-full bg-[length:200%_100%] bg-[linear-gradient(115deg,#ffffff_35%,#dbeafe_50%,#ffffff_65%)] py-3 text-sm font-semibold text-blue-700 shadow-sm transition animate-[shineSweep_2.5s_linear_infinite] hover:bg-blue-50 max-lg:w-auto max-lg:px-4 max-lg:py-2.5 short:lg:py-2.5"
                        : "w-full rounded-full bg-blue-600 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 max-lg:w-auto max-lg:px-4 max-lg:py-2.5 short:lg:py-2.5"
                    }
                  >
                    <span className="max-lg:hidden">{trialAvailable ? `Commencer mes ${TRIAL_DAYS} jours gratuits` : "Choisir cette offre"}</span>
                    <span className="lg:hidden">{trialAvailable ? `${TRIAL_DAYS} jours gratuits` : "Choisir"}</span>
                  </SubmitButton>
                </form>
                </div>
                <p
                  className={`mt-2.5 flex items-center justify-center gap-1.5 text-xs max-lg:hidden short:hidden ${featured ? "text-blue-100" : "text-slate-500"}`}
                >
                  <ShieldCheck className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                  Sans engagement · annulable à tout moment
                </p>

                <ul className={`mt-6 space-y-2.5 border-t pt-6 text-sm max-sm:hidden max-lg:mt-2 max-lg:grid max-lg:grid-cols-2 max-lg:gap-x-5 max-lg:gap-y-1 max-lg:space-y-0 max-lg:pt-2 max-lg:text-[13px] short:mt-2 short:space-y-0.5 short:pt-2 short:text-[13px] ${featured ? "border-blue-500 text-blue-50" : "border-slate-100 text-slate-700"}`}>
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

        <p className="mx-auto mt-10 max-w-2xl text-center text-xs leading-relaxed text-slate-500 max-lg:mt-4 max-sm:text-[11px] max-sm:leading-snug lg:mt-6 short:mt-4 short:lg:mt-3 short:lg:max-w-4xl">
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
          <span className="max-sm:short:hidden">Vous pourrez changer ou annuler votre offre à tout moment depuis vos paramètres.</span>
        </p>
      </div>
      </div>
    </main>
  );
}
