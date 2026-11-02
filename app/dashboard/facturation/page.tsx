import { createClient } from "@/lib/supabase/server";
import { isMissingStripeObject, refreshConnectStatus } from "@/lib/billing/connectStatus";
import { upsertConnectAccount } from "@/lib/db/admin";
import { loadKineBillingData } from "@/lib/billing/kineBillingData";
import FacturationView, { type CabinetInfo, type ConnectStatus } from "./FacturationView";
import { cabinetView } from "@/lib/db/admin";
import { requireApprovedInstructor } from "@/lib/dashboard/requireApprovedInstructor";

// « Suivi & facturation » : programmes du mois, tarif du kiné, paiements,
// documents, abonnement EasyPhysio (durée, cabinet). L'affichage vit
// dans FacturationView.tsx, les données dans lib/billing/kineBillingData.ts.
export default async function FacturationPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string; moyen?: string }>;
}) {
  const { error, saved, moyen } = await searchParams;
  const supabase = await createClient();
  // Validation du compte vérifiée ICI aussi (audit du 2026-10-08) : le
  // layout ne se ré-exécute pas à chaque navigation (doc Next.js 16).
  const { user } = await requireApprovedInstructor(supabase);

  // Cabinet (migration 0078) : sans elle, la section reste cachée.
  let cabinet: CabinetInfo = { ready: false, meId: user.id, links: [] };
  try {
    cabinet = { ready: true, meId: user.id, links: await cabinetView(user.id) };
  } catch (err) {
    console.error("[facturation] cabinet illisible (migration 0078 appliquée ?) :", err);
  }
  const cabinetKines = 1 + cabinet.links.filter((l) => l.payer_id === user.id && l.status === "active").length;

  const [{ data: connect }, data] = await Promise.all([
    supabase
      .from("instructor_connect_accounts")
      .select("status, stripe_connect_account_id")
      .eq("instructor_id", user.id)
      .maybeSingle(),
    loadKineBillingData(supabase, user.id, new Date(), cabinetKines),
  ]);

  let connectStatus = ((connect?.status as string | null) ?? "not_started") as ConnectStatus;
  // Le statut stocké peut être en retard sur Stripe (webhook manqué) : tant
  // qu'il n'est pas « active », on relit le compte chez Stripe à chaque visite.
  const accountId = (connect?.stripe_connect_account_id as string | null) ?? null;
  // Relu aussi quand il est « actif » : un compte créé en mode test n'existe
  // pas en mode réel — on le repasse alors à « non commencé » pour que le kiné
  // reconnecte Stripe (et qu'aucun patient ne soit envoyé vers un compte mort).
  if (accountId) {
    try {
      connectStatus = await refreshConnectStatus(user.id, accountId);
    } catch (err) {
      if (isMissingStripeObject(err)) {
        connectStatus = "not_started";
        try {
          await upsertConnectAccount({ instructorId: user.id, stripeConnectAccountId: accountId, status: "not_started" });
        } catch (dbErr) {
          console.error("[facturation] statut Stripe non remis à zéro :", dbErr);
        }
      } else {
        console.error("[facturation] resynchronisation du compte Stripe impossible :", err);
      }
    }
  }

  return <FacturationView data={data} connectStatus={connectStatus} error={error} saved={saved} notice={moyen} cabinet={cabinet} />;
}
