// =============================================================================
// AI-assisted protocol generator — types + mock knowledge base.
// -----------------------------------------------------------------------------
// This module defines the contract for turning a clinical input like
// "Ankle Sprain Stage 2" into a recommended set of exercises + dosages.
//
// For now it returns PREDEFINED protocols (a deterministic mock) so the physio
// dashboard and UI can be built and tested end-to-end. Swapping the mock for a
// real Claude API call later is a drop-in: keep `generateProtocol()`'s
// signature and replace its body (see the // TODO(ai) marker).
// =============================================================================

/** Rehabilitation stages, aligned with the Prisma `InjuryStage` enum. */
export type InjuryStage = "ACUTE" | "SUBACUTE" | "RECOVERY" | "RETURN_TO_SPORT";

/** Numeric stage aliases physios often type ("stage 1".."stage 4"). */
export const STAGE_BY_NUMBER: Record<number, InjuryStage> = {
  1: "ACUTE",
  2: "SUBACUTE",
  3: "RECOVERY",
  4: "RETURN_TO_SPORT",
};

/** What the caller sends to the generator. */
export interface ProtocolRequest {
  /** Free-text or canonical condition, e.g. "Entorse de la cheville". */
  condition: string;
  /** Stage as enum or 1..4 number ("Ankle Sprain Stage 2" → 2 → SUBACUTE). */
  stage: InjuryStage | number;
  /** Optional patient context to let the AI tailor dosage (never PII-heavy). */
  patientContext?: {
    ageYears?: number;
    painScore?: number; // most recent 1..10
    goals?: string;
  };
}

/** One recommended exercise line in a generated protocol. */
export interface RecommendedExercise {
  exerciseId: string;
  name: string;
  order: number;
  durationSec: number;
  sets: number;
  reps: number;
}

/** The generator's structured output. */
export interface ProtocolResponse {
  condition: string;
  stage: InjuryStage;
  /** Human-readable justification — surfaced to the physio for review. */
  rationale: string;
  /** `true` when produced by the mock; flip when a real model is wired in. */
  isMock: boolean;
  exercises: RecommendedExercise[];
}

// -----------------------------------------------------------------------------
// Mock knowledge base — predefined protocols keyed by `condition::stage`.
// Exercise IDs here are placeholders; map them to your real Exercise table.
// -----------------------------------------------------------------------------

type ProtocolKey = `${string}::${InjuryStage}`;

const MOCK_PROTOCOLS: Partial<Record<ProtocolKey, RecommendedExercise[]>> = {
  "entorse de la cheville::SUBACUTE": [
    { exerciseId: "ex_ankle_dorsiflexion", name: "Flexion dorsale de la cheville", order: 0, durationSec: 60, sets: 3, reps: 15 },
    { exerciseId: "ex_calf_raise", name: "Renforcement des mollets", order: 1, durationSec: 60, sets: 3, reps: 15 },
    { exerciseId: "ex_single_leg_balance", name: "Équilibre sur une jambe", order: 2, durationSec: 30, sets: 3, reps: 1 },
  ],
  "entorse de la cheville::RECOVERY": [
    { exerciseId: "ex_calf_raise", name: "Renforcement des mollets", order: 0, durationSec: 60, sets: 4, reps: 20 },
    { exerciseId: "ex_single_leg_balance", name: "Équilibre sur une jambe", order: 1, durationSec: 45, sets: 3, reps: 1 },
    { exerciseId: "ex_lateral_hop", name: "Sauts latéraux contrôlés", order: 2, durationSec: 45, sets: 3, reps: 12 },
  ],
  "lombalgie chronique::SUBACUTE": [
    { exerciseId: "ex_plank", name: "Gainage abdominal (planche)", order: 0, durationSec: 30, sets: 3, reps: 1 },
    { exerciseId: "ex_glute_bridge", name: "Pont fessier", order: 1, durationSec: 60, sets: 3, reps: 12 },
    { exerciseId: "ex_trunk_rotation", name: "Rotation du tronc", order: 2, durationSec: 60, sets: 2, reps: 10 },
  ],
};

/** Normalise a stage that may arrive as a number or enum string. */
export function normaliseStage(stage: InjuryStage | number): InjuryStage {
  if (typeof stage === "number") {
    return STAGE_BY_NUMBER[stage] ?? "SUBACUTE";
  }
  return stage;
}

/**
 * Generate a rehabilitation protocol for a condition + stage.
 *
 * Currently deterministic (mock). Returns an empty `exercises` array with a
 * clear rationale when no predefined protocol matches, so the UI can prompt the
 * physio to build one manually.
 *
 * // TODO(ai): replace the lookup below with a Claude call using structured
 * // outputs (output_config.format) so the model MUST return this exact
 * // `ProtocolResponse` shape, validated against your real Exercise table.
 */
export async function generateProtocol(
  req: ProtocolRequest,
): Promise<ProtocolResponse> {
  const stage = normaliseStage(req.stage);
  const key = `${req.condition.trim().toLowerCase()}::${stage}` as ProtocolKey;
  const exercises = MOCK_PROTOCOLS[key] ?? [];

  const rationale =
    exercises.length > 0
      ? `Protocole prédéfini pour « ${req.condition} » au stade ${stage}. ` +
        `${exercises.length} exercices sélectionnés. À valider par le kinésithérapeute.`
      : `Aucun protocole prédéfini pour « ${req.condition} » (${stage}). ` +
        `Le kinésithérapeute doit composer le programme manuellement.`;

  return { condition: req.condition, stage, rationale, isMock: true, exercises };
}
