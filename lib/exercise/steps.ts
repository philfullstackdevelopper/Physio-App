// =============================================================================
// Turn an exercise's free-text `instructions` into numbered steps.
//
// The seed library writes instructions as a few sentences ("Tenez-vous droit.
// Pliez les genoux. Remontez lentement."). Splitting on sentence boundaries gives
// a usable checklist without asking anyone to re-enter the content in a new shape.
// =============================================================================

/** Split instructions into trimmed, punctuation-free steps. Empty input → []. */
export function parseSteps(instructions: string | null | undefined): string[] {
  if (!instructions) return [];
  return instructions
    .split(/\.\s+/)
    .map((s) => s.trim().replace(/\.$/, ""))
    .filter(Boolean);
}
