import { redirect } from "next/navigation";

// Nouveau modèle (2026-10-24) : plus d'offre patient à choisir — l'appli est
// offerte par le kiné. L'ancienne page des offres (Essentiel / Standard /
// Premium, 15 % de commission) renvoie vers le suivi mensuel, payé au kiné.
// AbonnementView.tsx reste seulement pour la galerie /prototypes.
export default function AbonnementPage() {
  redirect("/patient/suivi");
}
