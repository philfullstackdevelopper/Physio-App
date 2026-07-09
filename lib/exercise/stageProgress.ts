// =============================================================================
// Stage progression over time — the suggested phase advances automatically as
// weeks pass since the patient last declared their situation.
// =============================================================================

import type { InjuryStage } from "@/lib/exercise/prescription";

/** Week (since injury) at which each stage begins. */
export const STAGE_START_WEEK: Record<InjuryStage, number> = {
  acute: 0,
  subacute: 1,
  recovery: 2,
  return_to_sport: 4,
};

/** Map a "week since injury" to the corresponding stage. */
export function stageFromWeek(week: number): InjuryStage {
  if (week < 1) return "acute";
  if (week < 2) return "subacute";
  if (week < 4) return "recovery";
  return "return_to_sport";
}

/** Whole weeks elapsed since an ISO timestamp. */
export function weeksSince(referenceISO: string | null | undefined, now: Date = new Date()): number {
  if (!referenceISO) return 0;
  const ref = new Date(referenceISO);
  if (Number.isNaN(ref.getTime())) return 0;
  return Math.max(0, Math.floor((now.getTime() - ref.getTime()) / (7 * 24 * 3600 * 1000)));
}

/**
 * Current stage = the declared stage advanced by the time elapsed since it was
 * declared. `referenceISO` is when the patient last set their situation.
 */
export function currentStage(
  declared: InjuryStage,
  referenceISO: string | null | undefined,
  now: Date = new Date(),
): InjuryStage {
  const startWeek = STAGE_START_WEEK[declared] ?? 0;
  return stageFromWeek(startWeek + weeksSince(referenceISO, now));
}

/** Current week of rehab (for display: "semaine N"). */
export function careWeek(
  declared: InjuryStage,
  referenceISO: string | null | undefined,
  now: Date = new Date(),
): number {
  return (STAGE_START_WEEK[declared] ?? 0) + weeksSince(referenceISO, now);
}
