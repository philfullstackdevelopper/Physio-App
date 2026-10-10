"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Ouverture de la landing (Philippe, 2026-10-07 : « comme Aurascan — ça
 * commence avec les lettres, et après on arrive à la page d'accueil ») :
 * l'icône apparaît, « EasyPhysio » s'écrit lettre par lettre, puis le voile
 * glisse vers le haut et découvre la page.
 *
 * - À chaque chargement (ou rechargement) de la page d'accueil, mais pas en
 *   y revenant par un lien interne (retour depuis /login…) : `played`
 *   ci-dessous vit le temps de la page chargée. Avant le 2026-10-10 c'était
 *   « une fois par visite » (sessionStorage + balise <script>) : Philippe
 *   rechargeait la page, ne voyait qu'un éclair bleu et croyait l'ouverture
 *   cassée ; et la balise <script> déclenchait une erreur React.
 * - Un clic ou une touche le passe ; « réduire les animations » le supprime.
 * - ~3,4 s au total (Philippe, 2026-10-10 : « leave that for 2 seconds, with
 *   a little animation for the writing of the letters, then smoothly move to
 *   accueil ») : le nom s'écrit en ~1,3 s, la devise suit, le tout reste
 *   affiché, puis un fondu lent (FADE_MS) découvre la page.
 */
/** L'ouverture a déjà été jouée depuis le dernier chargement complet. */
let played = false;
const LETTERS = [..."Easy"].map((c) => ({ c, bold: true })).concat([..."Physio"].map((c) => ({ c, bold: false })));
/** Fin de l'écriture + temps de lecture, avant le début du fondu. */
const HOLD_MS = 2600;
/** Durée du fondu vers la page (même valeur que la transition CSS ci-dessous). */
const FADE_MS = 800;

export default function IntroSplash() {
  const [gone, setGone] = useState(false);
  const [leaving, setLeaving] = useState(false);
  // Vrai dès que CE montage a lancé l'ouverture : en développement React
  // rejoue l'effet une 2e fois, qui lirait sinon « déjà jouée » et couperait
  // l'ouverture à peine commencée.
  const started = useRef(false);

  useEffect(() => {
    if (played && !started.current) {
      setGone(true);
      return;
    }
    played = true;
    started.current = true;
    const leave = window.setTimeout(() => setLeaving(true), HOLD_MS);
    const done = window.setTimeout(() => setGone(true), HOLD_MS + FADE_MS);
    const skip = () => {
      setLeaving(true);
      window.setTimeout(() => setGone(true), FADE_MS);
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
        @media (prefers-reduced-motion: reduce) { .ep-intro { display: none; } }
        @keyframes ep-intro-icon { 0% { opacity: 0; transform: scale(.6) rotate(-8deg); } 60% { opacity: 1; transform: scale(1.06); } 100% { opacity: 1; transform: scale(1); } }
        @keyframes ep-intro-letter { 0% { opacity: 0; transform: translateY(8px); filter: blur(6px); } 100% { opacity: 1; transform: none; filter: blur(0); } }
        @keyframes ep-intro-tag { 0% { opacity: 0; letter-spacing: .5em; } 100% { opacity: 1; letter-spacing: .28em; } }
      `}</style>
      <div
        role="presentation"
        onClick={() => {
          setLeaving(true);
          window.setTimeout(() => setGone(true), FADE_MS);
        }}
        // Fond plein couleur marque, puis fondu (Philippe, 2026-10-07 : « pop up
        // cleanly like Aurascan ») — plus de glissement vers le haut.
        className={`ep-intro fixed inset-0 z-[100] flex cursor-pointer flex-col items-center justify-center bg-[#0f2a5c] transition-[opacity,transform] duration-[800ms] ease-in-out ${
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
                style={{ animation: `ep-intro-letter .45s cubic-bezier(.2,.8,.2,1) ${0.3 + i * 0.09}s both` }}
              >
                {l.c}
              </span>
            ))}
          </p>
        </div>
        <p
          className="mt-5 text-[11px] font-medium uppercase text-white/60 sm:text-xs"
          style={{ animation: "ep-intro-tag .7s ease-out 1.35s both", letterSpacing: ".28em" }}
        >
          Rééducation · Progression · Bien-être
        </p>
      </div>
    </>
  );
}
