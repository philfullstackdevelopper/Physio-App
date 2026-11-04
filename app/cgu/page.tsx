import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import DotCanvas from "@/components/DotCanvas";
import { HIGHEST_MONTHLY_TOTAL_CENTS, HIGHEST_PLATFORM_CENTS, LOWEST_MONTHLY_TOTAL_CENTS, LOWEST_PLATFORM_CENTS, KINE_FOLLOW_UP_CENTS, PLATFORM_OFFERS, TRIAL_DAYS, eurosFR } from "@/lib/billing/patientPlans";

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
            <h2 className="font-display font-semibold text-slate-900">3. Deux services distincts</h2>
            <p className="mt-1">
              L&apos;application est gratuite pour le kinésithérapeute. Le patient souscrit deux services distincts, vendus
              par deux vendeurs distincts, qui font l&apos;objet de deux paiements et de deux factures distincts :
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                <strong>l&apos;accès à la plateforme EasyPhysio</strong> ({eurosFR(LOWEST_PLATFORM_CENTS)} € à {eurosFR(HIGHEST_PLATFORM_CENTS)} € TTC par mois selon l&apos;offre),
                vendu par EasyPhysio : application, vidéos, messagerie et hébergement sécurisé des données de santé ;
              </li>
              <li>
                <strong>le programme de son kinésithérapeute</strong> ({eurosFR(KINE_FOLLOW_UP_CENTS)} € par mois), vendu par
                le kinésithérapeute : la mise à jour de son programme d&apos;exercices hors nomenclature.
              </li>
            </ul>
            <p className="mt-2">
              Soit de {eurosFR(LOWEST_MONTHLY_TOTAL_CENTS)} € à {eurosFR(HIGHEST_MONTHLY_TOTAL_CENTS)} € au plus par mois selon l&apos;offre choisie pour l&apos;accès : {PLATFORM_OFFERS.map((o) => `${o.label.toLowerCase()} ${eurosFR(o.platformCents)} €`).join(", ")}. L&apos;engagement ne porte que sur l&apos;accès à la plateforme ; à son terme, l&apos;accès continue au même prix, mois par mois, résiliable à tout moment. EasyPhysio ne perçoit aucune part des
              honoraires du kinésithérapeute, et le kinésithérapeute aucune part de l&apos;accès à la plateforme.
            </p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-slate-900">4. Prix, essai et prélèvements</h2>
            <p className="mt-1">
              À la première souscription, les {TRIAL_DAYS} premiers jours sont offerts : rien n&apos;est prélevé pendant cette
              période, et la date du premier prélèvement est indiquée avant l&apos;enregistrement de la carte. Le patient
              accepte les deux montants par écrit avant de souscrire. Il enregistre sa carte une seule fois : elle sert à
              EasyPhysio pour l&apos;accès et au kinésithérapeute pour ses honoraires.
            </p>
            <p className="mt-2">
              L&apos;accès à la plateforme est prélevé chaque mois par EasyPhysio, tant que l&apos;abonnement est en cours.
              Les honoraires du kinésithérapeute sont prélevés par lui, directement sur son compte, uniquement les mois où
              il met à jour le programme du patient, après la réalisation de cette mise à jour et jamais pendant
              l&apos;essai ; il en délivre une note d&apos;honoraires à son nom. C&apos;est un suivi non remboursé par
              l&apos;Assurance Maladie. Les paiements sont traités par Stripe.
            </p>
            <p className="mt-2">
              Le patient peut résilier à tout moment depuis son espace : il garde l&apos;accès jusqu&apos;à la fin du mois en
              cours, puis plus aucun prélèvement n&apos;a lieu, ni par EasyPhysio ni par son kinésithérapeute. En cas de
              paiement refusé, l&apos;accès est suspendu jusqu&apos;à l&apos;enregistrement d&apos;une carte valide. Les
              soins en cabinet ne dépendent pas de ce suivi, et le patient garde toujours le droit d&apos;exporter ou de
              supprimer ses données.
            </p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-slate-900">5. Comptes et résiliation</h2>
            <p className="mt-1">
              Le patient peut supprimer son compte à tout moment depuis son espace personnel ; son abonnement en cours est
              alors résilié. Le kinésithérapeute peut également supprimer son propre compte à tout moment, sans frais.
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
