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
              l&apos;usage de la plateforme Physio-App par les kinésithérapeutes et leurs
              patients.
            </p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-slate-900">2. Description du service</h2>
            <p className="mt-1">
              Physio-App met à disposition des kinésithérapeutes un outil de suivi
              d&apos;exercices à distance pour leurs patients. Physio-App n&apos;est pas un
              dispositif médical et ne dispense pas de soin : le programme d&apos;exercices est
              établi et validé par le kinésithérapeute, qui reste seul responsable du suivi
              clinique de son patient.
            </p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-slate-900">3. Statut du service</h2>
            <p className="mt-1">
              L&apos;abonnement patient à Physio-App n&apos;est jamais pris en charge ni
              remboursé par l&apos;Assurance Maladie. Il s&apos;agit d&apos;un service
              complémentaire au suivi kinésithérapique, facturé directement au patient.
            </p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-slate-900">4. Inscription et comptes</h2>
            <p className="mt-1">
              L&apos;usage de Physio-App par le patient est libre et volontaire — le
              kinésithérapeute ne peut conditionner la poursuite du suivi kinésithérapique
              classique à la souscription du patient.
            </p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-slate-900">5. Résiliation</h2>
            <p className="mt-1">Chaque partie peut résilier à tout moment.</p>
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
