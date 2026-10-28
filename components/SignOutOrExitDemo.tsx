"use client";

import Link from "next/link";
import { SignOutButton } from "@clerk/nextjs";
import { useIsDemo } from "@/components/DemoContext";

// Le bouton « Se déconnecter » de l'appli (kiné et patient, ordinateur et
// téléphone, onboarding, Paramètres). Dans la démo publique, il devient
// « Quitter la démo » et ramène à la page d'accueil (Philippe, 2026-10-28 :
// on doit pouvoir quitter la démo de partout). `_top` : depuis la démo
// affichée dans le téléphone de l'accueil (iframe), c'est toute la page qui
// revient à l'accueil, pas l'intérieur du petit téléphone.
// `before` / `after` : icônes autour du libellé (de simples éléments, pour
// pouvoir être utilisé aussi depuis une page rendue côté serveur).
export default function SignOutOrExitDemo({
  className,
  labelClassName,
  before,
  after,
}: {
  className: string;
  labelClassName?: string;
  before?: React.ReactNode;
  after?: React.ReactNode;
}) {
  const isDemo = useIsDemo();
  const content = (label: string) => (
    <>
      {before}
      {labelClassName ? <span className={labelClassName}>{label}</span> : label}
      {after}
    </>
  );
  if (isDemo) {
    return (
      <Link href="/" target="_top" data-demo-exit="" className={className}>
        {content("Quitter la démo")}
      </Link>
    );
  }
  return (
    <SignOutButton redirectUrl="/login">
      <button type="button" className={className}>
        {content("Se déconnecter")}
      </button>
    </SignOutButton>
  );
}
