"use client";

import { useEffect, useState } from "react";

/**
 * Ouverture de la landing (Philippe, 2026-10-07 : « comme Aurascan — ça
 * commence avec les lettres, et après on arrive à la page d'accueil ») :
 * l'icône apparaît, « EasyPhysio » s'écrit lettre par lettre, puis le voile
 * glisse vers le haut et découvre la page.
 *
 * - Une seule fois par visite (sessionStorage) : le script en ligne marque
 *   <html data-intro-seen> AVANT le premier affichage, donc un visiteur qui
 *   revient sur la page ne voit jamais le voile, même une fraction de seconde.
 * - Un clic ou une touche le passe ; « réduire les animations » le supprime.
 * - ~2,2 s au total : plus long, ça agace.
 */
const KEY = "ep-intro-seen";
/** À placer dans la page (composant serveur), juste avant <IntroSplash /> :
 *  s'exécute pendant la lecture du HTML, avant le premier affichage. */
export const INTRO_SEEN_SCRIPT = `try{if(sessionStorage.getItem("${KEY}")==="1")document.documentElement.dataset.introSeen="1"}catch(e){}`;
const LETTERS = [..."Easy"].map((c) => ({ c, bold: true })).concat([..."Physio"].map((c) => ({ c, bold: false })));
const TOTAL_MS = 1900;

export default function IntroSplash() {
  const [gone, setGone] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (document.documentElement.dataset.introSeen === "1") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- l'état « déjà vu » ne se lit qu'après l'affichage (sessionStorage) ; le lire plus tôt ferait différer le rendu serveur et navigateur.
      setGone(true);
      return;
    }
    try {
      sessionStorage.setItem(KEY, "1");
    } catch {}
    const leave = window.setTimeout(() => setLeaving(true), TOTAL_MS - 600);
    const done = window.setTimeout(() => setGone(true), TOTAL_MS);
    const skip = () => {
      setLeaving(true);
      window.setTimeout(() => setGone(true), 450);
    };
    window.addEventListener("keydown", skip, { once: true });
    return () => {
      window.clearTimeout(leave);
      window.clearTimeout(done);
      window.removeEventListener("keydown", skip);
    };
  }, []);

  if (gone) return null;

  return (
    <>
      <style>{`
        html[data-intro-seen="1"] .ep-intro { display: none; }
        @media (prefers-reduced-motion: reduce) { .ep-intro { display: none; } }
        @keyframes ep-intro-icon { 0% { opacity: 0; transform: scale(.6) rotate(-8deg); } 60% { opacity: 1; transform: scale(1.06); } 100% { opacity: 1; transform: scale(1); } }
        @keyframes ep-intro-letter { 0% { opacity: 0; transform: translateY(10px); } 100% { opacity: 1; transform: none; } }
        @keyframes ep-intro-tag { 0% { opacity: 0; letter-spacing: .5em; } 100% { opacity: 1; letter-spacing: .28em; } }
      `}</style>
      <div
        role="presentation"
        onClick={() => {
          setLeaving(true);
          window.setTimeout(() => setGone(true), 450);
        }}
        // Fond plein couleur marque, puis fondu (Philippe, 2026-10-07 : « pop up
        // cleanly like Aurascan ») — plus de glissement vers le haut.
        className={`ep-intro fixed inset-0 z-[100] flex cursor-pointer flex-col items-center justify-center bg-[#0f2a5c] transition-[opacity,transform] duration-500 ease-out ${
          leaving ? "scale-[1.04] opacity-0" : ""
        }`}
      >
        <div className="flex items-center gap-4 sm:gap-5">
          {/* eslint-disable-next-line @next/next/no-img-element -- PNG statique */}
          <img
            src="/brand/easyphysio-icon.png"
            alt=""
            width={72}
            height={72}
            className="h-14 w-14 sm:h-[72px] sm:w-[72px]"
            style={{ animation: "ep-intro-icon .55s cubic-bezier(.2,.8,.2,1) both" }}
          />
          <p aria-label="EasyPhysio" className="text-4xl tracking-[-0.02em] text-white sm:text-6xl" style={{ fontFamily: "var(--font-brand)" }}>
            {LETTERS.map((l, i) => (
              <span
                key={i}
                aria-hidden
                className={`inline-block ${l.bold ? "font-extrabold" : "font-medium"}`}
                style={{ animation: `ep-intro-letter .35s cubic-bezier(.2,.8,.2,1) ${0.25 + i * 0.045}s both` }}
              >
                {l.c}
              </span>
            ))}
          </p>
        </div>
        <p
          className="mt-5 text-[11px] font-medium uppercase text-white/60 sm:text-xs"
          style={{ animation: "ep-intro-tag .6s ease-out .8s both", letterSpacing: ".28em" }}
        >
          Rééducation · Progression · Bien-être
        </p>
      </div>
    </>
  );
}
