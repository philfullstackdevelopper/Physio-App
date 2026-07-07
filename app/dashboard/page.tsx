import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signout } from "./actions";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Not logged in -> send to the login page.
  if (!user) {
    redirect("/login");
  }

  // Look up the instructor profile (may be null if this account is a patient).
  const { data: instructor } = await supabase
    .from("instructors")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Tableau de bord</h1>
          <form action={signout}>
            <button
              type="submit"
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              Se déconnecter
            </button>
          </form>
        </div>

        <div className="mt-8 rounded-xl bg-white p-6 shadow-sm">
          <p className="text-gray-900">
            Bonjour{instructor?.full_name ? `, ${instructor.full_name}` : ""} 👋
          </p>
          <p className="mt-2 text-sm text-gray-500">
            Vous êtes connecté ({user.email}).
          </p>
          <p className="mt-4 text-sm text-gray-400">
            La gestion des patients arrivera à la prochaine étape.
          </p>
        </div>
      </div>
    </main>
  );
}
