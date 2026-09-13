import Link from "next/link";
import { ArrowLeft, Check, ShieldCheck, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { TIERS, TIER_KEYS, resolveTierPrices, type InstructorTierPriceRow, type TierKey } from "@/lib/billing/plans";
import { HIGHLIGHT, featuresFor } from "@/lib/billing/tierCopy";
import { changeTier } from "./actions";

const euros = (cents: number) => (cents / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2 });

// Changer d'offre un abonnement déjà actif — Philippe, 2026-09-11, depuis
// /patient/compte. Reprend le langage visuel de /patient/abonnement (mêmes
// couleurs, même bandeau "Offre de lancement" barré) plutôt que des cartes
// nues : sinon les deux pages se contredisent sur ce que chaque offre coûte
// et apporte.
//
// Les offres au-dessus de l'offre actuelle du patient reprennent le remplissage
// bleu plein de la carte "featured" de la page de base (au lieu du seul liseré)
// pour ressortir clairement comme plus intéressantes (Philippe, 2026-09-11 :
// « si le client est sur le palier le plus bas, les deux autres doivent
// ressortir comme plus intéressantes »). Une offre en dessous (rétrogradation)
// reste disponible mais visuellement en retrait. Les trois cartes gardent la
// même taille (grille en `items-stretch`, pas de `scale`) — seule la couleur
// porte la hiérarchie, pas le gabarit (Philippe, 2026-09-11 : « les boîtes
// blanches doivent toutes être de la même taille »).
export default async function ChangerOffrePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const { data: patient } = await supabase.from("patients").select("instructor_id").eq("id", user.id).maybeSingle();
  const instructorId = (patient?.instructor_id as string | null) ?? null;

  const [{ data: kine }, { data: sub }] = await Promise.all([
    instructorId
      ? supabase
          .from("instructors")
          .select("tier_essentiel_cents, tier_standard_cents, tier_premium_cents")
          .eq("id", instructorId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("subscriptions").select("plan").eq("user_id", user.id).maybeSingle(),
  ]);

  const prices = resolveTierPrices(kine as InstructorTierPriceRow | null);
  const currentTier = (sub?.plan as TierKey | null) ?? null;
  const currentRank = currentTier ? TIER_KEYS.indexOf(currentTier) : -1;

  return (
    <main className="min-h-screen bg-[#f6f8fd] p-6 sm:p-8">
      <div className="mx-auto max-w-5xl">
        <Link href="/patient/compte" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
          <ArrowLeft className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          Retour à mes paramètres
        </Link>

        <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-slate-900">Changer d&rsquo;offre</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600">
          Le changement est immédiat. La différence de prix est ajustée au prorata sur votre prochaine facture — pas
          de nouvel essai gratuit, pas de nouvelle carte à saisir.
        </p>

        {error && <p className="mt-4 rounded-xl bg-danger-soft p-3 text-sm text-danger">{error}</p>}

        <div className="mt-8 grid items-stretch gap-5 sm:grid-cols-3">
          {TIER_KEYS.map((key, rank) => {
            const tier = TIERS[key];
            const isCurrent = key === currentTier;
            const isUpgrade = currentRank >= 0 && rank > currentRank;
            const isNearestUpgrade = isUpgrade && rank === currentRank + 1;
            const isLaunchPrice = prices[key] === tier.amount;

            return (
              <section
                key={key}
                className={`relative flex h-full flex-col rounded-3xl p-7 ${
                  isUpgrade
                    ? "bg-blue-600 text-white shadow-xl shadow-blue-900/20 ring-1 ring-blue-700 sm:animate-[floatY_4s_ease-in-out_infinite]"
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
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-slate-900 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
                    Offre recommandée
                  </span>
                )}
                {isCurrent && (
                  <span className="inline-flex items-center gap-1 self-start rounded-full bg-slate-200 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                    <Check className="h-3 w-3" strokeWidth={3} />
                    Votre offre actuelle
                  </span>
                )}

                <h2 className={`mt-3 font-display text-xl font-semibold ${isUpgrade ? "text-white" : isCurrent ? "text-slate-600" : "text-slate-900"}`}>
                  {tier.label}
                </h2>

                <p
                  className={`mt-1.5 flex items-center gap-1.5 text-sm font-medium ${
                    isUpgrade ? "text-blue-50" : isCurrent ? "text-slate-400" : "text-blue-700"
                  }`}
                >
                  <Sparkles className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                  {HIGHLIGHT[key]}
                </p>

                {/* Offre de lancement : même bandeau barré que /patient/abonnement,
                    uniquement si le kiné n'a pas fixé son propre tarif. */}
                {isLaunchPrice && (
                  <span
                    className={`mt-4 inline-flex w-fit items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wide ${
                      isUpgrade ? "bg-white/15 text-white" : "bg-red-50 text-red-600"
                    }`}
                  >
                    Offre de lancement · -50&nbsp;%
                  </span>
                )}

                <p className="mt-4 flex items-baseline gap-1.5">
                  {isLaunchPrice && (
                    <span className={`text-lg line-through ${isUpgrade ? "text-blue-200" : "text-slate-400"}`}>
                      {euros(tier.listAmount)}&nbsp;€
                    </span>
                  )}
                  <span className={`font-display text-4xl font-semibold tracking-tight ${isUpgrade ? "text-white" : isCurrent ? "text-slate-600" : "text-slate-900"}`}>
                    {euros(prices[key])}&nbsp;€
                  </span>
                  <span className={`text-sm ${isUpgrade ? "text-blue-100" : "text-slate-500"}`}>/mois</span>
                </p>

                {isCurrent ? (
                  <button
                    type="button"
                    disabled
                    className="mt-6 w-full cursor-default rounded-full border border-slate-300 py-2.5 text-sm font-medium text-slate-500"
                  >
                    Offre actuelle
                  </button>
                ) : (
                  <form action={changeTier}>
                    <input type="hidden" name="tier" value={key} />
                    <button
                      type="submit"
                      className={
                        isUpgrade
                          ? "mt-6 w-full rounded-full bg-[length:200%_100%] bg-[linear-gradient(115deg,#ffffff_35%,#dbeafe_50%,#ffffff_65%)] py-2.5 text-sm font-semibold text-blue-700 shadow-sm transition animate-[shineSweep_2.5s_linear_infinite] hover:bg-blue-50"
                          : "mt-6 w-full rounded-full border border-slate-300 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                      }
                    >
                      {isUpgrade ? "Passer à cette offre" : "Rétrograder vers cette offre"}
                    </button>
                  </form>
                )}

                <ul
                  className={`mt-6 flex-1 space-y-2.5 border-t pt-6 text-sm ${
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

        <p className="mx-auto mt-8 flex max-w-xl items-center justify-center gap-1.5 text-center text-xs text-slate-500">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
          Paiement sécurisé par Stripe · sans engagement, annulable à tout moment
        </p>
      </div>
    </main>
  );
}
