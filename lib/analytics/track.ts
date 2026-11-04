// Actions clés envoyées à PostHog sous un nom clair (Philippe, 2026-11-04),
// pour les entonnoirs, les alertes et les messages Discord. Jamais de nom,
// d'e-mail ni d'identifiant dans les propriétés : seulement des catégories.
// Sans clé PostHog (posthog non chargé), ne fait rien.

import posthog from "posthog-js";

export type TrackedEvent =
  | "liste_attente_inscription" // { role: "kine" | "patient" }
  | "demo_ouverte" // { espace: "kine" | "patient" }
  | "seance_creee"
  | "seance_modifiee"
  | "seance_ajustee_patient";

export function track(event: TrackedEvent, props: Record<string, string | number | boolean> = {}) {
  try {
    if (!posthog.__loaded) return;
    posthog.capture(event, { ...props, demo: window.location.pathname.startsWith("/demo") });
  } catch {
    // La mesure ne doit jamais gêner l'utilisateur.
  }
}
