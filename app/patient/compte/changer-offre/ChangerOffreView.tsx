import Link from "next/link";
import { ArrowLeft, Check, ShieldCheck, Sparkles } from "lucide-react";
import { TIERS, TIER_KEYS, type TierKey } from "@/lib/billing/plans";
import { HIGHLIGHT, featuresFor } from "@/lib/billing/tierCopy";

const euros = (cents: number) => (cents / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2 });

// Affichage seul de « Changer d'offre » (les données viennent de page.tsx) —
// séparé pour pouvoir le prévisualiser avec des données fictives sans
// connexion (/prototypes/patient-ecrans?ecran=changer-offre).
//
// Audit des formats d'écran (2026-10-10) : la page défilait de 1 000 à
// 1 600 px sur téléphone, débordait à droite sur iPad et dépassait de 310 px
// sur le PC de Philippe. Mêmes éléments qu'avant, re-présentés pour tenir sur
// un écran :
//  - téléphone : une carte compacte par offre (nom, atout, prix à gauche,
//    bouton à droite) — la liste détaillée n'apparaît que dès la tablette ;
//  - tablette (sous 1024 px) : mêmes cartes compactes, avec la liste en ligne ;
//  - écran peu haut : marges et liste resserrées.
export default function ChangerOffreView({
  currentTier,
  prices,
  error,
  changeTier,
}: {
  currentTier: TierKey | null;
  prices: Record<TierKey, number>;
  error?: string;
  changeTier: (formData: FormData) => void | Promise<void>;
}) {
  const currentRank = currentTier ? TIER_KEYS.indexOf(currentTier) : -1;

  return (
    <main className="flex flex-col bg-[#f6f8fd] p-6 max-sm:min-h-[calc(100dvh-var(--phone-chrome))] max-sm:p-4 max-sm:short:py-2 sm:min-h-dvh sm:p-8 sm:max-lg:py-4 short:sm:py-3">
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col sm:justify-center">
        <Link href="/patient/compte" className="inline-flex items-center gap-1.5 self-start text-sm font-medium text-muted hover:text-ink">
          <ArrowLeft className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          Retour à mes paramètres
        </Link>

        <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-slate-900 max-lg:mt-2 max-lg:text-2xl short:mt-1 short:text-2xl">
          Changer d&rsquo;offre
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600 max-sm:mt-1 max-sm:text-xs max-sm:short:hidden phone-land:hidden short:mt-1 short:sm:max-w-none">
          Le changement est immédiat. La différence de prix est ajustée au prorata sur votre prochaine facture — pas
          de nouvel essai gratuit, pas de nouvelle carte à saisir.
        </p>

        {error && <p className="mt-4 rounded-xl bg-danger-soft p-3 text-sm text-danger short:mt-2">{error}</p>}

        <div className="mt-8 grid items-stretch gap-5 max-lg:mt-3 max-lg:gap-2.5 lg:grid-cols-3 phone-land:grid-cols-3 short:mt-5 short:sm:gap-4">
          {TIER_KEYS.map((key, rank) => {
            const tier = TIERS[key];
            const isCurrent = key === currentTier;
            const isUpgrade = currentRank >= 0 && rank > currentRank;
            const isNearestUpgrade = isUpgrade && rank === currentRank + 1;
            const isLaunchPrice = prices[key] === tier.amount;

            return (
              <section
                key={key}
                className={`relative flex h-full flex-col rounded-3xl p-7 max-lg:rounded-2xl max-lg:p-4 short:sm:p-5 ${
                  isUpgrade
                    ? "bg-blue-600 text-white shadow-xl shadow-blue-900/20 ring-1 ring-blue-700 lg:animate-[floatY_4s_ease-in-out_infinite]"
                    : isCurrent
                      ? "border border-slate-200 bg-slate-50"
                      : "border border-slate-200 bg-white"
                }`}
                // Décalage de la flottaison entre Standard et Premium : les deux
                // sont "upgrade" ici (le patient est sur l'offre la plus basse),
                // les faire flotter en même temps donnerait un effet de
                // synchronisation artificielle plutôt que "vivant" (Philippe,
                // 2026-09-13 : « les faire bouger de haut en bas »).
                style={isUpgrade ? { animationDelay: `${rank * 0.7}s` } : undefined}
              >
                {isNearestUpgrade && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-slate-900 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white max-lg:-top-2.5 max-lg:left-auto max-lg:right-3 max-lg:translate-x-0 max-lg:px-2.5 max-lg:py-0.5 max-lg:text-[10px]">
                    Offre recommandée
                  </span>
                )}
                {isCurrent && (
                  <span className="inline-flex items-center gap-1 self-start rounded-full bg-slate-200 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600 max-lg:absolute max-lg:-top-2.5 max-lg:right-3 max-lg:text-[10px]">
                    <Check className="h-3 w-3" strokeWidth={3} />
                    Votre offre actuelle
                  </span>
                )}

                <h2 className={`mt-3 font-display text-xl font-semibold max-lg:mt-0 max-lg:text-lg short:sm:mt-1 ${isUpgrade ? "text-white" : isCurrent ? "text-slate-600" : "text-slate-900"}`}>
                  {tier.label}
                </h2>

                <p
                  className={`mt-1.5 flex items-center gap-1.5 text-sm font-medium max-lg:mt-0.5 max-lg:text-xs max-sm:short:hidden short:sm:mt-0.5 ${
                    isUpgrade ? "text-blue-50" : isCurrent ? "text-slate-400" : "text-blue-700"
                  }`}
                >
                  <Sparkles className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                  {HIGHLIGHT[key]}
                </p>

                {/* Offre de lancement : même bandeau barré que /patient/abonnement,
                    uniquement si le kiné n'a pas fixé son propre tarif. Masqué
                    sur téléphone et écran peu haut : le prix barré le dit déjà. */}
                {isLaunchPrice && (
                  <span
                    className={`mt-4 inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wide max-lg:hidden whitespace-nowrap short:hidden ${
                      isUpgrade ? "bg-white/15 text-white" : "bg-red-50 text-red-600"
                    }`}
                  >
                    Offre de lancement · -50&nbsp;%
                  </span>
                )}

                {/* Téléphone : prix à gauche, bouton à droite sur la même ligne. */}
                <div className="max-lg:mt-2 max-lg:flex max-lg:items-center max-lg:justify-between max-lg:gap-3 phone-land:flex-col phone-land:items-start phone-land:gap-2">
                  <p className="mt-4 flex flex-wrap items-baseline gap-x-1.5 max-lg:mt-0 short:sm:mt-2">
                    {isLaunchPrice && (
                      <span className={`text-lg line-through max-lg:text-sm ${isUpgrade ? "text-blue-200" : "text-slate-400"}`}>
                        {euros(tier.listAmount)}&nbsp;€
                      </span>
                    )}
                    <span className={`font-display text-4xl font-semibold tracking-tight max-lg:text-2xl short:sm:text-3xl ${isUpgrade ? "text-white" : isCurrent ? "text-slate-600" : "text-slate-900"}`}>
                      {euros(prices[key])}&nbsp;€
                    </span>
                    <span className={`text-sm max-lg:text-xs ${isUpgrade ? "text-blue-100" : "text-slate-500"}`}>/mois</span>
                  </p>

                  {isCurrent ? (
                    <button
                      type="button"
                      disabled
                      className="mt-6 w-full cursor-default rounded-full border border-slate-300 py-2.5 text-sm font-medium text-slate-500 max-lg:mt-0 max-lg:w-auto max-lg:shrink-0 max-lg:px-4 max-lg:py-2 short:sm:mt-3 short:sm:py-2"
                    >
                      Offre actuelle
                    </button>
                  ) : (
                    <form action={changeTier} className="max-lg:shrink-0">
                      <input type="hidden" name="tier" value={key} />
                      <button
                        type="submit"
                        className={`max-lg:mt-0 max-lg:w-auto max-lg:px-4 max-lg:py-2 short:sm:mt-3 short:sm:py-2 ${
                          isUpgrade
                            ? "mt-6 w-full rounded-full bg-[length:200%_100%] bg-[linear-gradient(115deg,#ffffff_35%,#dbeafe_50%,#ffffff_65%)] py-2.5 text-sm font-semibold text-blue-700 shadow-sm transition animate-[shineSweep_2.5s_linear_infinite] hover:bg-blue-50"
                            : "mt-6 w-full rounded-full border border-slate-300 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                        }`}
                      >
                        <span className="lg:hidden">{isUpgrade ? "Choisir" : "Rétrograder"}</span>
                        <span className="max-lg:hidden">{isUpgrade ? "Passer à cette offre" : "Rétrograder vers cette offre"}</span>
                      </button>
                    </form>
                  )}
                </div>

                <ul
                  className={`mt-6 flex-1 space-y-2.5 border-t pt-6 text-sm max-sm:hidden max-lg:mt-2 max-lg:grid max-lg:flex-none max-lg:grid-cols-2 max-lg:gap-x-5 max-lg:gap-y-1 max-lg:space-y-0 phone-land:hidden max-lg:pt-2 max-lg:text-[13px] short:mt-3 short:space-y-1 short:pt-3 short:text-[13px] ${
                    isUpgrade ? "border-blue-500 text-blue-50" : isCurrent ? "border-slate-200 text-slate-500" : "border-slate-100 text-slate-700"
                  }`}
                >
                  {featuresFor(key).map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <span
                        className={`mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full ${
                          isUpgrade ? "bg-white/20" : isCurrent ? "bg-slate-200" : "bg-blue-50"
                        }`}
                      >
                        <Check className={`h-3 w-3 ${isUpgrade ? "text-white" : isCurrent ? "text-slate-500" : "text-blue-700"}`} strokeWidth={3} />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>

        <p className="mx-auto mt-8 flex max-w-xl items-center justify-center gap-1.5 text-center text-xs text-slate-500 max-lg:mt-3 short:mt-3">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
          Paiement sécurisé par Stripe · sans engagement, annulable à tout moment
        </p>
      </div>
    </main>
  );
}
