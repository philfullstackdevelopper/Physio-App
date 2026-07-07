import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function PatientsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: patients } = await supabase
    .from("patients")
    .select("id, full_name, email, created_at")
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between">
          <div>
            <Link href="/dashboard" className="text-sm text-gray-500 hover:underline">
              ← Tableau de bord
            </Link>
            <h1 className="mt-1 text-2xl font-semibold text-gray-900">Mes patients</h1>
          </div>
          <Link
            href="/dashboard/patients/new"
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            + Ajouter un patient
          </Link>
        </div>

        <div className="mt-8 rounded-xl bg-white p-2 shadow-sm">
          {!patients || patients.length === 0 ? (
            <p className="p-6 text-center text-sm text-gray-500">
              Aucun patient pour le moment. Cliquez sur « Ajouter un patient » pour commencer.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {patients.map((p) => (
                <li key={p.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="font-medium text-gray-900">{p.full_name}</p>
                    <p className="text-sm text-gray-500">{p.email}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
