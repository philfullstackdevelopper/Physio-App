import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import DotCanvas from "@/components/DotCanvas";

// Renders legal/politique-confidentialite.md for the app. Keep the two in
// sync by hand for now — this is still a DRAFT pending legal review (see the
// banner below and the source file's own warning).
export default function ConfidentialitePage() {
  return (
    <div className="relative min-h-screen bg-[#f6f8fd] text-slate-800">
      <DotCanvas />
      <div className="relative z-10">
      <SiteHeader />
      <main className="p-6 pt-32 sm:p-8 sm:pt-36">
      <div className="mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <strong>Brouillon.</strong> Ce document est en cours de rédaction et n&apos;a pas
          encore été validé par un avocat. Il ne constitue pas encore un engagement juridique
          définitif de Physio-App.
        </div>

        <h1 className="font-display mt-6 text-2xl font-semibold text-slate-900">
          Politique de confidentialité — Physio-App
        </h1>

        <div className="mt-6 space-y-6 text-sm leading-relaxed text-slate-700">
          <section>
            <h2 className="font-display font-semibold text-slate-900">1. Qui sommes-nous</h2>
            <p className="mt-1">
              Physio-App est un outil mis à disposition des masseurs-kinésithérapeutes pour
              le suivi d&apos;exercices de leurs patients. Le kinésithérapeute reste le
              professionnel de santé responsable du suivi clinique ; Physio-App est
              l&apos;éditeur de l&apos;outil logiciel.
            </p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-slate-900">2. Données que nous collectons</h2>
            <p className="mt-1">
              Compte et identification (nom, email, mot de passe chiffré) ; données de santé
              (condition, stade de récupération, profil physique, ressenti et douleur,
              séances réalisées, documents médicaux éventuels, messages avec votre
              kinésithérapeute) ; données de facturation, gérées par notre prestataire de
              paiement — nous ne stockons jamais de numéro de carte.
            </p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-slate-900">3. Base légale</h2>
            <p className="mt-1">
              Vos données de santé sont traitées sur la base de votre consentement explicite
              (article 9 du RGPD), recueilli lors de votre inscription. Les données de compte
              et de facturation sont traitées dans le cadre de l&apos;exécution du contrat qui
              nous lie.
            </p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-slate-900">4. Qui a accès à vos données</h2>
            <p className="mt-1">
              Le kinésithérapeute qui vous suit — jamais un autre kinésithérapeute ni un autre
              patient. Cette séparation est appliquée techniquement au niveau de la base de
              données, pas seulement dans l&apos;affichage. Physio-App ne vend ni ne loue
              aucune donnée.
            </p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-slate-900">5. Hébergement et sécurité</h2>
            <p className="mt-1">
              Vos données de santé sont hébergées par un prestataire certifié Hébergeur de
              Données de Santé (HDS), conformément à l&apos;article L.1111-8 du Code de la
              santé publique. Les mots de passe sont chiffrés, jamais stockés en clair.
            </p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-slate-900">6. Durée de conservation</h2>
            <p className="mt-1">
              Vos données sont conservées pendant la durée de votre suivi. En cas de
              suppression de votre compte, elles sont supprimées ou anonymisées, sauf
              obligation légale de conservation plus longue.
            </p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-slate-900">7. Vos droits</h2>
            <p className="mt-1">
              Conformément au RGPD, vous disposez d&apos;un droit d&apos;accès, de
              rectification, d&apos;effacement, de limitation, de portabilité, d&apos;opposition
              et de retrait de votre consentement à tout moment. Vous pouvez également
              introduire une réclamation auprès de la CNIL (cnil.fr).
            </p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-slate-900">8. Intelligence artificielle</h2>
            <p className="mt-1">
              Physio-App n&apos;utilise actuellement aucune intelligence artificielle
              générative traitant vos données de santé personnelles.
            </p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-slate-900">9. Contact</h2>
            <p className="mt-1">
              Pour toute question sur cette politique ou vos données, contactez-nous depuis
              votre compte.
            </p>
          </section>
        </div>
      </div>
      </main>
      <SiteFooter />
      </div>
    </div>
  );
}
