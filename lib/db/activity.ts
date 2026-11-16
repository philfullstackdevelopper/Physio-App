import "server-only";
import { getPool } from "@/lib/db/pool";
import type { InstructorActivityDb, PatientActivityDb } from "@/lib/activity/activity";

// Lecture de la vue « Activité » de /admin (migration 0093) : uniquement par
// les fonctions internal.* — jamais depuis le navigateur.

export async function listPatientActivity(): Promise<PatientActivityDb[]> {
  const { rows } = await getPool().query<PatientActivityDb>("select * from internal.admin_activity_patients()");
  return rows;
}

export async function listInstructorActivity(): Promise<InstructorActivityDb[]> {
  const { rows } = await getPool().query<InstructorActivityDb>("select * from internal.admin_activity_instructors()");
  return rows;
}
