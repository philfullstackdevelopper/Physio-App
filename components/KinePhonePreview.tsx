// Accueil de la landing, section « Lundi matin, 8 h », sur téléphone
// uniquement (Philippe, 2026-10-26 : « mets la page récapitulative que l'on
// voit quand on est sur téléphone […] dans un vrai téléphone », puis « pouvoir
// cliquer dessus pour le tester […] que la démo se fasse DANS l'appli »).
//
// Le téléphone contient la vraie démo kiné (/demo/kine : vrais écrans,
// données fictives, rien n'est enregistré), chargée dans un iframe à la
// largeur d'un téléphone (340 px, donc sa mise en page téléphone), puis
// réduite pour tenir dans le cadre. On peut y naviguer : onglets, fiches,
// bilan… DemoShell sait qu'il est dans l'accueil et retire sa pastille Guide.

// La démo n'est chargée qu'à l'approche du téléphone (le `loading="lazy"`
// du navigateur ne se déclenchait pas toujours, l'écran restait blanc).
"use client";

import { useEffect, useRef, useState } from "react";

const SCREEN_W = 340; // largeur « réelle » de l'écran simulé
const SCREEN_H = 680;
const SCALE = 0.88; // → écran affiché : 299 × 598 px

export default function KinePhonePreview() {
  const boxRef = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: "800px 0px" },
    );
    io.observe(el);
    // Filet de sécurité : chargée de toute façon 3 s après l'ouverture de la
    // page (après le reste, pour ne pas ralentir le haut de l'accueil).
    // Sur ordinateur ce bloc est masqué (sm:hidden) : rien à charger.
    const t = window.setTimeout(() => {
      if (el.offsetParent !== null) setNear(true);
    }, 3000);
    return () => {
      io.disconnect();
      window.clearTimeout(t);
    };
  }, []);

  return (
    <div ref={boxRef} className="mx-auto w-fit">
      <div className="relative rounded-[2.4rem] border-[6px] border-slate-900 bg-slate-900 p-1 shadow-2xl shadow-blue-900/15">
        <span aria-hidden className="absolute -left-[8px] top-20 h-7 w-1.5 rounded-l-full bg-slate-900" />
        <span aria-hidden className="absolute -right-[8px] top-28 h-12 w-1.5 rounded-r-full bg-slate-900" />
        <div
          className="relative overflow-hidden rounded-[2rem] bg-[#f4f7fc]"
          style={{ width: SCREEN_W * SCALE, height: SCREEN_H * SCALE }}
        >
          <div aria-hidden className="pointer-events-none absolute left-1/2 top-2 z-10 h-5 w-20 -translate-x-1/2 rounded-full bg-slate-900" />
          <iframe
            src={near ? "/demo/kine" : undefined}
            title="Démo de l'espace kiné, à essayer"
            className="absolute left-0 top-0 origin-top-left border-0"
            style={{ width: SCREEN_W, height: SCREEN_H, transform: `scale(${SCALE})`, paddingTop: 22 }}
          />
        </div>
      </div>
      <p className="mt-3 text-center text-sm font-medium text-slate-500">
        Touchez l&apos;écran pour essayer : rien n&apos;est enregistré.
      </p>
    </div>
  );
}
