import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { STAGE_LABELS, type InjuryStage } from "@/lib/exercise/prescription";
import SeancesTabs from "@/components/SeancesTabs";
import { createSeance, duplicateSeance } from "./actions";

const STAGES = Object.entries(STAGE_LABELS) as [InjuryStage, string][];

type OwnSeance = {
  id: string;
  name: string;
  stage: string | null;
  condition_id: string | null;
  workout_exercises: { count: number }[];
};

export default async function SeancesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  const supabase = await createClient();
  const user = await requireUser(supabase);

  const { data: conditions } = await supabase.from("conditions").select("id, name").order("name");
  const conditionName = (cid: string | null) => conditions?.find((c) => c.id === cid)?.name;

  // Séances created by this instructor.
  const { data: mine } = await supabase
    .from("workouts")
    .select("id, name, stage, condition_id, workout_exercises(count)")
    .eq("created_by", user.id)
    .order("created_at", { ascending: false });
  const seances = (mine ?? []) as unknown as OwnSeance[];

  // Platform séances the instructor can duplicate as a starting point.
  const { data: templatesData } = await supabase
    .from("workouts")
    .select("id, name, stage, condition_id")
    .is("created_by", null)
    .order("name");
  const rawTemplates = (templatesData ?? []) as {
    id: string;
    name: string;
    stage: string | null;
    condition_id: string | null;
  }[];

  // Group by condition (what a kiné actually scans for), then by phase order
  // within each condition — not insertion/seed order, which scattered the
  // same condition's phases across the list.
  const stageOrder = new Map<string, number>(STAGES.map(([value], i) => [value, i]));
  const templates = [...rawTemplates].sort((a, b) => {
    const condCompare = (conditionName(a.condition_id) ?? "").localeCompare(
      conditionName(b.condition_id) ?? "",
      "fr",
    );
    if (condCompare !== 0) return condCompare;
    const aOrder = a.stage ? (stageOrder.get(a.stage) ?? 99) : 99;
    const bOrder = b.stage ? (stageOrder.get(b.stage) ?? 99) : 99;
    return aOrder - bOrder;
  });

  return (
    <main className="min-h-screen bg-slate-50 p-6 sm:p-8">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="text-sm text-slate-500 hover:underline">
            ← Tableau de bord
          </Link>
          <Link href="/dashboard/exercises" className="text-sm font-medium text-blue-700 hover:underline">
            Gérer mes exercices →
          </Link>
        </div>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">Mes séances</h1>
        <p className="mt-1 text-sm text-slate-500">
          Composez vos propres séances ; elles seront proposées aux patients de la phase choisie.
        </p>

        {error && <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        {/* Create a new séance */}
        <form
          action={createSeance}
          className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <h2 className="text-sm font-semibold text-slate-900">Nouvelle séance</h2>
          <div className="mt-3 flex flex-col gap-3">
            <input
              name="name"
              required
              placeholder="Nom de la séance"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-600 focus:outline-none"
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <select
                name="condition_id"
                required
                defaultValue=""
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-600 focus:outline-none"
              >
                <option value="" disabled>
                  Condition…
                </option>
                {conditions?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <select
                name="stage"
                defaultValue=""
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-600 focus:outline-none"
              >
                <option value="">Phase (toutes)</option>
                {STAGES.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button
            type="submit"
            className="mt-3 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Créer et composer
          </button>
        </form>

        <SeancesTabs
          mine={seances.map((s) => ({
            id: s.id,
            name: s.name,
            conditionName: conditionName(s.condition_id),
            stageLabel: s.stage ? STAGE_LABELS[s.stage as InjuryStage] : undefined,
            extra: `${s.workout_exercises?.[0]?.count ?? 0} exercices`,
          }))}
          templates={templates.map((t) => ({
            id: t.id,
            name: t.name,
            conditionName: conditionName(t.condition_id),
            stageLabel: t.stage ? STAGE_LABELS[t.stage as InjuryStage] : undefined,
          }))}
          duplicateSeance={duplicateSeance}
        />
      </div>
    </main>
  );
}
