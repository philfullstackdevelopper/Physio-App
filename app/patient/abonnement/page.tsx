import { redirect } from "next/navigation";

// Ancienne adresse des offres patient (supprimées) : gardée pour les anciens
// liens, elle mène au suivi mensuel payé au kiné.
export default function AbonnementPage() {
  redirect("/patient/suivi");
}
