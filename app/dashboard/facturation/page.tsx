import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Circle,
  CircleHelp,
  CreditCard,
  Euro,
  ExternalLink,
  Info,
  Lock,
  PieChart,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import SubmitButton from "@/components/SubmitButton";
import FeeSimulator from "@/components/FeeSimulator";
import { setPatientPrice, startConnectOnboarding } from "../connect/actions";

// Tarif et paiements : le kiné fixe le tarif mensuel que ses patients lui
// paient (Stripe Connect, sur SON compte) et voit ce qu'EasyPhysio prélève
// (15 % de ce tarif par patient inscrit — lib/billing/platformFee.ts).
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
    supabase.from("instructor_connect_accounts").select("status").eq("instructor_id", user.id).maybeSingle(),
  ]);

  const priceCents = (kine?.monthly_patient_price_cents as number | null) ?? null;
  const connectStatus = ((connect?.status as string | null) ?? "not_started") as "active" | "onboarding" | "not_started";

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

  const stepNumber = (n: number) => (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand text-sm font-semibold text-white">{n}</span>
  );
  const reassurance = [
    { icon: ShieldCheck, title: "Paiement 100 % sécurisé", text: "Propulsé par Stripe, leader mondial." },
    { icon: Euro, title: "L'argent vous appartient", text: "Les paiements arrivent directement sur votre compte." },
    { icon: Lock, title: "EasyPhysio n'y touche jamais", text: "Nous ne stockons pas les informations bancaires." },
  ];
  const howItWorks = [
    { icon: UserRound, text: "Le patient s'abonne en ligne" },
    { icon: CreditCard, text: "Le paiement est sécurisé par Stripe" },
    { icon: Building2, text: "L'argent arrive sur votre compte" },
    { icon: PieChart, text: "Vous ne payez que 15 % de commission" },
  ];

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-6xl p-6 sm:p-8">
        <h1 className="text-2xl font-semibold text-ink">Tarif et paiements</h1>
        <p className="mt-1 text-sm text-muted">
          Définissez votre tarif mensuel et activez les paiements pour encaisser vos patients en toute simplicité.
        </p>

        {error && <p className="mt-4 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>}
        {saved === "1" && (
          <p className="mt-4 flex items-center gap-1.5 rounded-xl bg-ok-soft px-4 py-3 text-sm text-ok">
            <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            Tarif enregistré.
          </p>
        )}

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {/* 1 — Tarif */}
          <section className="min-w-0 rounded-2xl border border-line bg-surface p-6">
            <h2 className="flex items-center gap-3 text-lg font-semibold text-ink">
              {stepNumber(1)}
              Votre tarif par patient
            </h2>

            <form action={setPatientPrice} className="mt-5">
              <label htmlFor="price_euros" className="text-sm text-muted">
                Tarif mensuel par patient
              </label>
              <div className="mt-1.5 flex gap-3">
                <div className="relative flex-1">
                  <input
                    id="price_euros"
                    type="number"
                    name="price_euros"
                    min={1}
                    step="1"
                    required
                    defaultValue={priceCents ? priceCents / 100 : undefined}
                    placeholder="40"
                    className="w-full rounded-xl border border-line bg-surface px-4 py-2.5 pr-9 text-base text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft"
                  />
                  <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-muted">€</span>
                </div>
                <SubmitButton
                  pendingText="Enregistrement…"
                  className="rounded-xl bg-brand px-5 py-2.5 text-sm font-medium text-white transition hover:bg-brand-dark"
                >
                  Enregistrer
                </SubmitButton>
              </div>
            </form>

            <p className="mt-4 flex items-start gap-2 rounded-xl bg-app-bg px-4 py-3 text-sm text-muted">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand" strokeWidth={1.75} />
              Vos patients actifs vous coûtent 15 % de ce tarif, au prorata du nombre de jours du mois.
            </p>

            <div className="mt-5">
              <FeeSimulator initialPriceEuros={priceCents ? priceCents / 100 : null} />
            </div>
          </section>

          {/* 2 — Encaisser */}
          <section className="min-w-0 rounded-2xl border border-line bg-surface p-6">
            <h2 className="flex items-center gap-3 text-lg font-semibold text-ink">
              {stepNumber(2)}
              Encaisser vos patients
            </h2>

            <ul className="mt-5 space-y-4">
              {reassurance.map((r) => (
                <li key={r.title} className="flex items-start gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                    <r.icon className="h-5 w-5" strokeWidth={1.75} />
                  </span>
                  <div>
                    <p className="font-medium text-ink">{r.title}</p>
                    <p className="text-sm text-muted">{r.text}</p>
                  </div>
                </li>
              ))}
            </ul>

            <div className={`mt-6 flex items-start gap-3 rounded-xl border px-4 py-3 ${status.box}`}>
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

        {/* 3 — Comment ça fonctionne */}
        <section className="mt-6 rounded-2xl border border-line bg-surface p-6">
          <h2 className="font-semibold text-ink">Comment ça fonctionne ?</h2>
          <ol className="mt-4 grid gap-4 sm:grid-cols-2 lg:flex lg:items-center lg:justify-between">
            {howItWorks.map((s, i) => (
              <li key={s.text} className="flex items-center gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-line bg-surface text-brand">
                  <s.icon className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <span className="text-sm text-muted">{s.text}</span>
                {i < howItWorks.length - 1 && (
                  <ArrowRight className="ml-auto hidden h-4 w-4 shrink-0 text-muted lg:block" strokeWidth={1.75} aria-hidden="true" />
                )}
              </li>
            ))}
          </ol>
        </section>

        <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-sm text-muted">
          <CircleHelp className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          <span>
            Besoin d&apos;aide ? Consultez notre{" "}
            <Link href="/#faq" className="font-medium text-brand hover:underline">
              guide d&apos;activation
            </Link>{" "}
            ou{" "}
            <a href="mailto:contact@easyphysio.fr" className="font-medium text-brand hover:underline">
              contactez-nous
            </a>
            .
          </span>
        </p>
      </div>
    </main>
  );
}
