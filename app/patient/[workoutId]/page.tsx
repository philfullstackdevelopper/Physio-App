import { redirect } from "next/navigation";

// L'ancienne page d'aperçu de la séance (liste des exercices + « Commencer la
// séance ») a été retirée (Philippe, 2026-10-01) : les boutons « Démarrer »
// lancent directement la séance guidée. Cette route ne sert plus qu'à
// rediriger les anciens liens.
export default async function WorkoutRedirect({ params }: { params: Promise<{ workoutId: string }> }) {
  const { workoutId } = await params;
  redirect(`/patient/${workoutId}/seance`);
}
