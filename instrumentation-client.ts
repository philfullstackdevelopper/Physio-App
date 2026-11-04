// Mesure d'audience PostHog (Philippe, 2026-11-04) — règles dans
// lib/analytics/privacy.ts. Ne charge rien tant que NEXT_PUBLIC_POSTHOG_KEY
// n'est pas défini (clé publique du projet PostHog, région UE).
//
// Sans cookie : persistence « memory » ne stocke rien sur l'appareil du
// visiteur (pas de cookie, pas de localStorage) — d'où l'absence de bandeau
// de consentement (CNIL). Contrepartie : un visiteur qui revient compte comme
// un nouveau visiteur. Jamais d'enregistrement d'écran ni de sondage, et
// aucun visiteur n'est identifié (pas de posthog.identify).
//
// Les envois passent par /ingest sur notre propre domaine (réécrit vers
// PostHog UE dans next.config.ts) : l'adresse IP du visiteur n'est pas
// transmise directement à PostHog, et les bloqueurs de pub ne coupent pas la
// mesure.

import posthog from "posthog-js";
import { scrubEvent } from "@/lib/analytics/privacy";

const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;

if (key) {
  try {
    posthog.init(key, {
      api_host: "/ingest",
      ui_host: "https://eu.posthog.com",
      defaults: "2026-08-30",
      persistence: "memory",
      person_profiles: "never",
      capture_pageview: "history_change",
      capture_pageleave: true,
      autocapture: true,
      mask_all_text: true,
      mask_all_element_attributes: true,
      disable_session_recording: true,
      disable_surveys: true,
      disable_product_tours: true,
      disable_conversations: true,
      disable_web_experiments: true,
      capture_exceptions: false,
      advanced_disable_flags: true,
      respect_dnt: true,
      before_send: (event) => scrubEvent(event, window.location.pathname),
    });
  } catch {
    // La mesure d'audience ne doit jamais casser le site.
  }
}
