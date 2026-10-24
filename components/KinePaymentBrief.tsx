import { ArrowRight, ArrowDown, Check, FileText, Scale } from "lucide-react";
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
    a: "Oui : honoraires seulement pour un acte réellement fait, tarif annoncé avant, aucun partage d'honoraires ni commission. Les articles sont détaillés juste en dessous.",
  },
  {
    q: "Et la paperasse ?",
    a: "Chaque bilan produit sa note d'honoraires, envoyée au patient. En fin de mois, un clic : le récapitulatif de vos recettes, prêt pour votre déclaration (détail juste en dessous).",
  },
];

// « Pourquoi c'est légal » : chaque règle du code de déontologie des
// masseurs-kinésithérapeutes (code de la santé publique) qui encadre le
// modèle, et ce qui la respecte concrètement. Textes vérifiés le 2026-10-24
// sur la version publiée par l'Ordre (lien CODE_URL). À faire relire par
// l'avocat avant la mise en ligne.
const CODE_URL = "https://charente.ordremk.fr/files/2022/03/code-de-deontologie-avec-lexique.pdf";

const LEGAL_RULES = [
  {
    ref: "Art. R.4321-98 CSP",
    rule: "Honoraires fixés « avec tact et mesure », réclamés seulement « à l'occasion d'actes réellement effectués », patient informé du montant avant.",
    how: "Le patient accepte votre tarif par écrit avant le premier bilan, et n'est prélevé que le mois où le bilan est fait.",
  },
  {
    ref: "Art. R.4321-70 CSP",
    rule: "Partage d'honoraires interdit, sous quelque forme que ce soit.",
    how: "Le patient vous paie sur votre propre compte : vos honoraires ne sont partagés avec personne.",
  },
  {
    ref: "Art. R.4321-72 CSP",
    rule: "Interdit « toute commission à quelque personne que ce soit » et tout avantage lié à un acte.",
    how: "EasyPhysio vous facture un forfait fixe par patient actif, sans lien avec vos honoraires. Nous ne vous versons jamais rien.",
  },
  {
    ref: "Art. R.4321-69 CSP",
    rule: "Interdit de distribuer à des fins lucratives des produits présentés comme bons pour la santé.",
    how: "Vous ne revendez pas l'appli : vous facturez votre propre acte, le bilan de suivi.",
  },
  {
    ref: "Art. R.4321-56 CSP",
    rule: "Le kiné ne peut aliéner son indépendance professionnelle.",
    how: "Vous fixez votre tarif et décidez seul du programme ; l'appli ne le modifie jamais à votre place.",
  },
];

// « Déclarer cet argent » : règles fiscales générales des professions
// libérales (code général des impôts). Information générale, pas un conseil :
// le texte renvoie au comptable ou à l'AGA du kiné.
const DECLARE_STEPS = [
  {
    title: "Une note d'honoraires par bilan",
    body: "Numérotée, avec votre n° RPPS, la date, « acte non remboursable par l'Assurance Maladie » et la mention d'exonération de TVA des soins (art. 261-4-1° du CGI). Elle est envoyée au patient et gardée dans l'appli.",
  },
  {
    title: "Des honoraires comme les autres",
    body: "Ces sommes sont des recettes professionnelles en bénéfices non commerciaux (art. 92 du CGI). Elles s'ajoutent à vos autres honoraires dans vos déclarations habituelles.",
  },
  {
    title: "Votre registre des recettes, déjà rempli",
    body: "L'export mensuel liste chaque bilan encaissé : c'est le détail des recettes que vous devez tenir (art. 99 du CGI en déclaration contrôlée, art. 102 ter en micro-BNC).",
  },
  {
    title: "Vos frais, à déduire",
    body: "En déclaration contrôlée (2035), la facture EasyPhysio et les frais de carte sont des charges déductibles ; ils sont joints à l'export. En micro-BNC, l'abattement forfaitaire les couvre déjà.",
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

      <div className="mt-10 grid gap-3 text-left lg:grid-cols-2 sm:short:mt-6">
        {/* Pourquoi c'est légal */}
        <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm max-sm:p-4">
          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5 shrink-0 text-blue-600" strokeWidth={1.75} />
            <h3 className="font-display text-lg font-semibold text-slate-900">Pourquoi c&apos;est légal</h3>
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
            Le bilan de suivi à distance n&apos;est pas un acte de la nomenclature&nbsp;: il n&apos;est pas remboursé, et vous en
            fixez le tarif. Cinq règles du code de déontologie l&apos;encadrent&nbsp;:
          </p>
          <ul className="mt-4 space-y-3">
            {LEGAL_RULES.map((r) => (
              <li key={r.ref} className="border-t border-slate-100 pt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">{r.ref}</p>
                <p className="mt-0.5 text-sm text-slate-700">{r.rule}</p>
                <p className="mt-1 flex items-start gap-1.5 text-sm text-slate-900">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" strokeWidth={2.5} />
                  {r.how}
                </p>
              </li>
            ))}
          </ul>
          <a
            href={CODE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-blue-700 underline-offset-4 hover:underline"
          >
            Lire le code de déontologie (Ordre des masseurs-kinésithérapeutes)
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
          </a>
        </div>

        {/* Déclarer cet argent */}
        <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm max-sm:p-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 shrink-0 text-blue-600" strokeWidth={1.75} />
            <h3 className="font-display text-lg font-semibold text-slate-900">Déclarer cet argent</h3>
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
            Rien de nouveau à apprendre&nbsp;: ces honoraires se déclarent comme les autres, et l&apos;appli prépare les pièces.
          </p>
          <ol className="mt-4 space-y-3">
            {DECLARE_STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-3 border-t border-slate-100 pt-3">
                <span className="font-display flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-blue-700">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{s.title}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-slate-600">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-xs leading-relaxed text-slate-400">
            Informations générales sur la fiscalité des professions libérales&nbsp;: votre comptable ou votre AGA reste votre
            référence pour votre situation.
          </p>
        </div>
      </div>
    </div>
  );
}
