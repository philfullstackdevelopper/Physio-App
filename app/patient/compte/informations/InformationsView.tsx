import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";

function Field({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="border-t border-line py-3 first:border-t-0 first:pt-0">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-sm text-ink">{value}</p>
    </div>
  );
}

// Affichage seul de « Mes informations » (les données viennent de page.tsx) —
// séparé pour pouvoir le prévisualiser avec des données fictives sans
// connexion (/prototypes/patient-ecrans?ecran=informations).
//
// Une page = un écran (audit des formats, 2026-10-10) : l'en-tête reste en
// place, seules les deux cartes défilent si elles dépassent.
export default function InformationsView({
  name,
  email,
  situation,
}: {
  name: string | null;
  email: string | null;
  /** Les lignes de « Votre situation », dans l'ordre ; une valeur vide n'est pas affichée. */
  situation: { label: string; value: string | null }[];
}) {
  return (
    <main className="flex flex-col bg-app-bg p-6 max-sm:h-[calc(100dvh-var(--phone-chrome))] max-sm:p-4 sm:h-dvh sm:p-8 short:sm:py-4">
      <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col">
        <Link href="/patient/compte" className="inline-flex items-center gap-1.5 self-start text-sm font-medium text-muted hover:text-ink">
          <ArrowLeft className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          Retour aux paramètres
        </Link>

        <h1 className="mt-4 text-2xl font-semibold text-ink short:mt-2">Mes informations</h1>
        <p className="mt-1 text-sm text-muted">Vos coordonnées et votre situation, telles que renseignées à l&rsquo;inscription.</p>

        <div className="-mx-1 mt-6 min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 pb-1 short:mt-3">
          <section className="rounded-2xl border border-line bg-surface p-6 shadow-sm max-sm:p-4 short:p-4">
            <h2 className="font-medium text-ink">Coordonnées</h2>
            <div className="mt-3">
              <Field label="Nom" value={name} />
              <Field label="E-mail" value={email} />
            </div>
            <p className="mt-3 text-xs text-muted">
              Le nom et l&rsquo;e-mail sont ceux de votre compte de connexion — contactez votre kinésithérapeute pour les corriger.
            </p>
          </section>

          <section className="mt-5 rounded-2xl border border-line bg-surface p-6 shadow-sm max-sm:mt-3 max-sm:p-4 short:mt-3 short:p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-medium text-ink">Votre situation</h2>
              <Link href="/patient/onboarding" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline">
                <Pencil className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                Modifier
              </Link>
            </div>
            <div className="mt-3">
              {situation.map((f) => (
                <Field key={f.label} label={f.label} value={f.value} />
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
