import ExerciseIllustration from "@/components/ExerciseIllustration";

// Vitrine d'exercices de la landing (Philippe, 2026-10-10) : montrer de vrais
// exercices de la bibliothèque, avec leur dessin animé ET leur nom — ce que
// le patient verra chez lui. Remplace le bloc « preuves » essayé le même jour.
//
// À TERME : chaque case montrera l'EXÉCUTION filmée de l'exercice (vidéos à
// tourner avec le kiné, voir CLAUDE.md §8). Le jour où une vidéo existe pour
// un exercice, renseigner `video` ci-dessous : la case l'affichera à la place
// du dessin. Tant qu'il n'y en a pas, on ne promet rien de plus que
// « les vidéos arrivent » dans le sous-titre de la section.
type ShowcaseExercise = {
  /** Clé de lib/exercise/illustrationMap.ts (nom anglais de la bibliothèque). */
  drawing: string;
  /** Nom affiché au patient. */
  name: string;
  /** Zone travaillée. */
  zone: string;
  /** URL de la vidéo d'exécution, quand elle existera. */
  video?: string;
};

const EXERCISES: ShowcaseExercise[] = [
  { drawing: "Glute Bridge", name: "Pont fessier", zone: "Lombaires" },
  { drawing: "Shoulder Circles", name: "Cercles d'épaules", zone: "Épaule" },
  { drawing: "Assisted Partial Squat", name: "Squat assisté", zone: "Genou" },
  { drawing: "Lying Torso Rotation", name: "Rotation du tronc", zone: "Dos" },
  { drawing: "Slow Bilateral Calf Raise", name: "Montées sur pointes", zone: "Cheville" },
  { drawing: "Progressive Clamshell", name: "Coquillage", zone: "Hanche" },
  { drawing: "Postural Core Bracing", name: "Gainage postural", zone: "Tronc" },
  { drawing: "Gentle Supine Hamstring Stretch", name: "Étirement ischio-jambiers", zone: "Cuisse" },
];

export default function ExerciseShowcase() {
  return (
    // Téléphone : 2 colonnes × 3 lignes (les deux derniers masqués) pour que la
    // section tienne sur un écran ; dès lg : 4 × 2.
    <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-4">
      {EXERCISES.map((ex, i) => (
        <li
          key={ex.drawing}
          className={`rounded-2xl border border-slate-200 bg-white p-2.5 sm:p-3 ${i >= 6 ? "max-sm:hidden" : ""}`}
        >
          {ex.video ? (
            <video
              src={ex.video}
              muted
              loop
              playsInline
              autoPlay
              className="h-20 w-full rounded-xl bg-[#f6f8fd] object-cover sm:h-24"
            />
          ) : (
            <ExerciseIllustration name={ex.drawing} animate className="h-20 w-full rounded-xl bg-[#f6f8fd] text-blue-600 sm:h-24" />
          )}
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <p className="truncate text-sm font-semibold text-slate-900">{ex.name}</p>
            <p className="shrink-0 text-[11px] font-medium text-slate-400">{ex.zone}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
