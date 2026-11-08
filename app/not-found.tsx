import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import ExerciseIllustration from "@/components/ExerciseIllustration";
import { LogoLockup } from "@/components/Logo";

// Page introuvable — avec un dessin d'exercice et une phrase à nous, plutôt
// que le « 404 » brut de Next (Philippe, 2026-10-10 : rendre le site moins
// générique, plus chaleureux). Textes : home.notFound.
export async function generateMetadata() {
  const t = await getTranslations("home.notFound");
  return { title: t("metaTitle") };
}

export default async function NotFound() {
  const t = await getTranslations("home.notFound");
  const tLogo = await getTranslations("home.logo");
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-[#f6f8fd] px-6 text-center">
      <Link href="/" aria-label={tLogo("homeAria")}>
        <LogoLockup height={30} />
      </Link>
      <ExerciseIllustration name="Lying Torso Rotation" animate className="mt-8 h-40 w-56 text-blue-600" />
      <h1 className="font-display mt-6 text-3xl font-semibold text-slate-900">{t("title")}</h1>
      <p className="mt-3 max-w-sm leading-relaxed text-slate-600">
        {t("body")}
      </p>
      <Link
        href="/"
        className="mt-7 inline-flex items-center justify-center gap-1.5 rounded-full bg-blue-600 px-6 py-3 font-medium text-white shadow-sm transition hover:bg-blue-700 active:scale-95"
      >
        {t("back")}
        <ArrowRight className="h-4 w-4" strokeWidth={2} />
      </Link>
    </main>
  );
}
