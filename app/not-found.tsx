import Link from "next/link";
import { ArrowRight } from "lucide-react";
import ExerciseIllustration from "@/components/ExerciseIllustration";
import { LogoLockup } from "@/components/Logo";

// Page introuvable — avec un dessin d'exercice et une phrase à nous, plutôt
// que le « 404 » brut de Next (Philippe, 2026-10-10 : rendre le site moins
// générique, plus chaleureux).
export const metadata = { title: "Page introuvable" };

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-[#f6f8fd] px-6 text-center">
      <Link href="/" aria-label="EasyPhysio — accueil">
        <LogoLockup height={30} />
      </Link>
      <ExerciseIllustration name="Lying Torso Rotation" animate className="mt-8 h-40 w-56 text-blue-600" />
      <h1 className="font-display mt-6 text-3xl font-semibold text-slate-900">Cette page s&apos;est étirée un peu trop loin.</h1>
      <p className="mt-3 max-w-sm leading-relaxed text-slate-600">
        Elle n&apos;existe pas, ou plus. Rien de cassé de votre côté : on reprend depuis le début.
      </p>
      <Link
        href="/"
        className="mt-7 inline-flex items-center justify-center gap-1.5 rounded-full bg-blue-600 px-6 py-3 font-medium text-white shadow-sm transition hover:bg-blue-700 active:scale-95"
      >
        Revenir à l&apos;accueil
        <ArrowRight className="h-4 w-4" strokeWidth={2} />
      </Link>
    </main>
  );
}
