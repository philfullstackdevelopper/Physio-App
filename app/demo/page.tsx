import Link from "next/link";
import { ArrowRight, HeartPulse, Stethoscope } from "lucide-react";
import { LogoLockup } from "@/components/Logo";

// Entrée de la démo publique (2026-10-16) : le visiteur choisit l'espace à
// visiter. Données fictives, rien n'est enregistré (voir components/DemoShell.tsx).
export const metadata = { title: "Essayer la démo" };

const CHOICES = [
  {
    href: "/demo/kine",
    icon: Stethoscope,
    title: "Espace kiné",
    body: "La liste de vos patients, la frise de chaque patient, l'ajustement d'une séance et les messages.",
  },
  {
    href: "/demo/patient",
    icon: HeartPulse,
    title: "Espace patient",
    body: "Ce que voit votre patient : son programme de la semaine, la séance guidée et ses progrès.",
  },
];

export default function DemoPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-[#f6f8fd] px-4 py-8 short:py-4">
      <Link href="/" aria-label="Accueil EasyPhysio">
        <LogoLockup height={36} />
      </Link>
      <h1 className="font-display mt-6 short:mt-3 text-center text-2xl font-semibold text-slate-900 sm:text-3xl">Essayer EasyPhysio</h1>
      <p className="mt-2 max-w-md text-center text-sm leading-relaxed text-slate-600">
        Les vrais écrans de l&apos;appli, avec des patients fictifs. Pas de compte à créer, et rien de ce que vous faites
        n&apos;est enregistré.
      </p>

      <div className="mt-6 grid w-full max-w-2xl gap-3 sm:mt-8 sm:grid-cols-2 sm:gap-4 short:mt-4">
        {CHOICES.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md sm:p-6 short:p-4"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 text-blue-600">
              <c.icon className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <span className="mt-3 text-lg font-semibold text-slate-900">{c.title}</span>
            <span className="mt-1 flex-1 text-sm leading-relaxed text-slate-600 max-sm:short:hidden">{c.body}</span>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-blue-700 short:mt-2">
              Ouvrir
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2} />
            </span>
          </Link>
        ))}
      </div>

      <Link href="/" className="mt-6 text-sm font-medium text-slate-500 hover:text-slate-800 short:mt-4">
        Retour à l&apos;accueil
      </Link>
    </main>
  );
}
