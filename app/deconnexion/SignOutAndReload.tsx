"use client";

import { useEffect, useRef } from "react";
import { useClerk } from "@clerk/nextjs";

// Déconnecte, puis RECHARGE l'accueil pour de bon (et non une navigation
// interne) : aucune page préchargée « connecté » ne reste en mémoire, et
// l'en-tête repasse à « Se connecter » (Philippe, 2026-10-12).
export default function SignOutAndReload() {
  const { loaded, signOut } = useClerk();
  const started = useRef(false);

  useEffect(() => {
    if (!loaded || started.current) return;
    started.current = true;
    signOut()
      .catch((e) => console.error("Déconnexion :", e))
      .finally(() => {
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- rechargement complet VOULU (voir plus haut).
        window.location.assign("/");
      });
  }, [loaded, signOut]);

  // Même fond que l'accueil, sans rien d'autre : l'étape dure une seconde.
  return <main className="min-h-dvh bg-[#f6f8fd]" aria-busy="true" />;
}
