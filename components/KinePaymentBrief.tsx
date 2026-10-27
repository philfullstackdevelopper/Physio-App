import { ArrowDownRight, ArrowUpRight, ChevronDown } from "lucide-react";
import {
  FREE_FIRST_MONTH,
  KINE_FEE_PER_ACTIVE_PATIENT_CENTS,
  KINE_FEE_PER_ACTIVE_PATIENT_TTC_CENTS,
  RECOMMENDED_REVIEW_PRICE_CENTS,
  estimateStripeFeeCents,
  eurosFR,
} from "@/lib/billing/reviewModel";

// « Et moi, comment je suis payé ? » (accueil). Refait le 2026-10-25
// (Philippe : « trop de texte », grille de cartes « IA ») : à gauche une seule
// affirmation forte et les deux flux d'argent ; à droite cinq questions
// fermées, qui s'ouvrent au toucher (<details>, sans JavaScript). Les articles
// de loi et la déclaration sont DANS ces questions, en version courte.
// Montants : lib/billing/reviewModel.ts. À faire relire par l'avocat.

const price = eurosFR(RECOMMENDED_REVIEW_PRICE_CENTS, 0);
const feeHT = eurosFR(KINE_FEE_PER_ACTIVE_PATIENT_CENTS, 0);
const feeTTC = eurosFR(KINE_FEE_PER_ACTIVE_PATIENT_TTC_CENTS);
const CODE_URL = "https://charente.ordremk.fr/files/2022/03/code-de-deontologie-avec-lexique.pdf";

// Exemple calculé : chaque patient suivi sur l'appli a un bilan par mois.
const EX = 30;
const exNet = eurosFR(
  EX * (RECOMMENDED_REVIEW_PRICE_CENTS - KINE_FEE_PER_ACTIVE_PATIENT_TTC_CENTS - estimateStripeFeeCents(RECOMMENDED_REVIEW_PRICE_CENTS)),
  0,
);

type Item = { q: string; a: React.ReactNode };

const ITEMS: Item[] = [
  {
    q: "Qu'est-ce que je facture ?",
    a: <p>Le suivi à distance du mois : vous regardez les séances et les douleurs, puis ajustez le programme. Acte non remboursé, à votre tarif.</p>,
  },
  {
    q: "Quand le patient est-il prélevé ?",
    a: <p>Seulement le mois où vous ajustez son programme. Il accepte votre tarif une fois et peut arrêter quand il veut.</p>,
  },
  {
    q: "Combien coûte EasyPhysio ?",
    a: (
      <p>
        {feeHT} € HT ({feeTTC} € TTC) par patient suivi et par mois, une seule facture.{FREE_FIRST_MONTH ? " Premier mois offert." : ""} Ce prix ne dépend pas de vos honoraires.
      </p>
    ),
  },
  {
    q: "Est-ce compatible avec la déontologie ?",
    a: (
      <>
        <ul className="space-y-1.5">
          <li><span className="font-medium text-slate-900">R.4321-98 :</span> honoraires pour un acte réellement fait, tarif annoncé avant.</li>
          <li><span className="font-medium text-slate-900">R.4321-70 :</span> aucun partage d&apos;honoraires, le patient vous paie directement.</li>
          <li><span className="font-medium text-slate-900">R.4321-72 :</span> aucune commission, EasyPhysio facture un forfait fixe.</li>
        </ul>
        <a href={CODE_URL} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block font-medium text-blue-700 underline-offset-4 hover:underline">
          Lire le code de déontologie
        </a>
      </>
    ),
  },
  {
    q: "Comment déclarer cet argent ?",
    a: (
      <>
        <ul className="space-y-1.5">
          <li>Une note d&apos;honoraires par bilan, générée par l&apos;appli.</li>
          <li>Des honoraires comme les autres (BNC, art. 92 du CGI).</li>
          <li>En fin de mois, un clic : le récapitulatif pour votre comptable.</li>
        </ul>
        <p className="mt-2 text-xs text-slate-400">Votre comptable ou votre AGA reste votre référence.</p>
      </>
    ),
  },
];

export default function KinePaymentBrief() {
  return (
    <div className="grid items-start gap-10 text-left lg:grid-cols-[5fr_7fr] lg:gap-14">
      {/* Une affirmation, deux flux. */}
      <div>
        <p className="font-display text-6xl font-semibold tracking-tight text-blue-600 max-sm:text-5xl">100 %</p>
        <p className="mt-2 max-w-sm text-balance text-lg leading-snug text-slate-900">de vos honoraires de suivi restent à vous.</p>

        <dl className="mt-8 space-y-5">
          <div className="flex gap-3">
            <ArrowDownRight className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" strokeWidth={2} />
            <div>
              <dt className="text-sm text-slate-500">Votre patient vous paie</dt>
              <dd className="text-base font-semibold text-slate-900">≈ {price} € par bilan fait</dd>
            </div>
          </div>
          <div className="flex gap-3">
            <ArrowUpRight className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" strokeWidth={2} />
            <div>
              <dt className="text-sm text-slate-500">Vous payez EasyPhysio</dt>
              <dd className="text-base font-semibold text-slate-900">{feeHT} € HT par patient suivi</dd>
            </div>
          </div>
        </dl>

        <p className="mt-8 border-t border-slate-200 pt-4 text-sm text-slate-600">
          {EX} patients suivis à {price} € : <span className="font-semibold text-slate-900">≈ {exNet} € de plus par mois</span>.
        </p>
      </div>

      {/* Les questions, fermées par défaut. */}
      <div className="divide-y divide-slate-200 border-y border-slate-200">
        {ITEMS.map((item) => (
          <details key={item.q} className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-base font-medium text-slate-900 [&::-webkit-details-marker]:hidden">
              {item.q}
              <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 group-open:rotate-180" strokeWidth={2} />
            </summary>
            <div className="pb-4 pr-8 text-sm leading-relaxed text-slate-600">{item.a}</div>
          </details>
        ))}
      </div>
    </div>
  );
}
