// Exercices de la plateforme filmés avec Jules (kiné) le 2026-10-30 : ce sont
// les seuls que les kinés peuvent choisir tant que ONLY_FILMED_EXERCISES est
// vrai (Philippe, 2026-10-31 : « pour le moment », le temps de filmer les autres).
// Les autres exercices de la plateforme ne sont PAS supprimés : ils sont juste
// absents de la bibliothèque et des sélecteurs d'exercices. Les séances déjà
// données aux patients, les séances de la plateforme et les exercices créés par
// un kiné restent tels quels.
// Pour tout réafficher : mettre ONLY_FILMED_EXERCISES à false (lib/launchFlags.ts).
import { ONLY_FILMED_EXERCISES } from "@/lib/launchFlags";

export const FILMED_EXERCISE_NAMES: ReadonlySet<string> = new Set<string>([
  "Bodyweight Squat",
  "Single-Leg Calf Raise",
  "Wall Push-up",
  "Wall Sit",
  "Wall Calf Stretch",
  "Kneeling Calf and Hip Flexor Wall Stretch",
  "Wall Lunge Hip Flexor Stretch",
  "Kneeling Hip Flexor Stretch",
  "Single-Leg Stance",
  "Wall Slides",
  "Codman Pendulum",
  "Supine Chin Nod",
  "Chin Tuck",
  "Upper Trapezius Stretch",
  "Active Cervical Rotation",
  "Ankle Circles",
  "Quad Set",
  "Heel Slide",
  "Straight Leg Raise",
  "Glute Bridge",
  "Single-Leg Glute Bridge",
  "Dead Bug",
  "Bear Plank",
  "Hamstring Stretch",
  "Banded Clamshell",
  "Side-Lying Hip Abduction",
  "Banded Standing Hip Abduction",
  "Banded Lateral Walk",
  "Prone Press-Up (McKenzie)",
  "Child's Pose to Press-Up Flow",
  "Cat-Cow Stretch",
  "Bird Dog",
  "Seated Spinal Roll-Down",
  "Standing Bent-Leg Hamstring Stretch (Table)",
  "Standing Lateral Pelvic Shift",
  "Terminal Knee Extension (Band)",
  "Pallof Press",
  "Y-Balance Reach",
  "Towel Row",
  "Single-Leg Romanian Deadlift",
  "Romanian Deadlift",
  "Prone T Arm Raise (Floor)",
  "Reverse Snow Angel",
  "Prone Back Extension (Hands Behind Head)",
  "Plank",
  "Plank Shoulder Tap",
  "Step-Down",
  "Lunge to Step-Up with Knee Drive",
  "Rotational Step-Up",
  "Lateral Step-Over Hop",
  "Step Drop Landing (Two Feet)",
  "Step Drop Landing (Single Leg)",
  "Hop and Stick",
  "Bulgarian Split Squat",
  "Seated External Rotation (Elbow on Knee)",
  "Side-Lying External Rotation",
  "Lateral Raise",
  "Banded Row",
  "Reverse Lunge",
  "Lateral Lunge",
  "Curtsy Lunge",
  "Wall Tibialis Raise",
  "Band Shoulder External Rotation",
]);

/** Visible dans la bibliothèque et les sélecteurs : un exercice créé par un kiné,
 *  ou un exercice de la plateforme filmé (ou tout, si l'interrupteur est coupé). */
export function isPickableExercise(ex: { name: unknown; created_by?: unknown }): boolean {
  if (!ONLY_FILMED_EXERCISES) return true;
  if (ex.created_by) return true;
  return FILMED_EXERCISE_NAMES.has(String(ex.name));
}

/** Séance proposable à un kiné : la sienne, ou une séance de la plateforme dont
 *  TOUS les exercices sont filmés (et qui en contient au moins un). */
export function isPickableSeance(w: {
  created_by?: unknown;
  workout_exercises?: { exercises?: { name?: unknown } | null; exercise?: { name?: unknown } | null }[] | null;
}): boolean {
  if (!ONLY_FILMED_EXERCISES || w.created_by) return true;
  const rows = w.workout_exercises ?? [];
  return rows.length > 0 && rows.every((r) => FILMED_EXERCISE_NAMES.has(String((r.exercises ?? r.exercise)?.name ?? "")));
}
