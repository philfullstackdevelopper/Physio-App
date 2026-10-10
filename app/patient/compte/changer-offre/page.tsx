import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { resolveTierPrices, type InstructorTierPriceRow, type TierKey } from "@/lib/billing/plans";
import { changeTier } from "./actions";
import ChangerOffreView from "./ChangerOffreView";

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
  return <ChangerOffreView currentTier={currentTier} prices={prices} error={error} changeTier={changeTier} />;
}
