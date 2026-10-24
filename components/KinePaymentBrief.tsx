import { ArrowRight, ArrowDown } from "lucide-react";
import { estimateStripeFeeCents } from "@/lib/billing/platformFee";
import {
  FREE_FIRST_MONTH,
  KINE_FEE_PER_ACTIVE_PATIENT_CENTS,
  KINE_FEE_PER_ACTIVE_PATIENT_TTC_CENTS,
  RECOMMENDED_REVIEW_PRICE_CENTS,
  eurosFR,
} from "@/lib/billing/reviewModel";

// « Et moi, comment je suis payé ? » — la première question de tout kiné
// (Philippe, 2026-10-24). Bloc de la page d'accueil, juste au-dessus des
// tarifs : le circuit de l'argent en un coup d'œil, puis les six questions
// qu'un kiné pose, chacune en deux ou trois phrases. Tous les montants
// viennent de lib/billing/reviewModel.ts.
//
// Avant de mettre en ligne : la réponse « déontologie » et la promesse
// comptable (notes d'honoraires, export mensuel) décrivent le modèle prévu au
// lancement — à faire valider par l'avocat, et la facturation à refaire.

const price = eurosFR(RECOMMENDED_REVIEW_PRICE_CENTS, 0);
const feeHT = eurosFR(KINE_FEE_PER_ACTIVE_PATIENT_CENTS, 0);
const feeTTC = eurosFR(KINE_FEE_PER_ACTIVE_PATIENT_TTC_CENTS);

// Exemple chiffré, calculé (jamais écrit en dur).
const EX_ACTIVE = 30;
const EX_FOLLOWED = 20;
const exNetCents =
  EX_FOLLOWED * RECOMMENDED_REVIEW_PRICE_CENTS -
  EX_ACTIVE * KINE_FEE_PER_ACTIVE_PATIENT_TTC_CENTS -
  EX_FOLLOWED * estimateStripeFeeCents(RECOMMENDED_REVIEW_PRICE_CENTS);
const exNet = eurosFR(exNetCents, 0);

const QUESTIONS = [
  {
    q: "Qu'est-ce que je facture à mon patient ?",
    a: `Un bilan de suivi à distance, une fois par mois : vous regardez ses séances et ses douleurs, ajustez son programme et lui écrivez. C'est un acte non remboursé, au tarif que vous fixez (conseillé : ${price} €).`,
  },
  {
    q: "Quand est-il prélevé ?",
    a: "Seulement le mois où vous validez le bilan. Il accepte votre tarif une fois et enregistre sa carte ; ensuite, pas de bilan, pas de prélèvement. Il arrête quand il veut.",
  },
  {
    q: "Combien me coûte EasyPhysio ?",
    a: `${feeHT} € HT (${feeTTC} € TTC) par patient actif et par mois, en une seule facture en fin de mois.${FREE_FIRST_MONTH ? " Le premier mois est offert." : ""} Ce prix ne dépend ni de votre tarif, ni de ce que vos patients vous paient.`,
  },
  {
    q: "EasyPhysio prend-il une part de mes honoraires ?",
    a: "Non. Votre patient vous paie directement, sur votre propre compte Stripe : vos honoraires restent à 100 % à vous. Seuls les frais de la carte bancaire s'appliquent (environ 1,5 % + 0,25 €).",
  },
  {
    q: "Est-ce compatible avec la déontologie ?",
    a: "Le modèle est construit autour du code de déontologie : honoraires seulement pour un acte réellement effectué, tarif annoncé avant, aucun partage d'honoraires ni commission (art. R.4321-98 et R.4321-72 du code de la santé publique).",
  },
  {
    q: "Et la paperasse ?",
    a: "Chaque bilan produit sa note d'honoraires, envoyée au patient. En fin de mois, un clic : le récapitulatif de vos recettes, un tableur pour votre comptable et toutes vos notes d'honoraires.",
  },
];

function FlowNode({ title, sub, accent = false }: { title: string; sub: string; accent?: boolean }) {
  return (
    <div
      className={`rounded-2xl px-5 py-3 text-center ${
        accent ? "bg-blue-600 text-white shadow-md shadow-blue-900/20" : "border border-slate-200 bg-white"
      }`}
    >
      <p className={`text-sm font-semibold ${accent ? "text-white" : "text-slate-900"}`}>{title}</p>
      <p className={`text-xs ${accent ? "text-blue-100" : "text-slate-500"}`}>{sub}</p>
    </div>
  );
}

function FlowLink({ amount, note }: { amount: string; note: string }) {
  return (
    <div className="flex flex-col items-center px-2 text-center max-md:py-1">
      <p className="text-sm font-semibold text-slate-900">{amount}</p>
      <ArrowRight className="my-0.5 h-5 w-5 text-blue-600 max-md:hidden" strokeWidth={2} />
      <ArrowDown className="my-0.5 h-5 w-5 text-blue-600 md:hidden" strokeWidth={2} />
      <p className="text-xs text-slate-500">{note}</p>
    </div>
  );
}

export default function KinePaymentBrief() {
  return (
    <div>
      {/* Le circuit de l'argent : patient → vous → EasyPhysio. */}
      <div className="mx-auto flex max-w-3xl flex-col items-stretch justify-center gap-1 md:flex-row md:items-center md:gap-2">
        <FlowNode title="Votre patient" sub="en suivi mensuel" />
        <FlowLink amount={`≈ ${price} € par bilan fait`} note="100 % pour vous" />
        <FlowNode title="Vous" sub="vous fixez votre tarif" accent />
        <FlowLink amount={`${feeHT} € HT par patient actif`} note="une facture par mois" />
        <FlowNode title="EasyPhysio" sub="l'outil" />
      </div>

      <div className="mt-10 grid gap-3 text-left sm:grid-cols-2 lg:grid-cols-3 sm:short:mt-6">
        {QUESTIONS.map((item) => (
          <div key={item.q} className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm max-sm:p-4">
            <h3 className="text-sm font-semibold text-slate-900">{item.q}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{item.a}</p>
          </div>
        ))}
      </div>

      <p className="mx-auto mt-6 max-w-2xl rounded-2xl bg-blue-50/70 px-5 py-3 text-sm leading-relaxed text-slate-700">
        <span className="font-semibold text-slate-900">Exemple&nbsp;:</span> {EX_ACTIVE} patients actifs, dont {EX_FOLLOWED} en
        suivi mensuel à {price}&nbsp;€, c&apos;est environ <span className="font-semibold text-blue-700">{exNet}&nbsp;€ de plus par mois</span>,
        une fois EasyPhysio et les frais de carte payés.
      </p>
    </div>
  );
}
