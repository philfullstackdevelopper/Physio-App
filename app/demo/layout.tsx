import type { Metadata } from "next";

// Démo publique de l'appli (données fictives, rien n'est enregistré) : pas
// d'indexation par les moteurs de recherche, l'accueil du site y mène.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
