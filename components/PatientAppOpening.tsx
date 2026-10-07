"use client";

import { useEffect, useState } from "react";
import { LogoMark } from "@/components/Logo";

/**
 * Ouverture douce de l'appli patient sur téléphone (Philippe, 2026-10-07 :
 * « le même feature que sur le web Aurascan, où ça s'ouvre doucement ») :
 * écran plein bleu marine avec le logo, puis fondu vers l'appli. Même esprit
 * que l'ouverture de la landing (IntroSplash), en plus court.
 *
 * - Téléphone uniquement (sm:hidden) : rien ne change sur ordinateur/tablette.
 * - Une fois par visite (sessionStorage) : le script en ligne marque
 *   <html data-app-open-seen> avant le premier affichage, donc en naviguant
 *   d'une page à l'autre on ne revoit jamais l'écran, même un instant.
 * - Un toucher le passe ; « réduire les animations » le supprime.
 */
const KEY = "ep-app-open-seen";
export const APP_OPEN_SEEN_SCRIPT = `try{if(sessionStorage.getItem("${KEY}")==="1")document.documentElement.dataset.appOpenSeen="1"}catch(e){}`;
const TOTAL_MS = 1300;

export default function PatientAppOpening() {
  const [gone, setGone] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (document.documentElement.dataset.appOpenSeen === "1") {
      setGone(true);
      return;
    }
    try {
      sessionStorage.setItem(KEY, "1");
    } catch {}
    const leave = window.setTimeout(() => setLeaving(true), TOTAL_MS - 500);
    const done = window.setTimeout(() => setGone(true), TOTAL_MS);
    return () => {
      window.clearTimeout(leave);
      window.clearTimeout(done);
    };
  }, []);

  if (gone) return null;

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: APP_OPEN_SEEN_SCRIPT }} />
      <style>{`
        html[data-app-open-seen="1"] .ep-app-open { display: none; }
        @media (prefers-reduced-motion: reduce) { .ep-app-open { display: none; } }
        @keyframes ep-app-open-in { 0% { opacity: 0; transform: scale(.88); } 100% { opacity: 1; transform: none; } }
      `}</style>
      <div
        role="presentation"
        onClick={() => {
          setLeaving(true);
          window.setTimeout(() => setGone(true), 450);
        }}
        className={`ep-app-open fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0f2a5c] transition-opacity duration-500 ease-out sm:hidden ${
          leaving ? "opacity-0" : ""
        }`}
      >
        <div className="flex items-center gap-3" style={{ animation: "ep-app-open-in .5s cubic-bezier(.2,.8,.2,1) both" }}>
          <LogoMark size={52} />
          <p className="text-4xl tracking-[-0.02em] text-white" style={{ fontFamily: "var(--font-brand)" }}>
            <span className="font-extrabold">Easy</span>
            <span className="font-medium">Physio</span>
          </p>
        </div>
      </div>
    </>
  );
}
