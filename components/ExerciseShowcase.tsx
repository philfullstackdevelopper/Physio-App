import { useTranslations } from "next-intl";
import LoopVideo from "@/components/LoopVideo";

// Vitrine d'exercices de la landing : les EXÉCUTIONS FILMÉES par Jules
// (Philippe, 2026-10-31), extraits courts dans public/videos-demo/ — ils
// partent avec le code, sans stockage externe.
//
// Bandeau qui défile de gauche à droite (Philippe, 2026-11-01 : « comme sur
// la page de connexion, mais de gauche à droite »). Toutes les vidéos à la
// même hauteur, chacune dans son vrai format : au cabinet, filmées à
// l'horizontale (cases larges) ; en salle, filmées à la verticale (cases
// hautes, de la tête aux pieds). Pas de pause au survol : le bandeau prend
// toute la largeur, la souris est presque toujours dessus et il semblait
// figé (Philippe, 2026-11-01). Immobile si « réduire les animations ».
type ShowcaseExercise = {
  /** Nom du fichier dans public/videos-demo/ (sans extension). */
  clip: string;
  /** Clé du nom affiché et de la zone travaillée (exercise.showcase.<id>). */
  id: string;
  /** Filmée à la verticale (en salle). */
  tall?: boolean;
};

// Alternance large / haute : le bandeau garde un rythme régulier.
const EXERCISES: ShowcaseExercise[] = [
  { clip: "glute-bridge", id: "gluteBridge" },
  { clip: "salle-v-pallof-press", id: "pallofPress", tall: true },
  { clip: "banded-clamshell", id: "clamshell" },
  { clip: "salle-v-band-shoulder-external-rotation", id: "shoulderRotation", tall: true },
  { clip: "straight-leg-raise", id: "straightLegRaise" },
  { clip: "salle-v-y-balance", id: "yBalance", tall: true },
];

function Tile({ ex, copy }: { ex: ShowcaseExercise; copy: boolean }) {
  const t = useTranslations("exercise.showcase");
  const name = t(`${ex.id}.name`);
  return (
    // pr-4 plutôt qu'un gap : les deux moitiés du bandeau ont ainsi
    // exactement la même largeur, et la boucle ne saute pas.
    <li className="h-full shrink-0 pr-3 sm:pr-4" aria-hidden={copy || undefined}>
      <div className="relative h-full overflow-hidden rounded-2xl bg-slate-200">
        <LoopVideo
          src={`/videos-demo/${ex.clip}.mp4`}
          poster={`/videos-demo/${ex.clip}.jpg`}
          label={t("label", { name })}
          className={`block h-full object-cover ${ex.tall ? "aspect-[9/16]" : "aspect-video"}`}
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2 pt-6 text-white">
          <p className="text-sm font-semibold leading-tight">{name}</p>
          <p className="text-[11px] font-medium text-white/75">{t(`${ex.id}.zone`)}</p>
        </div>
      </div>
    </li>
  );
}

export default function ExerciseShowcase() {
  return (
    <div className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_5%,black_95%,transparent)]">
      <style>{`@keyframes vitrine-defile{from{transform:translateX(-50%)}to{transform:translateX(0)}}`}</style>
      {/* La liste est écrite deux fois : quand la 1re moitié est sortie à
          droite, la 2e est exactement à sa place de départ. */}
      <ul data-loop-group className="flex h-64 w-max [animation:vitrine-defile_40s_linear_infinite] motion-reduce:[animation:none] sm:h-80 lg:h-[22rem] lg:short:h-[19rem]">
        {[false, true].map((copy) =>
          EXERCISES.map((ex) => <Tile key={`${ex.clip}-${copy}`} ex={ex} copy={copy} />),
        )}
      </ul>
    </div>
  );
}
