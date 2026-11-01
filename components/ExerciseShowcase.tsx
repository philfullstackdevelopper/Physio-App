import LoopVideo from "@/components/LoopVideo";

// Vitrine d'exercices de la landing : les EXÉCUTIONS FILMÉES par Jules
// (Philippe, 2026-10-31), extraits courts dans public/videos-demo/ — ils
// partent avec le code, sans stockage externe.
//
// Deux sortes de vidéos (Philippe, 2026-11-01 : les vidéos en salle doivent
// se voir en entier, pas recadrées) :
//   - au cabinet, exercices au sol filmés à l'horizontale → cases larges ;
//   - en salle, filmées à la verticale → cases hautes, de la tête aux pieds.
// Ordinateur : les 3 larges empilées à gauche, les 3 hautes côte à côte à
// droite. Tablette : deux lignes. Téléphone : 2 + 2.
type ShowcaseExercise = {
  /** Nom du fichier dans public/videos-demo/ (sans extension). */
  clip: string;
  /** Nom affiché. */
  name: string;
  /** Zone travaillée. */
  zone: string;
};

const CABINET: ShowcaseExercise[] = [
  { clip: "glute-bridge", name: "Pont fessier", zone: "Lombaires" },
  { clip: "banded-clamshell", name: "Coquillage avec élastique", zone: "Hanche" },
  { clip: "straight-leg-raise", name: "Élévation jambe tendue", zone: "Genou" },
];

const SALLE: ShowcaseExercise[] = [
  { clip: "salle-v-pallof-press", name: "Pallof press", zone: "Tronc" },
  { clip: "salle-v-towel-row", name: "Tirage aux sangles", zone: "Dos" },
  { clip: "salle-v-seated-external-rotation-elbow-on-knee", name: "Rotation externe d'épaule", zone: "Épaule" },
];

function Tile({ ex, className, videoClass, compact = false }: { ex: ShowcaseExercise; className: string; videoClass: string; compact?: boolean }) {
  return (
    <li className={`relative overflow-hidden rounded-2xl bg-slate-200 ${className}`}>
      <LoopVideo
        src={`/videos-demo/${ex.clip}.mp4`}
        poster={`/videos-demo/${ex.clip}.jpg`}
        label={`Démonstration filmée : ${ex.name}`}
        className={`block object-cover ${videoClass}`}
      />
      {/* Nom posé sur la vidéo : pas de bandeau blanc qui prendrait de la hauteur.
          Cases larges (compact) : une seule ligne fine, pour ne pas cacher Jules. */}
      {compact ? (
        <div className="absolute inset-x-0 bottom-0 flex items-baseline justify-between gap-2 bg-gradient-to-t from-black/60 to-transparent px-2.5 pb-1.5 pt-4 text-white">
          <p className="truncate text-xs font-semibold">{ex.name}</p>
          <p className="shrink-0 text-[10px] font-medium text-white/75">{ex.zone}</p>
        </div>
      ) : (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2 pt-6 text-white">
          <p className="text-sm font-semibold leading-tight">{ex.name}</p>
          <p className="text-[11px] font-medium text-white/75">{ex.zone}</p>
        </div>
      )}
    </li>
  );
}

export default function ExerciseShowcase() {
  return (
    <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:justify-center">
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:flex lg:w-[16rem] lg:shrink-0 lg:flex-col lg:gap-3">
        {CABINET.map((ex, i) => (
          <Tile
            key={ex.clip}
            ex={ex}
            compact
            className={i === 2 ? "max-sm:hidden" : ""}
            videoClass="aspect-[2/1] w-full lg:aspect-auto lg:h-[calc((24rem-1.5rem)/3)]"
          />
        ))}
      </ul>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:flex lg:gap-4">
        {SALLE.map((ex, i) => (
          <Tile
            key={ex.clip}
            ex={ex}
            className={i === 2 ? "max-sm:hidden" : ""}
            videoClass="aspect-[9/16] w-full lg:h-[24rem] lg:w-auto"
          />
        ))}
      </ul>
    </div>
  );
}
