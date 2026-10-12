import { isAdminEmail } from "@/lib/admin";
import { PATIENT_INVITATIONS_OPEN } from "@/lib/launchFlags";

// Règles d'avant-lancement côté serveur. Les interrupteurs eux-mêmes, et
// l'explication complète, sont dans lib/launchFlags.ts.

export const INVITATIONS_CLOSED_MESSAGE =
  "Les invitations de patients ouvriront au lancement d'EasyPhysio. D'ici là, vous pouvez découvrir tout le reste de votre espace.";

/** L'administrateur (Philippe) garde la possibilité d'inviter, pour ses propres essais. */
export function canInvitePatients(email: string | null | undefined): boolean {
  return PATIENT_INVITATIONS_OPEN || isAdminEmail(email);
}
