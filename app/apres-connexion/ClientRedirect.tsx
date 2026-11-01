"use client";

import { useEffect, useState } from "react";

// Page de passage juste après la connexion : envoie le kiné vers /dashboard et
// le patient vers /patient.
//
// Chargement COMPLET de la page (window.location.replace), pas une navigation
// interne du routeur : la navigation interne pouvait rester bloquée et laisser
// un écran blanc (Philippe, 2026-11-01, sur ordinateur — même cause que l'écran
// blanc corrigé après « J'accepte et je continue », voir
// components/PatientWelcomeGate.tsx). Le léger délai laisse la connexion Clerk
// se terminer avant de partir.
//
// Jamais d'écran vide : un message s'affiche tout de suite, et un lien de
// secours apparaît si la page ne s'est pas ouverte au bout de 4 secondes.
export default function ClientRedirect({ to }: { to: string }) {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const go = setTimeout(() => window.location.replace(to), 50);
    const fallback = setTimeout(() => setSlow(true), 4000);
    return () => {
      clearTimeout(go);
      clearTimeout(fallback);
    };
  }, [to]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f8fd] p-6">
      <div className="text-center">
        <p className="text-sm font-medium text-slate-600">Connexion en cours…</p>
        {slow && (
          <a href={to} className="mt-3 inline-block text-sm font-medium text-blue-700 underline underline-offset-2">
            La page ne s&apos;ouvre pas ? Cliquez ici
          </a>
        )}
      </div>
    </main>
  );
}
