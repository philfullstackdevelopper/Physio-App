import Link from "next/link";

// A small, drop-anywhere upsell banner linking to /billing. Renders nothing for
// users who already have full access. Server-component friendly (no client JS).
export default function UpgradeCta({
  role,
  level,
  trialDays,
}: {
  role: "patient" | "instructor";
  level: string;
  trialDays?: number;
}) {
  // Already paying → nothing to sell.
  if ((role === "patient" && level === "premium") || (role === "instructor" && level === "pro")) {
    return null;
  }

  const patient = role === "patient";
  const days = trialDays ?? 0;
  const title = patient
    ? level === "trial"
      ? `Essai gratuit — ${days} jour${days > 1 ? "s" : ""} restant${days > 1 ? "s" : ""}`
      : "Débloquez l'expérience complète"
    : "Passez à Kiné Pro";
  const subtitle = patient
    ? "Bibliothèque complète, suggestions, analyse de précision et visio avec votre kiné."
    : "Analyse de précision, suivi télésoin et tableaux de bord avancés pour vos patients.";
  const cta = patient ? "Voir l'abonnement — 10 €/mois" : "Voir Kiné Pro — 30 €/mois";

  return (
    <Link
      href="/billing"
      className="mt-6 block rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50 to-white p-5 shadow-sm transition hover:shadow-md"
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl">✨</span>
        <div>
          <p className="font-semibold text-slate-900">{title}</p>
          <p className="mt-0.5 text-sm text-slate-600">{subtitle}</p>
          <span className="mt-2 inline-block text-sm font-medium text-teal-700">{cta} →</span>
        </div>
      </div>
    </Link>
  );
}
