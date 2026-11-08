import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { canInvitePatients } from "@/lib/launch";
import { isPickableSeance } from "@/lib/exercise/filmedExercises";
import { STAGE_ORDER } from "@/lib/exercise/levelStep";
import { PHASE_NUMBER, isStage } from "@/lib/exercise/phasePlan";
import { addPatient } from "../actions";
import JoinQrCard from "@/components/JoinQrCard";
import NewPatientView from "@/components/NewPatientView";
import { getTranslations } from "next-intl/server";

export default async function NewPatientPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  // Avant le lancement, les invitations sont fermées (lib/launch.ts) : le
  // formulaire reste visible, pour montrer comment ça marchera, mais éteint.
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const open = canInvitePatients(user.email);
  const t = await getTranslations("dashboard.newPatient");

  // « Première séance (facultatif) » : les séances de la plateforme et du
  // kiné (jamais les copies d'un patient), par pathologie puis par phase.
  const { data: rows } = await supabase
    .from("workouts")
    .select("id, name, stage, created_by, conditions(name), workout_exercises(exercises(name))")
    .is("patient_id", null)
    .or(`created_by.is.null,created_by.eq.${user.id}`);
  const rank = (s: string | null) => (isStage(s) ? STAGE_ORDER.indexOf(s) : 99);
  const groups = new Map<string, { id: string; label: string; rank: number }[]>();
  for (const w of rows ?? []) {
    if (!isPickableSeance(w as Parameters<typeof isPickableSeance>[0])) continue;
    const condition = (w.conditions as unknown as { name: string } | null)?.name ?? t("otherSessions");
    const stage = w.stage as string | null;
    const label = isStage(stage) ? t("phaseSession", { n: PHASE_NUMBER[stage], name: w.name as string }) : (w.name as string);
    groups.set(condition, [...(groups.get(condition) ?? []), { id: w.id as string, label, rank: rank(stage) }]);
  }
  const seanceGroups = [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b, "fr"))
    .map(([condition, list]) => ({
      condition,
      seances: list.sort((a, b) => a.rank - b.rank || a.label.localeCompare(b.label, "fr")).map(({ id, label }) => ({ id, label })),
    }));

  return (
    <NewPatientView
      open={open}
      error={error}
      addPatientAction={addPatient}
      seanceGroups={seanceGroups}
      qr={<JoinQrCard instructorId={user.id} open={open} />}
    />
  );
}
