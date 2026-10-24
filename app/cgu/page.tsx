import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import DotCanvas from "@/components/DotCanvas";

// Renders legal/cgu.md for the app. Keep the two in sync by hand — this is
// still a DRAFT pending legal review (see the banner below).
export default function CguPage() {
  return (
    <div className="relative min-h-screen bg-[#f6f8fd] text-slate-800">
      <DotCanvas />
      <div className="relative z-10">
      <SiteHeader />
      <main className="p-6 pt-32 sm:p-8 sm:pt-36">
      <div className="mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <strong>Brouillon.</strong> Ce document est en cours de rédaction et n&apos;a pas
          encore été validé par un avocat.
        </div>

        <h1 className="font-display mt-6 text-2xl font-semibold text-slate-900">
          Conditions générales d&apos;utilisation
        </h1>

        <div className="mt-6 space-y-6 text-sm leading-relaxed text-slate-700">
          <section>
            <h2 className="font-display font-semibold text-slate-900">1. Objet</h2>
            <p className="mt-1">
              Les présentes conditions générales d&apos;utilisation régissent l&apos;accès et
              l&apos;usage de la plateforme EasyPhysio par les kinésithérapeutes et leurs
              patients.
            </p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-slate-900">2. Description du service</h2>
            <p className="mt-1">
              EasyPhysio met à disposition des kinésithérapeutes un outil de suivi
              d&apos;exercices à distance pour leurs patients. EasyPhysio n&apos;est pas un
              dispositif médical et ne dispense pas de soin : le programme d&apos;exercices est
              établi et validé par le kinésithérapeute, qui reste seul responsable du suivi
              clinique de son patient.
            </p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-slate-900">3. Accès à l&apos;application</h2>
            <p className="mt-1">
              L&apos;application est mise à disposition du patient par son kinésithérapeute, qui
              règle à EasyPhysio un forfait par patient actif. Le patient n&apos;a rien à payer à
              EasyPhysio pour accéder à son programme. Ce forfait ne dépend ni des honoraires du
              kinésithérapeute ni des paiements de ses patients.
            </p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-slate-900">4. Suivi mensuel par le kinésithérapeute</h2>
            <p className="mt-1">
              Le kinésithérapeute peut proposer un suivi mensuel à distance : une fois par mois, il
              analyse les séances et les ressentis du patient, ajuste son programme et lui adresse un
              retour écrit (« bilan de suivi »). Ce bilan est un acte du kinésithérapeute, non
              remboursé par l&apos;Assurance Maladie, au tarif qu&apos;il fixe et que le patient
              accepte par écrit avant le premier bilan.
            </p>
            <p className="mt-2">
              Le patient enregistre une carte bancaire ; il n&apos;est prélevé que le mois où un bilan
              est effectivement réalisé, directement au profit de son kinésithérapeute, qui lui
              délivre une note d&apos;honoraires. EasyPhysio ne perçoit aucune part de ces honoraires.
              Le suivi est libre et volontaire : le kinésithérapeute ne peut pas conditionner les
              soins à sa souscription, et le patient peut l&apos;arrêter à tout moment depuis son
              espace, sans frais.
            </p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-slate-900">5. Comptes et résiliation</h2>
            <p className="mt-1">
              Le patient peut supprimer son compte à tout moment depuis son espace personnel. Le
              kinésithérapeute peut également résilier son propre compte à tout moment ; le forfait
              EasyPhysio est facturé au mois, pour les patients actifs du mois écoulé.
            </p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-slate-900">6. Droit applicable</h2>
            <p className="mt-1">Les présentes conditions sont soumises au droit français.</p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-slate-900">7. Contact</h2>
            <p className="mt-1">Pour toute question, contactez-nous depuis votre compte.</p>
          </section>
        </div>
      </div>
      </main>
      <SiteFooter />
      </div>
    </div>
  );
}
