"use client";

import { useEffect, useState } from "react";

// Standard, low-key cookie notice — typical pattern on French/EU sites.
// Physio-App only uses essential authentication cookies today (no
// analytics/advertising trackers), which under CNIL guidance don't require
// an opt-in choice, just information. If that ever changes (analytics,
// etc.), this needs a real accept/reject choice, not just a dismiss button.
const STORAGE_KEY = "physio-app-cookie-notice-dismissed";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)) return;
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 p-4 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] backdrop-blur">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 text-sm text-slate-600 sm:flex-row sm:justify-between">
        <p>
          Ce site utilise uniquement des cookies essentiels au fonctionnement de votre
          connexion, aucun cookie publicitaire ou de mesure d&apos;audience.{" "}
          <a href="/confidentialite" className="text-blue-700 underline">
            En savoir plus
          </a>
          .
        </p>
        <button
          onClick={() => {
            localStorage.setItem(STORAGE_KEY, "1");
            setVisible(false);
          }}
          className="shrink-0 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Compris
        </button>
      </div>
    </div>
  );
}
