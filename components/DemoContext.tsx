"use client";

import { createContext, useContext } from "react";

// Démo publique (components/DemoShell.tsx) : réécrit une adresse de l'appli
// vers l'écran de démo correspondant. Hors démo, l'adresse reste telle quelle.
// À utiliser pour les navigations faites en JavaScript (router.push), que
// DemoShell ne peut pas intercepter comme un clic sur un lien.
export const DemoHrefContext = createContext<(href: string) => string>((href) => href);

export function useAppHref() {
  return useContext(DemoHrefContext);
}

// Vrai seulement à l'intérieur de la démo publique (DemoShell). Sert à
// remplacer « Se déconnecter » par « Quitter la démo » (Philippe, 2026-10-28).
export const DemoModeContext = createContext(false);

export function useIsDemo() {
  return useContext(DemoModeContext);
}
