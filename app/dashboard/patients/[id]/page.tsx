import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { assignCondition } from "./actions";

type ProgramRow = {
  id: string;
  frequency: string | null;
  exercises: { name: string; instructions: string | null } | null;
};

export default async function PatientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // RLS makes this return null if the patient isn't one of this instructor's.
  const { data: patient } = await supabase
    .from("patients")
    .select("id, full_name, email, condition_id")
    .eq("id", id)
    .maybeSingle();

  if (!patient) redirect("/dashboard/patients");

  const { data: conditions } = await supabase
    .from("conditions")
    .select("id, name")
    .order("name");

  const { data: programData } = await supabase
    .from("programs")
    .select("id, frequency, exercises ( name, instructions )")
    .eq("patient_id", id);

  const program = (programData ?? []) as unknown as ProgramRow[];
  const currentConditionName = conditions?.find((c) => c.id === patient.condition_id)?.name;

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-2xl">
        <Link href="/dashboard/patients" className="text-sm text-gray-500 hover:underline">
          ← Mes patients
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-gray-900">{patient.full_name}</h1>
        <p className="text-sm text-gray-500">{patient.email}</p>

        {error && (
          <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>
        )}

        {/* Assign a condition */}
        <section className="mt-8 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-medium text-gray-900">Condition assignée</h2>
          <p className="mt-1 text-sm text-gray-500">
            {currentConditionName
              ? `Condition actuelle : ${currentConditionName}`
              : "Aucune condition assignée pour l'instant."}
          </p>

          <form action={assignCondition} className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input type="hidden" name="patient_id" value={patient.id} />
            <select
              name="condition_id"
              defaultValue={patient.condition_id ?? ""}
              required
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-gray-900 focus:outline-none"
            >
              <option value="" disabled>
                Choisir une condition…
              </option>
              {conditions?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-md bg-gray-900 px-4 py-2 font-medium text-white hover:bg-gray-800"
            >
              Assigner le programme
            </button>
          </form>
          <p className="mt-2 text-xs text-gray-400">
            Assigner une condition remplit automatiquement le programme du patient avec les
            exercices correspondants.
          </p>
        </section>

        {/* Current program */}
        <section className="mt-6 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-medium text-gray-900">Programme d&apos;exercices</h2>
          {program.length === 0 ? (
            <p className="mt-2 text-sm text-gray-500">
              Aucun exercice pour le moment. Assignez une condition ci-dessus.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-gray-100">
              {program.map((p) => (
                <li key={p.id} className="py-3">
                  <p className="font-medium text-gray-900">{p.exercises?.name}</p>
                  {p.frequency && (
                    <p className="text-sm text-gray-500">Fréquence : {p.frequency}</p>
                  )}
                  {p.exercises?.instructions && (
                    <p className="mt-1 text-sm text-gray-500">{p.exercises.instructions}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
