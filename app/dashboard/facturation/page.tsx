import { CheckCircle2, Circle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { setPatientPrice, startConnectOnboarding } from "../connect/actions";

const euro = (cents: number) => (cents / 100).toFixed(0);

export default async function FacturationPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { error, saved } = await searchParams;
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const [{ data: kine }, { data: connect }] = await Promise.all([
    supabase.from("instructors").select("monthly_patient_price_cents").eq("id", user.id).maybeSingle(),
    supabase
      .from("instructor_connect_accounts")
      .select("status")
      .eq("instructor_id", user.id)
      .maybeSingle(),
  ]);

  const priceCents = kine?.monthly_patient_price_cents as number | null;
  const connectStatus = (connect?.status as string | null) ?? "not_started";

  return (
    <main className="mx-auto max-w-lg p-6 sm:p-8">
      <h1 className="text-2xl font-semibold text-slate-900">Tarif et paiements</h1>

      {error && (
        <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}
      {saved === "1" && (
        <p className="mt-4 flex items-center gap-1.5 rounded-md bg-teal-50 p-3 text-sm text-teal-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          Tarif enregistré.
        </p>
      )}

      <section className="mt-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <h2 className="font-medium text-slate-900">1. Votre tarif patient</h2>
        <p className="mt-2 text-sm text-slate-600">
          Vous fixez librement le tarif mensuel que vos patients vous paient (par exemple 40&nbsp;€).
          Ce paiement va directement sur votre propre compte, jamais chez Physio-App. En échange,
          vous payez à Physio-App 15&nbsp;% de ce tarif, par patient actif, calculé au prorata du
          nombre de jours du mois où le patient était suivi.
        </p>
        <p className="mt-2 rounded-md bg-slate-50 p-3 text-xs text-slate-500">
          Exemple : un patient à 40&nbsp;€/mois, actif 15 jours sur 30, vous coûte
          40&nbsp;€&nbsp;×&nbsp;15&nbsp;%&nbsp;×&nbsp;(15/30) = <strong>3&nbsp;€</strong> ce mois-là.
        </p>
        <form action={setPatientPrice} className="mt-4 flex items-end gap-3">
          <label className="flex-1 text-sm text-slate-600">
            Tarif mensuel par patient (€)
            <input
              type="number"
              name="price_euros"
              min={1}
              step="1"
              required
              defaultValue={priceCents ? priceCents / 100 : undefined}
              placeholder="40"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
            />
          </label>
          <button
            type="submit"
            className="rounded-md bg-teal-600 px-4 py-2 font-medium text-white hover:bg-teal-700"
          >
            {priceCents ? "Mettre à jour" : "Valider"}
          </button>
        </form>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <h2 className="font-medium text-slate-900">2. Encaisser vos patients</h2>
        <p className="mt-2 text-sm text-slate-600">
          Pour que vos patients puissent payer directement depuis Physio-App, vous devez activer un
          compte de paiement à votre nom (fourni par Stripe, notre prestataire de paiement) —
          l&apos;argent y arrive directement, Physio-App n&apos;y touche jamais.
        </p>
        <div className="mt-3 flex items-center gap-2 text-sm">
          {connectStatus === "active" ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-teal-600" strokeWidth={1.75} />
              <span className="text-slate-700">Paiements activés</span>
            </>
          ) : (
            <>
              <Circle className="h-4 w-4 text-slate-300" strokeWidth={1.75} />
              <span className="text-slate-500">
                {connectStatus === "onboarding" ? "Inscription en cours" : "Pas encore activé"}
              </span>
            </>
          )}
        </div>
        {connectStatus !== "active" && (
          <form action={startConnectOnboarding} className="mt-4">
            <button
              type="submit"
              className="w-full rounded-md border border-teal-600 px-4 py-2 font-medium text-teal-700 hover:bg-teal-50"
            >
              {connectStatus === "onboarding" ? "Reprendre l'inscription" : "Activer les paiements"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
