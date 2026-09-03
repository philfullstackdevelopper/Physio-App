import { CheckCircle2, Circle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import SubmitButton from "@/components/SubmitButton";
import { setPatientPrice, startConnectOnboarding } from "../connect/actions";

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

  // Left-accent colour reflects the payments status at a glance, same idiom
  // as the dashboard's alert sections — green once money can actually flow,
  // amber while Stripe onboarding is in progress, neutral before it starts.
  const statusAccent =
    connectStatus === "active"
      ? "border-l-emerald-600"
      : connectStatus === "onboarding"
        ? "border-l-amber-500"
        : "border-l-stone-300";

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-lg p-6 sm:p-8">
        <h1 className="font-display animate-[fadeInUp_0.6s_ease-out_both] text-2xl font-semibold text-stone-900">
          Tarif et paiements
        </h1>

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
        )}
        {saved === "1" && (
          <p className="mt-4 flex items-center gap-1.5 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
            <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={1.5} />
            Tarif enregistré.
          </p>
        )}

        <section className="animate-[fadeInUp_0.6s_ease-out_both] [animation-delay:120ms] mt-6 rounded-xl border border-stone-200 bg-white p-6">
          <h2 className="font-medium text-stone-900">1. Votre tarif patient</h2>
          <p className="mt-2 text-sm text-stone-600">
            Vous fixez librement le tarif mensuel que vos patients vous paient (par exemple 40&nbsp;€).
            Ce paiement va directement sur votre propre compte, jamais chez EasyPhysio. En échange,
            vous payez à EasyPhysio 15&nbsp;% de ce tarif, par patient actif, calculé au prorata du
            nombre de jours du mois où le patient était suivi.
          </p>
          <p className="mt-2 rounded-lg bg-stone-50 p-3 text-xs text-stone-500">
            Exemple : un patient à 40&nbsp;€/mois, actif 15 jours sur 30, vous coûte
            40&nbsp;€&nbsp;×&nbsp;15&nbsp;%&nbsp;×&nbsp;(15/30) = <strong>3&nbsp;€</strong> ce mois-là.
          </p>
          <form action={setPatientPrice} className="mt-4 flex items-end gap-3">
            <label className="flex-1 text-sm text-stone-600">
              Tarif mensuel par patient (€)
              <input
                type="number"
                name="price_euros"
                min={1}
                step="1"
                required
                defaultValue={priceCents ? priceCents / 100 : undefined}
                placeholder="40"
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </label>
            <SubmitButton
              pendingText="Enregistrement…"
              className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700 active:scale-95"
            >
              {priceCents ? "Mettre à jour" : "Valider"}
            </SubmitButton>
          </form>
        </section>

        <section
          className={`animate-[fadeInUp_0.6s_ease-out_both] [animation-delay:200ms] mt-6 rounded-xl border-y border-r border-stone-200 border-l-[3px] ${statusAccent} bg-white p-6`}
        >
          <h2 className="font-medium text-stone-900">2. Encaisser vos patients</h2>
          <p className="mt-2 text-sm text-stone-600">
            Pour que vos patients puissent payer directement depuis EasyPhysio, vous devez activer un
            compte de paiement à votre nom (fourni par Stripe, notre prestataire de paiement) —
            l&apos;argent y arrive directement, EasyPhysio n&apos;y touche jamais.
          </p>
          <div className="mt-3 flex items-center gap-2 text-sm">
            {connectStatus === "active" ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-emerald-600" strokeWidth={1.5} />
                <span className="text-stone-700">Paiements activés</span>
              </>
            ) : connectStatus === "onboarding" ? (
              <>
                <Circle className="h-4 w-4 text-amber-500" strokeWidth={1.5} />
                <span className="text-stone-500">Inscription en cours</span>
              </>
            ) : (
              <>
                <Circle className="h-4 w-4 text-stone-300" strokeWidth={1.5} />
                <span className="text-stone-500">Pas encore activé</span>
              </>
            )}
          </div>
          {connectStatus !== "active" && (
            <form action={startConnectOnboarding} className="mt-4">
              <SubmitButton
                pendingText="Redirection…"
                className="w-full rounded-lg border border-blue-600 px-4 py-2 font-medium text-blue-700 transition hover:bg-blue-50 active:scale-95"
              >
                {connectStatus === "onboarding" ? "Reprendre l'inscription" : "Activer les paiements"}
              </SubmitButton>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
