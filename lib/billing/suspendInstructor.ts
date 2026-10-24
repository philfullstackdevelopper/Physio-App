// Suspension d'un kiné par l'administrateur (Philippe, 2026-10-07). Depuis le
// nouveau modèle (2026-10-24) il n'y a plus d'abonnement patient à résilier ni
// à rembourser : la suspension coupe l'accès du kiné. Ses patients gardent leur
// programme ; aucun bilan ne peut plus être validé, donc plus aucun prélèvement.
import { setInstructorStatus } from "@/lib/db/admin";

export async function suspendInstructor(instructorId: string): Promise<void> {
  await setInstructorStatus(instructorId, "suspended");
}
