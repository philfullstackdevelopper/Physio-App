import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { STAGE_LABELS, type InjuryStage } from "@/lib/exercise/prescription";
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

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
  const templates = (templatesData ?? []) as {
    id: string;
    name: string;
    stage: string | null;
    condition_id: string | null;
  }[];

  return (
    <main className="min-h-screen bg-slate-50 p-6 sm:p-8">
      <div className="mx-auto max-w-2xl">
        <Link href="/dashboard" className="text-sm text-slate-500 hover:underline">
          ← Tableau de bord
        </Link>
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
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <select
                name="condition_id"
                required
                defaultValue=""
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
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
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
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
            className="mt-3 rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
          >
            Créer et composer
          </button>
        </form>

        {/* My séances */}
        <h2 className="mt-8 text-lg font-medium text-slate-900">Mes séances personnalisées</h2>
        <div className="mt-3 rounded-xl bg-white p-2 shadow-sm">
          {seances.length === 0 ? (
            <p className="p-6 text-center text-sm text-slate-500">
              Aucune séance personnalisée pour le moment. Créez-en une ci-dessus, ou
              dupliquez un modèle ci-dessous.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {seances.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/dashboard/seances/${s.id}`}
                    className="flex items-center justify-between px-4 py-3 hover:bg-slate-50"
                  >
                    <div>
                      <p className="font-medium text-slate-900">{s.name}</p>
                      <p className="text-sm text-slate-500">
                        {conditionName(s.condition_id) ?? "—"}
                        {s.stage && <span> · {STAGE_LABELS[s.stage as InjuryStage]}</span>}
                        <span className="text-slate-400"> · {s.workout_exercises?.[0]?.count ?? 0} exercices</span>
                      </p>
                    </div>
                    <span className="text-slate-400">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Platform séances — visible to all, not editable; duplicate to customise */}
        <h2 className="mt-8 text-lg font-medium text-slate-900">Séances prévues (plateforme)</h2>
        <p className="mt-1 text-sm text-slate-500">
          Déjà disponibles pour tous les kinés. Dupliquez-en une pour en faire votre
          propre version modifiable.
        </p>
        <div className="mt-3 rounded-xl bg-white p-2 shadow-sm">
          {templates.length === 0 ? (
            <p className="p-6 text-center text-sm text-slate-500">Aucun modèle disponible.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {templates.map((t) => (
                <li key={t.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="font-medium text-slate-900">{t.name}</p>
                    <p className="text-sm text-slate-500">
                      {conditionName(t.condition_id) ?? "—"}
                      {t.stage && <span> · {STAGE_LABELS[t.stage as InjuryStage]}</span>}
                    </p>
                  </div>
                  <form action={duplicateSeance}>
                    <input type="hidden" name="template_id" value={t.id} />
                    <button
                      type="submit"
                      className="rounded-md border border-teal-600 px-3 py-1.5 text-sm font-medium text-teal-700 hover:bg-teal-50"
                    >
                      Dupliquer
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
