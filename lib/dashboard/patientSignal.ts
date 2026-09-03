// =============================================================================
// Signal d'un patient — partagé par le tableau de bord (« À traiter
// aujourd'hui ») et le tableau des patients (colonne Signal). Une seule
// priorité : douleur > inactivité > à jour. Les deux vues ne peuvent pas se
// contredire parce qu'elles appellent cette fonction.
// =============================================================================

import { daysBetween } from "../format/relativeDay.ts";

export const INACTIVE_DAYS = 7;

export type SignalKind = "pain" | "inactive" | "ok";

export interface SignalInput {
  /** Sortie de `assessSignals` (lib/exercise/stageProgress.ts). */
  concerning: boolean;
  severe: boolean;
  /** Dernière note de douleur (14 jours), pour l'affichage « 7/10 ». */
  lastPain: number | null;
  lastSessionAt: string | null;
  /** `patients.created_at` — un compte de moins de 7 jours n'est jamais « inactif ». */
  createdAt: string;
  now?: Date;
}

export interface Signal {
  kind: SignalKind;
  label: string;
  severe: boolean;
  score: number | null;
  days: number | null;
}

export function computeSignal({ concerning, severe, lastPain, lastSessionAt, createdAt, now = new Date() }: SignalInput): Signal {
  if (concerning) {
    const score = lastPain != null ? Math.round(lastPain) : null;
    return {
      kind: "pain",
      label: score != null ? `Douleur signalée ${score}/10` : "Douleur signalée",
      severe,
      score,
      days: null,
    };
  }

  const accountAge = daysBetween(createdAt, now);
  const days = lastSessionAt ? daysBetween(lastSessionAt, now) : accountAge;
  if (days >= INACTIVE_DAYS && accountAge >= INACTIVE_DAYS) {
    return { kind: "inactive", label: `Aucune séance depuis ${days} jours`, severe: false, score: null, days };
  }
  return { kind: "ok", label: "À jour", severe: false, score: null, days: null };
}
