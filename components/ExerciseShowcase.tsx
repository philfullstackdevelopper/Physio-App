import LoopVideo from "@/components/LoopVideo";

// Vitrine d'exercices de la landing. D'abord les dessins animés (Philippe,
// 2026-10-10) ; depuis le 2026-10-31, les EXÉCUTIONS FILMÉES par Jules
// (Philippe : « show the actual videos filmed », 3 par ligne, plus grandes).
// Extraits courts tirés des vidéos de videos-tournage/web/ (exercices filmés
// à l'horizontale, donc bien cadrés dans une case large) et rangés dans
// public/videos-demo/ — ils partent avec le code, sans stockage externe.
type ShowcaseExercise = {
  /** Nom du fichier dans public/videos-demo/ (sans extension). */
  clip: string;
  /** Nom affiché. */
  name: string;
  /** Zone travaillée. */
  zone: string;
  /** Cadrage quand la case coupe le haut et le bas (par défaut : centré). */
  focus?: string;
};

const EXERCISES: ShowcaseExercise[] = [
  { clip: "glute-bridge", name: "Pont fessier", zone: "Lombaires" },
  { clip: "banded-clamshell", name: "Coquillage avec élastique", zone: "Hanche" },
  { clip: "straight-leg-raise", name: "Élévation jambe tendue", zone: "Genou" },
  { clip: "bird-dog", name: "Bird dog", zone: "Dos" },
  { clip: "dead-bug", name: "Dead bug", zone: "Tronc", focus: "object-top" },
  { clip: "cat-cow-stretch", name: "Chat-vache", zone: "Colonne" },
];

export default function ExerciseShowcase() {
  return (
    // Téléphone : 4 vidéos en 2 × 2. Dès sm : 3 par ligne, sur 2 lignes.
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
      {EXERCISES.map((ex, i) => (
        <li
          key={ex.clip}
          className={`rounded-2xl border border-slate-200 bg-white p-2 sm:p-3 ${i >= 4 ? "max-sm:hidden" : ""}`}
        >
          <LoopVideo
            src={`/videos-demo/${ex.clip}.mp4`}
            poster={`/videos-demo/${ex.clip}.jpg`}
            label={`Démonstration filmée : ${ex.name}`}
            className={`aspect-video w-full rounded-xl bg-slate-100 object-cover sm:aspect-[2/1] sm:short:aspect-[7/3] ${ex.focus ?? ""}`}
          />
          <div className="mt-2 flex items-baseline justify-between gap-2 max-sm:block max-sm:text-center">
            <p className="text-sm font-semibold text-slate-900 max-sm:leading-tight sm:truncate">{ex.name}</p>
            <p className="shrink-0 text-[11px] font-medium text-slate-400 max-sm:mt-0.5">{ex.zone}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
