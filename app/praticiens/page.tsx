import { permanentRedirect } from "next/navigation";

// Ancienne seconde page d'accueil pour les kinés : plus liée nulle part et au
// texte dépassé. Redirection définitive (308) vers l'accueil, qui a sa propre
// section praticiens (Philippe, 2026-11-06 : audit, on allège).
export default function PraticiensPage() {
  permanentRedirect("/");
}
