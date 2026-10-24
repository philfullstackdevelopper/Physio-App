import { redirect } from "next/navigation";

// Nouveau modèle (2026-10-24) : plus d'offres patient, donc rien à changer.
// ChangerOffreView.tsx reste seulement pour la galerie /prototypes.
export default function ChangerOffrePage() {
  redirect("/patient/compte");
}
