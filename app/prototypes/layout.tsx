import type { Metadata } from "next";
import ClerkShell from "@/components/ClerkShell";

// Pages d'aperçu avec des données FICTIVES (pour juger un écran sans se
// connecter) : jamais indexées par les moteurs de recherche (audit du
// 2026-10-08 — deux d'entre elles ne le précisaient pas). Aussi exclues dans
// app/robots.ts.
export const metadata: Metadata = { robots: { index: false, follow: false } };

// Ces aperçus affichent des écrans de l'appli (bouton « Se déconnecter »…) :
// Clerk y est chargé (audit vitesse du 2026-11-25, components/ClerkShell.tsx).
export default function PrototypesLayout({ children }: { children: React.ReactNode }) {
  return <ClerkShell>{children}</ClerkShell>;
}
