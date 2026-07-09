import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PLANS } from "@/lib/billing/plans";
import { patientAccess, instructorAccess, trialDaysLeft } from "@/lib/billing/access";
import { startCheckout, openBillingPortal } from "./actions";

const euro = (cents: number) => (cents / 100).toFixed(0);

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ subscribed?: string; checkout?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: kine }, { data: pat }, { data: sub }] = await Promise.all([
    supabase.from("instructors").select("id").eq("id", user.id).maybeSingle(),
    supabase.from("patients").select("id, trial_ends_at").eq("id", user.id).maybeSingle(),
    supabase.from("subscriptions").select("plan, status, current_period_end, stripe_customer_id").eq("user_id", user.id).maybeSingle(),
  ]);

  const isKine = !!kine;
  const isPatient = !!pat && !isKine;
  const subStatus = (sub?.status as string | null) ?? null;
  const subEnd = (sub?.current_period_end as string | null) ?? null;
  const hasCustomer = !!(sub?.stripe_customer_id as string | null);

  return (
    <main className="min-h-screen bg-slate-50 p-6 sm:p-8">
      <div className="mx-auto max-w-lg">
        <Link href={isKine ? "/dashboard" : "/patient"} className="text-sm text-slate-500 hover:underline">
          ← Retour
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">Mon abonnement</h1>

        {sp.subscribed === "1" && (
          <p className="mt-4 rounded-lg bg-teal-50 p-3 text-sm font-medium text-teal-700">
            ✅ Paiement confirmé — votre accès est activé. Merci !
          </p>
        )}
        {sp.checkout === "cancel" && (
          <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
            Paiement annulé — vous pouvez réessayer quand vous voulez.
          </p>
        )}

        {isPatient ? (
          (() => {
            const acc = patientAccess({
              trialEndsAt: pat?.trial_ends_at as string | null,
              subStatus,
              subCurrentPeriodEnd: subEnd,
            });
            const days = trialDaysLeft(pat?.trial_ends_at as string | null);
            const plan = PLANS.patient_monthly;
            const levelLabel =
              acc.level === "premium"
                ? "Abonné(e) — accès complet ✨"
                : acc.level === "trial"
                  ? `Essai gratuit en cours — ${days} jour${days > 1 ? "s" : ""} restant${days > 1 ? "s" : ""}`
                  : "Offre gratuite (exercices prescrits par votre kiné)";
            return (
              <section className="mt-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                <p className="text-sm text-slate-500">Votre accès actuel</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{levelLabel}</p>

                {acc.level !== "premium" && (
                  <>
                    <ul className="mt-4 space-y-1.5 text-sm text-slate-600">
                      <li>✓ Bibliothèque complète d&apos;exercices</li>
                      <li>✓ Suggestions d&apos;adaptation personnalisées</li>
                      <li>✓ Analyse caméra de précision (posture)</li>
                      <li>✓ Prise de rendez-vous et visio avec votre kiné</li>
                    </ul>
                    <form action={startCheckout} className="mt-5">
                      <input type="hidden" name="plan" value={plan.key} />
                      <button className="w-full rounded-xl bg-teal-600 py-3 font-medium text-white hover:bg-teal-700">
                        S&apos;abonner — {euro(plan.amount)} €/mois
                      </button>
                    </form>
                    <p className="mt-2 text-center text-xs text-slate-400">Sans engagement, résiliable à tout moment.</p>
                  </>
                )}
                {hasCustomer && (
                  <form action={openBillingPortal} className="mt-4">
                    <button className="w-full rounded-xl border border-slate-300 py-3 font-medium text-slate-700 hover:bg-slate-50">
                      Gérer mon abonnement
                    </button>
                  </form>
                )}
              </section>
            );
          })()
        ) : isKine ? (
          (() => {
            const acc = instructorAccess({ subStatus, subCurrentPeriodEnd: subEnd });
            const plan = PLANS.kine_pro;
            return (
              <section className="mt-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                <p className="text-sm text-slate-500">Votre formule</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {acc.level === "pro" ? "Kiné Pro — actif ✨" : "Gratuit (prescription illimitée)"}
                </p>

                {acc.level !== "pro" && (
                  <>
                    <ul className="mt-4 space-y-1.5 text-sm text-slate-600">
                      <li>✓ Analyse caméra de précision pour vos patients</li>
                      <li>✓ Suggestions d&apos;adaptation détaillées</li>
                      <li>✓ Suivi télésoin (bilan, visio, mise à jour du programme)</li>
                      <li>✓ Tableaux de bord avancés</li>
                    </ul>
                    <form action={startCheckout} className="mt-5">
                      <input type="hidden" name="plan" value={plan.key} />
                      <button className="w-full rounded-xl bg-teal-600 py-3 font-medium text-white hover:bg-teal-700">
                        Passer à Kiné Pro — {euro(plan.amount)} €/mois
                      </button>
                    </form>
                  </>
                )}
                {hasCustomer && (
                  <form action={openBillingPortal} className="mt-4">
                    <button className="w-full rounded-xl border border-slate-300 py-3 font-medium text-slate-700 hover:bg-slate-50">
                      Gérer mon abonnement
                    </button>
                  </form>
                )}
              </section>
            );
          })()
        ) : (
          <p className="mt-6 rounded-lg bg-amber-50 p-4 text-sm text-amber-700">
            Compte non reconnu comme patient ou kiné. Vérifiez que la migration
            <code className="mx-1 rounded bg-amber-100 px-1">0009</code>a bien été lancée dans Supabase.
          </p>
        )}
      </div>
    </main>
  );
}
