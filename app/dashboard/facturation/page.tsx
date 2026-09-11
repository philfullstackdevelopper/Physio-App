import { CheckCircle2, Circle, Euro, ExternalLink, Info, Lock, ShieldCheck, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import SubmitButton from "@/components/SubmitButton";
import { TIERS, TIER_KEYS, resolveTierPrices, type InstructorTierPriceRow } from "@/lib/billing/plans";
import { loadPatientCounts } from "@/lib/billing/patientCounts";
import { estimateMonthlySplit } from "@/lib/billing/platformFee";
import { startConnectOnboarding } from "../connect/actions";

const EUR = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

// Tarifs et paiements : pour l'instant en lecture seule côté kiné — les prix
// des trois offres restent ceux d'EasyPhysio par défaut (lib/billing/plans.ts).
// Le réglage de son propre tarif (documenté dans CLAUDE.md §4.7) est retiré
// de cette page temporairement (Philippe, 2026-09-11 : "remove his choice to
// set his own price, just keep number of ppl using each subscription") pour
// que tout tienne sur un seul écran, sans scroll. Le formulaire d'édition et
// setTierPrices (../connect/actions) restent en place, juste plus appelés ici.
export default async function FacturationPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { error, saved } = await searchParams;
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const [{ data: kine }, { data: connect }, counts] = await Promise.all([
    supabase
      .from("instructors")
      .select("tier_essentiel_cents, tier_standard_cents, tier_premium_cents")
      .eq("id", user.id)
      .maybeSingle(),
    supabase.from("instructor_connect_accounts").select("status").eq("instructor_id", user.id).maybeSingle(),
    loadPatientCounts(supabase, user.id),
  ]);

  const prices = resolveTierPrices(kine as InstructorTierPriceRow | null);
  const connectStatus = ((connect?.status as string | null) ?? "not_started") as "active" | "onboarding" | "not_started";

  // Répartition « roue » : à partir des offres RÉELLEMENT choisies par ses
  // patients aujourd'hui (counts.byTier), pas d'une simulation manuelle.
  // Deux parts seulement (Philippe, 2026-09-11) : ce que le kiné reçoit, et
  // "frais EasyPhysio" qui regroupe la commission plateforme ET les frais
  // Stripe — pour que ce chiffre-là corresponde quasi exactement à ce qui
  // arrive vraiment sur son compte, sans un 3e poste à recalculer soi-même.
  const split = estimateMonthlySplit(TIER_KEYS.map((key) => ({ priceCents: prices[key], count: counts.byTier[key] })));
  const feesCents = split.platformFeeCents + split.stripeFeeCents;
  const feesRatePct = split.totalCents > 0 ? Math.round((feesCents / split.totalCents) * 100) : 18;
  const hasRevenue = split.totalCents > 0;
  const r = 44;
  const c = 2 * Math.PI * r;
  const netLen = hasRevenue ? (c * split.netCents) / split.totalCents : 0;

  const status = {
    active: {
      box: "border-ok/30 bg-ok-soft",
      icon: <CheckCircle2 className="h-5 w-5 shrink-0 text-ok" strokeWidth={1.75} />,
      title: "Paiements activés",
      titleClass: "text-ok",
      text: "Vos patients peuvent payer leurs abonnements en ligne.",
    },
    onboarding: {
      box: "border-warn/30 bg-warn-soft",
      icon: <Circle className="h-5 w-5 shrink-0 text-warn" strokeWidth={1.75} />,
      title: "Inscription en cours",
      titleClass: "text-warn",
      text: "Terminez l'inscription Stripe pour commencer à encaisser.",
    },
    not_started: {
      box: "border-line bg-app-bg",
      icon: <Circle className="h-5 w-5 shrink-0 text-muted" strokeWidth={1.75} />,
      title: "Paiements non activés",
      titleClass: "text-ink",
      text: "Activez votre compte de paiement pour que vos patients puissent s'abonner.",
    },
  }[connectStatus];

  const reassurance = [
    { icon: ShieldCheck, title: "Paiement 100 % sécurisé", text: "Propulsé par Stripe, leader mondial." },
    { icon: Euro, title: "L'argent vous appartient", text: "Les paiements arrivent directement sur votre compte." },
    { icon: Lock, title: "EasyPhysio n'y touche jamais", text: "Nous ne stockons pas les informations bancaires." },
  ];

  // h-dvh + overflow-hidden : tout doit tenir sur un seul écran, sans scroll
  // (Philippe, 2026-09-11). Deux colonnes plutôt qu'empilé pour que la roue
  // de répartition tienne à côté du reste sans pousser la page vers le bas.
  return (
    <main className="h-dvh overflow-hidden">
      <div className="mx-auto grid h-full max-w-6xl content-center gap-6 p-6 sm:p-8 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="text-2xl font-semibold text-ink">Tarifs et paiements</h1>
            <p className="mt-1 text-sm text-muted">Vos trois offres et le statut de vos paiements en ligne.</p>
          </div>

          {error && <p className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>}
          {saved === "1" && (
            <p className="flex items-center gap-1.5 rounded-xl bg-ok-soft px-4 py-3 text-sm text-ok">
              <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              Tarif enregistré.
            </p>
          )}

          <section className="rounded-2xl border border-line bg-surface p-6">
            <h2 className="flex items-center gap-2 text-sm font-medium text-muted">
              <Users className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              Vos patients
            </h2>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-5">
              <div>
                <p className="text-2xl font-semibold text-ink">{counts.total}</p>
                <p className="text-xs text-muted">Au total</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-ink">{counts.active}</p>
                <p className="text-xs text-muted">Abonnement actif</p>
              </div>
              {TIER_KEYS.map((key) => (
                <div key={key}>
                  <p className="text-2xl font-semibold text-ink">{counts.byTier[key]}</p>
                  <p className="text-xs text-muted">
                    {TIERS[key].label} · {EUR.format(prices[key] / 100)}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="min-w-0 flex-1 rounded-2xl border border-line bg-surface p-6">
            <h2 className="text-lg font-semibold text-ink">Encaisser vos patients</h2>

            <ul className="mt-4 grid gap-4 sm:grid-cols-3">
              {reassurance.map((item) => (
                <li key={item.title} className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                    <item.icon className="h-5 w-5" strokeWidth={1.75} />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-ink">{item.title}</p>
                    <p className="text-xs text-muted">{item.text}</p>
                  </div>
                </li>
              ))}
            </ul>

            <div className={`mt-4 flex items-start gap-3 rounded-xl border px-4 py-3 ${status.box}`}>
              {status.icon}
              <div>
                <p className={`font-medium ${status.titleClass}`}>{status.title}</p>
                <p className="text-sm text-muted">{status.text}</p>
              </div>
            </div>

            {connectStatus === "active" ? (
              <a
                href="https://dashboard.stripe.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-brand px-4 py-2.5 text-sm font-medium text-brand transition hover:bg-brand-soft"
              >
                Gérer mon compte Stripe
                <ExternalLink className="h-4 w-4" strokeWidth={1.75} />
              </a>
            ) : (
              <form action={startConnectOnboarding} className="mt-4">
                <SubmitButton
                  pendingText="Redirection…"
                  className="w-full rounded-xl bg-brand px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-dark"
                >
                  {connectStatus === "onboarding" ? "Reprendre l'inscription" : "Activer les paiements"}
                </SubmitButton>
              </form>
            )}
          </section>
        </div>

        {/* Roue de répartition : qui touche quoi sur ce que paient vos
            patients actuels, un mois plein, sans prorata d'entrée/sortie. */}
        <section className="flex min-w-0 flex-col justify-center rounded-2xl border border-line bg-surface p-6">
          <h2 className="flex items-center gap-1.5 text-lg font-semibold text-ink">
            Répartition de vos revenus
            <Info
              className="h-4 w-4 shrink-0 text-muted"
              strokeWidth={1.75}
              aria-label="Estimation sur un mois complet, à partir de vos patients abonnés aujourd'hui"
            />
          </h2>
          <p className="mt-1 text-sm text-muted">
            Pour {counts.active} patient{counts.active > 1 ? "s" : ""} abonné{counts.active > 1 ? "s" : ""} aujourd&apos;hui,
            sur un mois complet.
          </p>

          <div className="mt-5 flex flex-col items-center gap-6 sm:flex-row sm:justify-center">
            <div className="relative h-40 w-40 shrink-0">
              <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden="true">
                <circle cx="50" cy="50" r={r} fill="none" stroke="var(--color-line)" strokeWidth="10" />
                {hasRevenue && (
                  <>
                    <circle
                      cx="50"
                      cy="50"
                      r={r}
                      fill="none"
                      stroke="var(--color-ok)"
                      strokeWidth="10"
                      strokeDasharray={`${netLen} ${c - netLen}`}
                      strokeLinecap="butt"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r={r}
                      fill="none"
                      stroke="var(--color-danger)"
                      strokeWidth="10"
                      strokeDasharray={`${c - netLen} ${netLen}`}
                      strokeDashoffset={-netLen}
                      strokeLinecap="butt"
                    />
                  </>
                )}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-semibold text-ink">{hasRevenue ? EUR.format(split.netCents / 100) : "—"}</span>
                <span className="text-[11px] text-muted">vous recevez</span>
              </div>
            </div>

            <dl className="w-full max-w-[220px] space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-1.5 text-muted">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-ok" />
                  Vous recevez
                </dt>
                <dd className="font-semibold text-ok">{hasRevenue ? EUR.format(split.netCents / 100) : "—"}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-1.5 text-muted">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-danger" />
                  Frais EasyPhysio (≈{feesRatePct} %)
                </dt>
                <dd className="font-semibold text-danger">{hasRevenue ? EUR.format(feesCents / 100) : "—"}</dd>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-line pt-3">
                <dt className="text-muted">Total encaissé</dt>
                <dd className="font-semibold text-ink">{hasRevenue ? EUR.format(split.totalCents / 100) : "—"}</dd>
              </div>
            </dl>
          </div>

          {!hasRevenue && (
            <p className="mt-4 text-center text-xs text-muted">Aucun patient abonné pour l&apos;instant.</p>
          )}
          <p className="mt-4 text-center text-xs text-muted">
            « Frais EasyPhysio » inclut notre commission et les frais Stripe (≈1,5&nbsp;% + 0,25&nbsp;€ par paiement) —
            ce que vous recevez correspond donc à ce qui arrive réellement sur votre compte.
          </p>
        </section>
      </div>
    </main>
  );
}
