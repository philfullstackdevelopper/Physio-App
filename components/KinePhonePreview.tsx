// Accueil de la landing, section « Lundi matin, 8 h », sur téléphone
// uniquement (Philippe, 2026-10-26 : « mets la page récapitulative que l'on
// voit quand on est sur téléphone […] dans un vrai téléphone », puis « pouvoir
// cliquer dessus pour le tester […] que la démo se fasse DANS l'appli », puis
// « le format du téléphone est à améliorer »).
//
// Le téléphone contient la vraie démo kiné (/demo/kine : vrais écrans,
// données fictives, rien n'est enregistré), chargée dans un iframe à la taille
// d'un vrai téléphone (360 × 740, sa mise en page téléphone), réduite pour que
// le titre de la section et le téléphone tiennent ensemble dans l'écran.
// DemoShell sait qu'il est dans l'accueil et retire sa pastille Guide.
// La démo n'est chargée qu'à l'approche du téléphone (le `loading="lazy"` du
// navigateur ne se déclenchait pas toujours), avec un filet à 3 s.
"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Wifi, BatteryFull, Signal } from "lucide-react";

const SCREEN_W = 360; // écran simulé : proportions d'un vrai téléphone
const SCREEN_H = 740;
const STATUS_H = 28; // barre d'état (heure, réseau, batterie), avant réduction
// Taille (Philippe, 2026-10-28 : « l'écran pourrait être plus grand ») : le
// téléphone prend toute la largeur disponible, dans la limite de la hauteur de
// l'écran, au lieu de rester à 80 % pour faire tenir le titre de la section
// avec lui. Le titre défile simplement au-dessus.
// Place à garder autour : marges de la page et cadre (largeur) ; en-tête du
// site, cadre, marges et phrase d'aide (hauteur).
const AROUND_W = 48;
const AROUND_H = 136;
const MIN_SCALE = 0.62;
const MAX_SCALE = 1.05;

const subscribeResize = (cb: () => void) => {
  window.addEventListener("resize", cb);
  return () => window.removeEventListener("resize", cb);
};

export default function KinePhonePreview() {
  const viewportH = useSyncExternalStore(subscribeResize, () => window.innerHeight, () => 812);
  const viewportW = useSyncExternalStore(subscribeResize, () => window.innerWidth, () => 375);
  const fitW = (viewportW - AROUND_W) / SCREEN_W;
  const fitH = (viewportH - AROUND_H) / (SCREEN_H + STATUS_H);
  const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.min(fitW, fitH)));

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
    <div ref={boxRef}>
      <div className="relative mx-auto w-fit rounded-[2.6rem] border-[5px] border-slate-900 bg-slate-900 p-[3px] shadow-2xl shadow-blue-900/15">
        <span aria-hidden className="absolute -left-[7px] top-24 h-8 w-1 rounded-l-full bg-slate-900" />
        <span aria-hidden className="absolute -left-[7px] top-36 h-12 w-1 rounded-l-full bg-slate-900" />
        <span aria-hidden className="absolute -right-[7px] top-32 h-16 w-1 rounded-r-full bg-slate-900" />
        <div
          className="relative overflow-hidden rounded-[2.2rem] bg-[#f4f7fc]"
          style={{ width: SCREEN_W * scale, height: (SCREEN_H + STATUS_H) * scale + 4 }}
        >
          {/* Barre d'état + encoche, comme sur un vrai téléphone. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between px-[8%] text-[11px] font-semibold text-slate-900"
            style={{ height: STATUS_H * scale + 4 }}
          >
            <span>8:00</span>
            <span className="h-[18px] w-[30%] rounded-full bg-slate-900" />
            <span className="flex items-center gap-1">
              <Signal className="h-3 w-3" strokeWidth={2.5} />
              <Wifi className="h-3 w-3" strokeWidth={2.5} />
              <BatteryFull className="h-3.5 w-3.5" strokeWidth={2} />
            </span>
          </div>
          <iframe
            src={near ? "/demo/kine" : undefined}
            title="Démo de l'espace kiné, à essayer"
            className="absolute left-0 origin-top-left border-0"
            style={{ top: STATUS_H * scale + 4, width: SCREEN_W, height: SCREEN_H, transform: `scale(${scale})` }}
          />
        </div>
      </div>
      <p className="mt-2.5 text-center text-sm font-medium text-slate-500">
        Touchez l&apos;écran pour essayer : rien n&apos;est enregistré.
      </p>
    </div>
  );
}
