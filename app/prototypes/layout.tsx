import type { Metadata } from "next";

// Pages d'aperçu avec des données FICTIVES (pour juger un écran sans se
// connecter) : jamais indexées par les moteurs de recherche (audit du
// 2026-10-08 — deux d'entre elles ne le précisaient pas). Aussi exclues dans
// app/robots.ts.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function PrototypesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
