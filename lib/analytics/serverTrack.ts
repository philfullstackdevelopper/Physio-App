import "server-only";
import { randomUUID } from "node:crypto";

// Étapes clés envoyées à PostHog DEPUIS LE SERVEUR (Philippe, 2026-11-16 :
// « voir quand les gens s'inscrivent, s'ils s'inscrivent »). Plus fiable que
// le navigateur : un bloqueur ou une page fermée trop tôt ne fait rien rater.
//
// Mêmes règles que lib/analytics/track.ts : jamais de nom, d'e-mail ni
// d'identifiant. Chaque événement porte un identifiant tiré au hasard et
// aucun profil de personne n'est créé ($process_person_profile: false) —
// on compte des inscriptions, on ne suit personne. Sans clé PostHog, ne fait
// rien ; ne lève jamais d'erreur et n'attend pas plus de 3 secondes.

export type ServerEvent =
  | "kine_compte_cree" // compte créé (fiche kiné en base), cabinet pas forcément renseigné
  | "kine_inscription_terminee"; // cabinet renseigné, compte validé → arrive dans l'appli

export async function trackServer(event: ServerEvent, props: Record<string, string | number | boolean> = {}): Promise<void> {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return;
  try {
    await fetch("https://eu.i.posthog.com/i/v0/e/", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        api_key: key,
        event,
        distinct_id: randomUUID(),
        properties: { ...props, $process_person_profile: false, $lib: "easyphysio-server" },
      }),
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    // La mesure ne doit jamais gêner l'inscription.
  }
}
