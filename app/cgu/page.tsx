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
              règle à EasyPhysio un abonnement mensuel fixe. Le patient n&apos;a rien à payer à
              EasyPhysio. Si le kinésithérapeute propose son suivi gratuitement, l&apos;accès est libre ;
              s&apos;il a fixé un tarif, l&apos;accès à l&apos;application passe par l&apos;acceptation du
              suivi mensuel décrit à l&apos;article 4.
            </p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-slate-900">4. Suivi mensuel par le kinésithérapeute</h2>
            <p className="mt-1">
              Le kinésithérapeute propose un suivi mensuel à distance (programme mensuel hors
              nomenclature) : il analyse les séances et les ressentis du patient et ajuste son
              programme. C&apos;est un acte du kinésithérapeute, non remboursé par l&apos;Assurance
              Maladie, au tarif qu&apos;il fixe librement et que le patient accepte par écrit avant
              d&apos;accéder à l&apos;application.
            </p>
            <p className="mt-2">
              Le patient enregistre une carte bancaire ; il n&apos;est prélevé que le mois où son
              kinésithérapeute ajuste effectivement son programme, directement au profit de celui-ci,
              qui lui délivre une note d&apos;honoraires. EasyPhysio ne perçoit aucune part de ces
              honoraires. Les soins en cabinet ne dépendent pas de ce suivi. Le patient peut
              l&apos;arrêter à tout moment depuis son espace, sans frais ; il garde alors le droit
              d&apos;exporter ou de supprimer ses données.
            </p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-slate-900">5. Comptes et résiliation</h2>
            <p className="mt-1">
              Le patient peut supprimer son compte à tout moment depuis son espace personnel. Le
              kinésithérapeute peut également résilier son propre compte à tout moment ; son
              abonnement EasyPhysio est facturé chaque mois, d&apos;avance, sans engagement.
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
