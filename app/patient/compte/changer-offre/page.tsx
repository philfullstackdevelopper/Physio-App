import { redirect } from "next/navigation";

// Ancienne adresse « changer d'offre » (offres patient supprimées) : gardée
// pour les anciens liens, elle mène au compte.
export default function ChangerOffrePage() {
  redirect("/patient/compte");
}
