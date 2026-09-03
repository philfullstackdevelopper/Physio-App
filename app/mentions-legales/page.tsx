import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import DotCanvas from "@/components/DotCanvas";

// Renders legal/mentions-legales.md for the app. Keep the two in sync by
// hand — this is still a DRAFT pending legal review (see the banner below).
export default function MentionsLegalesPage() {
  return (
    <div className="relative min-h-screen bg-[#f6f8fd] text-slate-800">
      <DotCanvas />
      <div className="relative z-10">
      <SiteHeader />
      <main className="p-6 pt-32 sm:p-8 sm:pt-36">
      <div className="mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <strong>Brouillon.</strong> Les informations ci-dessous sont incomplètes et doivent
          être finalisées avant toute mise en ligne publique.
        </div>

        <h1 className="font-display mt-6 text-2xl font-semibold text-slate-900">Mentions légales</h1>

        <div className="mt-6 space-y-6 text-sm leading-relaxed text-slate-700">
          <section>
            <h2 className="font-display font-semibold text-slate-900">Éditeur du site</h2>
            <p className="mt-1">
              [Raison sociale à compléter], [forme juridique]. Siège social : [adresse].
              Directeur de la publication : [nom]. Contact : [email de contact].
            </p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-slate-900">Hébergement</h2>
            <p className="mt-1">[Hébergeur à confirmer une fois le compte créé].</p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-slate-900">Propriété intellectuelle</h2>
            <p className="mt-1">
              L&apos;ensemble des contenus présents sur EasyPhysio est la propriété de son
              éditeur, sauf mention contraire.
            </p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-slate-900">Crédits</h2>
            <p className="mt-1">
              Certaines illustrations d&apos;exercices proviennent du projet{" "}
              <a
                href="https://github.com/everkinetic/data"
                className="text-blue-700 underline"
              >
                Everkinetic
              </a>
              , enrichi par{" "}
              <a
                href="https://github.com/bryllim/workout-guide"
                className="text-blue-700 underline"
              >
                bryllim/workout-guide
              </a>
              , sous licence{" "}
              <a
                href="https://creativecommons.org/licenses/by-sa/4.0/"
                className="text-blue-700 underline"
              >
                Creative Commons BY-SA 4.0
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-slate-900">Données personnelles</h2>
            <p className="mt-1">
              Voir notre{" "}
              <a href="/confidentialite" className="text-blue-700 underline">
                politique de confidentialité
              </a>
              .
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
