"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LoaderCircle } from "lucide-react";

// « Problème de connexion » : presque toujours une panne de quelques secondes
// (Clerk n'a pas répondu à temps). Plutôt que de laisser la personne devant
// un message d'erreur, on réessaie tout seul, deux fois, avant de lui
// demander quoi que ce soit (2026-10-10 — un patient invité est resté bloqué
// là en pleine inscription). Le compteur vit dans sessionStorage et repart de
// zéro au bout d'une minute, pour ne jamais tourner en boucle.
const KEY = "ep-connection-retry";
const MAX_AUTO = 2;
const DELAYS_MS = [1200, 3000];

function readAttempts(): number {
  try {
    const raw = JSON.parse(sessionStorage.getItem(KEY) ?? "null") as { n: number; at: number } | null;
    return raw && Date.now() - raw.at < 60_000 ? raw.n : 0;
  } catch {
    return 0;
  }
}

export default function ConnectionRetry({ retryHref }: { retryHref: string }) {
  // null = pas encore décidé (premier rendu, identique côté serveur).
  const [auto, setAuto] = useState<boolean | null>(null);

  useEffect(() => {
    const attempts = readAttempts();
    if (attempts >= MAX_AUTO) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- le compteur ne se lit qu'après l'affichage (sessionStorage).
      setAuto(false);
      return;
    }
    setAuto(true);
    try {
      sessionStorage.setItem(KEY, JSON.stringify({ n: attempts + 1, at: Date.now() }));
    } catch {
      /* stockage indisponible : on réessaie quand même une fois */
    }
    // Rechargement complet (pas de navigation interne) : la session Clerk est
    // relue depuis zéro par le serveur.
    const timer = window.setTimeout(() => window.location.replace(retryHref), DELAYS_MS[attempts] ?? 3000);
    return () => window.clearTimeout(timer);
  }, [retryHref]);

  if (auto !== false) {
    return (
      <div className="mt-6 flex flex-col items-center gap-3" role="status" aria-live="polite">
        <LoaderCircle className="h-6 w-6 animate-spin text-blue-600" strokeWidth={2} />
        <p className="text-sm text-slate-500">Nouvelle tentative en cours…</p>
      </div>
    );
  }

  return (
    <>
      {/* Lien classique (<a>) : rechargement complet, voir plus haut. */}
      <a
        href={retryHref}
        className="mt-6 block w-full rounded-xl bg-blue-600 py-2.5 font-medium text-white shadow-sm transition hover:bg-blue-700"
      >
        Réessayer
      </a>
      <Link href="/login" className="mt-3 block text-sm text-slate-500 hover:underline">
        Ou se reconnecter
      </Link>
    </>
  );
}
