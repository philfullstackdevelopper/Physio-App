import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { STAGE_LABELS, type InjuryStage } from "@/lib/exercise/prescription";
import DocumentUpload, { type DocMeta } from "@/components/DocumentUpload";
import { saveOnboarding } from "./actions";

const STAGES = Object.entries(STAGE_LABELS) as [InjuryStage, string][];

// Shown once, right after a patient's first login (gated from /patient).
// Also reachable later via "Modifier ma situation" to change the condition/stage.
export default async function OnboardingPage({
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

  const { data: conditions } = await supabase
    .from("conditions")
    .select("id, name")
    .order("name");

  // Pre-fill if the patient is editing an existing profile.
  const { data: profile } = await supabase
    .from("patient_profiles")
    .select(
      "condition_id, injury_stage, rehab_progress, history, date_of_birth, height_cm, weight_kg, activity_level",
    )
    .eq("id", user.id)
    .maybeSingle();

  const { data: docs } = await supabase
    .from("patient_documents")
    .select("id, file_name, storage_path, uploaded_at")
    .eq("patient_id", user.id)
    .order("uploaded_at", { ascending: false });

  return (
    <main className="min-h-screen p-6 sm:p-8">
      <div className="mx-auto max-w-md">
        <h1 className="text-2xl font-semibold text-slate-900">Votre situation</h1>
        <p className="mt-1 text-sm text-slate-500">
          Dites-nous ce que vous traversez pour recevoir des séances adaptées.
          Vous pourrez le modifier à tout moment.
        </p>

        {error && (
          <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>
        )}

        <form
          action={saveOnboarding}
          className="mt-6 flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          {/* --- The situation (asked first) --- */}
          <label className="text-sm text-slate-600">
            Que traversez-vous ? (condition)
            <select
              name="condition_id"
              required
              defaultValue={profile?.condition_id ?? ""}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
            >
              <option value="" disabled>
                Choisir…
              </option>
              {conditions?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm text-slate-600">
            Où en êtes-vous ? (étape de récupération)
            <select
              name="injury_stage"
              required
              defaultValue={profile?.injury_stage ?? ""}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
            >
              <option value="" disabled>
                Choisir…
              </option>
              {STAGES.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm text-slate-600">
            Où en êtes-vous dans votre rééducation ? (optionnel)
            <input
              type="text"
              name="rehab_progress"
              placeholder="ex. 3 semaines après l'opération, je remarche sans béquilles"
              defaultValue={profile?.rehab_progress ?? ""}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
            />
          </label>

          <label className="text-sm text-slate-600">
            Que s&apos;est-il passé ? (optionnel)
            <textarea
              name="history"
              rows={3}
              placeholder="Décrivez votre blessure, vos douleurs, ce qui vous limite…"
              defaultValue={profile?.history ?? ""}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
            />
          </label>

          <hr className="border-slate-100" />
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Votre profil
          </p>

          <label className="text-sm text-slate-600">
            Date de naissance
            <input
              type="date"
              name="date_of_birth"
              required
              defaultValue={profile?.date_of_birth ?? ""}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm text-slate-600">
              Taille (cm)
              <input
                type="number" name="height_cm" min={100} max={230} required
                defaultValue={profile?.height_cm ?? ""}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
              />
            </label>
            <label className="text-sm text-slate-600">
              Poids (kg)
              <input
                type="number" name="weight_kg" min={20} max={250} required
                defaultValue={profile?.weight_kg ?? ""}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
              />
            </label>
          </div>

          <label className="text-sm text-slate-600">
            Niveau d&apos;activité physique
            <select
              name="activity_level"
              required
              defaultValue={profile?.activity_level ?? "moderate"}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
            >
              <option value="sedentary">Sédentaire (peu ou pas de sport)</option>
              <option value="moderate">Modérée (activité régulière)</option>
              <option value="active">Active (sport fréquent)</option>
            </select>
          </label>

          <button
            type="submit"
            className="mt-1 rounded-md bg-teal-600 px-4 py-2.5 font-medium text-white hover:bg-teal-700"
          >
            Enregistrer et continuer
          </button>
        </form>

        {/* Documents upload directly to private storage — separate from the form. */}
        <div className="mt-4">
          <DocumentUpload patientId={user.id} initialDocs={(docs ?? []) as DocMeta[]} />
        </div>
      </div>
    </main>
  );
}
