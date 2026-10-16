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
