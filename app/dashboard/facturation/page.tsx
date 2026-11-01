import { createClient } from "@/lib/supabase/server";
import { refreshConnectStatus } from "@/lib/billing/connectStatus";
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
  if (accountId && connectStatus !== "active") {
    try {
      connectStatus = await refreshConnectStatus(user.id, accountId);
    } catch (err) {
      console.error("[facturation] resynchronisation du compte Stripe impossible :", err);
    }
  }

  return <FacturationView data={data} connectStatus={connectStatus} error={error} saved={saved} notice={moyen} cabinet={cabinet} />;
}
