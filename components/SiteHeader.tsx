import { auth } from "@clerk/nextjs/server";
import SiteHeaderClient from "@/components/SiteHeaderClient";

// En-tête des pages publiques (accueil, guides, pages légales). Savoir si la
// personne est connectée (« Mon espace » au lieu de « Se connecter ») se fait
// ici, côté serveur, avec la session déjà lue par proxy.ts : plus besoin de
// charger le code de Clerk dans le navigateur (audit vitesse du 2026-11-25).
export default async function SiteHeader() {
  const { userId } = await auth();
  return <SiteHeaderClient signedIn={Boolean(userId)} />;
}
