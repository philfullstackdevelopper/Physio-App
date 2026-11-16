import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { requireApprovedInstructor } from "@/lib/dashboard/requireApprovedInstructor";
import { cabinetInviteToken, cabinetView } from "@/lib/db/cabinets";
import { requestOrigin } from "@/lib/requestOrigin";
import CabinetView from "./CabinetView";

export async function generateMetadata() {
  const t = await getTranslations("dashboard.cabinet");
  return { title: t("title") };
}

// « Mon cabinet » (Philippe, 2026-11-08, migration 0085) : les kinés du même
// cabinet, les demandes à valider, et le partage des exercices.
export default async function CabinetPage() {
  const supabase = await createClient();
  const { user } = await requireApprovedInstructor(supabase);
  const [view, { data: profile }] = await Promise.all([
    cabinetView(user.id),
    supabase.from("instructors").select("cabinet_name, cabinet_address").eq("id", user.id).maybeSingle(),
  ]);
  // Lien d'invitation (0091) : seulement pour un membre actif ; créé au besoin.
  const token = view?.me.status === "active" ? await cabinetInviteToken(user.id).catch(() => null) : null;
  const inviteUrl = token ? `${await requestOrigin()}/cabinet/${token}` : null;
  return (
    <CabinetView
      meId={user.id}
      view={view}
      inviteUrl={inviteUrl}
      suggestedName={(profile?.cabinet_name as string | null) ?? ""}
      suggestedAddress={(profile?.cabinet_address as string | null) ?? ""}
    />
  );
}
