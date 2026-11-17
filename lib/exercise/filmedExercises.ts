// Exercices de la plateforme filmés avec Jules (kiné) le 2026-10-30 : ce sont
// les seuls que les kinés peuvent choisir tant que ONLY_FILMED_EXERCISES est
// vrai (Philippe, 2026-10-31 : « pour le moment », le temps de filmer les autres).
// Les autres exercices de la plateforme ne sont PAS supprimés : ils sont juste
// absents de la bibliothèque et des sélecteurs d'exercices. Les séances déjà
// données aux patients, les séances de la plateforme et les exercices créés par
// un kiné restent tels quels.
// Pour tout réafficher : mettre ONLY_FILMED_EXERCISES à false (lib/launchFlags.ts).
// Noms ANGLAIS (en base) ; un nom affiché en français est d'abord ramené à son
// nom anglais (platformExerciseName, lib/exercise/exerciseNames.ts).
import { ONLY_FILMED_EXERCISES } from "@/lib/launchFlags";
import { platformExerciseName } from "@/lib/exercise/exerciseNames";

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
  "Single-Leg Romanian Deadlift",
  "Romanian Deadlift",
  "Prone T Arm Raise (Floor)",
  "Reverse Snow Angel",
  "Prone Back Extension (Hands Behind Head)",
  "Plank",
  "Plank Shoulder Tap",
  "Step-Down",
  "Lunge to Step-Up with Knee Drive",
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
  // Vidéos IA (Higgsfield) retenues une par une par Philippe le 2026-11-16
  // (docs/revue-videos-ia-2026-11-16.md §6), en ligne depuis la migration 0094.
  // À relire par Jules (validation clinique finale).
  "Single-Leg Box Squat",
  "Forward Lunge",
  "Split Squat",
  "Lateral Jump (Two Feet)",
  "Shoulder Circles",
  "Jump Squat",
  "Prone Y Raise",
  "Floor to Stand",
  "Lateral Shuffle",
  "Wrist Radial-Ulnar Deviation",
  "Shoulder Isometrics Against Wall",
  "Incline Push-up",
  "Obstacle Step-Over",
  "External Rotation at 90° Abduction (Band)",
  "Farmer Carry",
  "Single-Leg Lateral Hop",
  "Ankle Eversion (Band)",
  "Push-up",
  "Lateral Weight Shift",
  "Foam Ball Squeeze",
  "Banded Face Pull",
  "Sit-to-Stand",
  "Band Shoulder Internal Rotation",
  "Towel Internal Rotation Stretch",
  "Supine Stick Shoulder Flexion",
  "Modified Side Plank (Light)",
  "Thoracic Extension Over Chair",
  "Hip Thrust",
  "Glute Bridge March",
  "Skater Hop",
  "Single-Leg Forward Hop",
  // Clips Higgsfield du 10/11, contrôlés image par image le 17/11 (migration 0095).
  "Calf Raise",
  "Step-Up",
  "Assisted Partial Squat",
]);

/** Activités du quotidien (Philippe, 2026-11-17) : marche, vélo, course,
 *  escaliers, corde à sauter… Pas besoin d'une vidéo pour les comprendre — le
 *  dessin animé de l'appli suffit. Elles restent proposables même sans tournage,
 *  ce qui débloque les séances qui ne manquaient que d'elles (33 séances et
 *  8 pathologies de plus, d'après la base au 2026-11-17). */
export const NO_VIDEO_NEEDED_NAMES: ReadonlySet<string> = new Set<string>([
  "Walking",
  "Assisted Progressive Walking",
  "Cycling",
  "Running",
  "Progressive Walk-to-Jog (Shin Splints, Soft Terrain)",
  "Controlled Stair Climbing",
  "Jump Rope",
]);

/** Exercice de la plateforme proposable sans réserve : filmé, ou activité du quotidien. */
function availableOnPlatform(name: string): boolean {
  const en = platformExerciseName(name);
  return FILMED_EXERCISE_NAMES.has(en) || NO_VIDEO_NEEDED_NAMES.has(en);
}

/** Visible dans la bibliothèque et les sélecteurs : un exercice créé par un kiné,
 *  ou un exercice de la plateforme filmé ou du quotidien (ou tout, si l'interrupteur est coupé). */
export function isPickableExercise(ex: { name: unknown; created_by?: unknown }): boolean {
  if (!ONLY_FILMED_EXERCISES) return true;
  if (ex.created_by) return true;
  return availableOnPlatform(String(ex.name));
}

/** Séance proposable à un kiné : la sienne, ou une séance de la plateforme dont
 *  TOUS les exercices sont filmés ou du quotidien (et qui en contient au moins un). */
export function isPickableSeance(w: {
  created_by?: unknown;
  workout_exercises?: { exercises?: { name?: unknown } | null; exercise?: { name?: unknown } | null }[] | null;
}): boolean {
  if (!ONLY_FILMED_EXERCISES || w.created_by) return true;
  const rows = w.workout_exercises ?? [];
  return rows.length > 0 && rows.every((r) => availableOnPlatform(String((r.exercises ?? r.exercise)?.name ?? "")));
}
