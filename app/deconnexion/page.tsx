import SignOutAndReload from "./SignOutAndReload";

// Page technique : rien à référencer dans les moteurs de recherche.
export const metadata = { robots: { index: false, follow: false } };

// Déconnexion depuis l'en-tête des pages publiques (components/SiteHeaderClient.tsx).
// Ces pages ne chargent plus Clerk (audit vitesse du 2026-11-25) : elles
// envoient ici, où Clerk est chargé (layout.tsx), le temps de déconnecter.
export default function DeconnexionPage() {
  return <SignOutAndReload />;
}
