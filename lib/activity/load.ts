import "server-only";
import { listInstructorActivity, listPatientActivity } from "@/lib/db/activity";
import { lastSeenByEmail } from "./clerkActivity";
import { buildActivity, type KineActivity, type PatientActivity } from "./activity";

/** Toute l'activité, comptes de test compris (la page les filtre). */
export async function loadActivity(now: Date = new Date()): Promise<{ patients: PatientActivity[]; kines: KineActivity[] }> {
  const [patients, kines, seen] = await Promise.all([listPatientActivity(), listInstructorActivity(), lastSeenByEmail()]);
  return buildActivity(patients, kines, seen, now);
}
