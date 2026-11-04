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
              L&apos;application est gratuite pour le kinésithérapeute. Elle est mise à disposition du patient par son
              kinésithérapeute ; l&apos;accès du patient passe par la souscription d&apos;une formule de suivi décrite à
              l&apos;article 4.
            </p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-slate-900">4. Formules de suivi</h2>
            <p className="mt-1">
              Le patient choisit une formule de 1 mois (9,99 €), 3 mois (19,99 €) ou 6 mois (29,99 €), toutes taxes
              comprises, qui lui donne accès à son programme d&apos;exercices et au suivi à distance de son
              kinésithérapeute pendant la période payée. C&apos;est un suivi non remboursé par l&apos;Assurance Maladie ; le
              patient en accepte le prix et le renouvellement automatique avant de payer.
            </p>
            <p className="mt-2">
              Le paiement est encaissé par Stripe pour le compte du kinésithérapeute, qui en reçoit la plus grande part ;
              EasyPhysio perçoit une commission sur chaque paiement. La formule se renouvelle automatiquement à la fin de
              chaque période. Le patient peut la résilier à tout moment depuis son espace : il garde l&apos;accès jusqu&apos;à
              la fin de la période payée, puis plus aucun prélèvement n&apos;a lieu. Toute période commencée reste due,
              sans remboursement au prorata, sauf disposition légale contraire. En cas de paiement refusé, l&apos;accès est
              suspendu jusqu&apos;à la souscription d&apos;une nouvelle formule. Les soins en cabinet ne dépendent pas de ce
              suivi, et le patient garde toujours le droit d&apos;exporter ou de supprimer ses données.
            </p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-slate-900">5. Comptes et résiliation</h2>
            <p className="mt-1">
              Le patient peut supprimer son compte à tout moment depuis son espace personnel ; sa formule en cours est
              alors résiliée. Le kinésithérapeute peut également supprimer son propre compte à tout moment, sans frais.
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
