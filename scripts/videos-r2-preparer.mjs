// Vidéos du tournage avec Jules → Cloudflare R2 (Philippe, 2026-10-31).
//   node scripts/videos-r2-preparer.mjs
// Prend les clips finaux en qualité maximale (videos-tournage/final/, 1080×1920,
// H.264 CRF 17, sans son, coupes validées par Philippe), en garde UN par
// exercice, les copie dans videos-tournage/r2/ sous le nom du dessin de
// l'exercice (<dessin>.mp4) et écrit :
//   - videos-tournage/r2/manifest.json  { "<dessin>.mp4": { exercise, clip } }
//   - supabase/migrations/0075_exercise_videos_r2.sql (exercises.media_url = 'r2:<dessin>.mp4')
// Rien n'est envoyé ici : voir scripts/videos-r2-envoyer.mjs.
import fs from "node:fs";
import path from "node:path";

const FINAL = "videos-tournage/final";
const OUT = "videos-tournage/r2";
const map = fs.readFileSync("lib/exercise/illustrationMap.ts", "utf8");
const slugOf = Object.fromEntries([...map.matchAll(/^\s*"((?:[^"\\]|\\.)+)":\s*"([^"]+)"/gm)].map((m) => [JSON.parse(`"${m[1]}"`), m[2]]));
const filmed = [...fs.readFileSync("lib/exercise/filmedExercises.ts", "utf8").matchAll(/^\s{2}("(?:[^"\\]|\\.)+"),$/gm)].map((m) => JSON.parse(m[1]));

// Clip retenu pour chaque exercice (repérage + avis de Philippe sur la page de montage).
const CLIP = {
  "Bodyweight Squat": "IMG_2202-1", "Single-Leg Calf Raise": "IMG_2203-1", "Wall Push-up": "IMG_2204-1", "Wall Sit": "IMG_2205-1",
  "Wall Calf Stretch": "IMG_2206-1", "Kneeling Calf and Hip Flexor Wall Stretch": "IMG_2207-1", "Wall Lunge Hip Flexor Stretch": "IMG_2208-1",
  "Kneeling Hip Flexor Stretch": "IMG_2209-1", "Single-Leg Stance": "IMG_2210-1", "Wall Slides": "IMG_2211-1", "Codman Pendulum": "IMG_2212-1",
  "Supine Chin Nod": "IMG_2213-1", "Chin Tuck": "IMG_2214-1", "Upper Trapezius Stretch": "IMG_2215-1", "Active Cervical Rotation": "IMG_2217-1",
  "Ankle Circles": "IMG_2218-1", "Quad Set": "IMG_2219-1", "Heel Slide": "IMG_2221-1", "Straight Leg Raise": "IMG_2222-1", "Glute Bridge": "IMG_2223-1",
  "Single-Leg Glute Bridge": "IMG_2223-2", "Dead Bug": "IMG_2224-1", "Bear Plank": "IMG_2225-1", "Hamstring Stretch": "IMG_2226-1",
  "Banded Clamshell": "IMG_2228-1", "Side-Lying Hip Abduction": "IMG_2228-3", "Banded Standing Hip Abduction": "IMG_2229-1", "Banded Lateral Walk": "IMG_2230-1",
  "Prone Press-Up (McKenzie)": "IMG_2233-1", "Child's Pose to Press-Up Flow": "IMG_2234-1", "Cat-Cow Stretch": "IMG_2235-1", "Bird Dog": "IMG_2236-1",
  "Seated Spinal Roll-Down": "IMG_2238-1", "Standing Bent-Leg Hamstring Stretch (Table)": "IMG_2240-1", "Standing Lateral Pelvic Shift": "IMG_2241-1",
  "Terminal Knee Extension (Band)": "IMG_2243-1", "Pallof Press": "IMG_2244-1", "Y-Balance Reach": "IMG_2245-1", "Towel Row": "IMG_2246-1",
  "Single-Leg Romanian Deadlift": "IMG_2248-1", "Romanian Deadlift": "IMG_2249-1", "Prone T Arm Raise (Floor)": "IMG_2250-1", "Reverse Snow Angel": "IMG_2251-1",
  "Prone Back Extension (Hands Behind Head)": "IMG_2252-1", "Plank": "IMG_2253-1", "Plank Shoulder Tap": "IMG_2254-1", "Step-Down": "IMG_2255-1",
  "Lunge to Step-Up with Knee Drive": "IMG_2257-1", "Rotational Step-Up": "IMG_2258-1", "Lateral Step-Over Hop": "IMG_2259-1",
  "Step Drop Landing (Two Feet)": "IMG_2260-1", "Step Drop Landing (Single Leg)": "IMG_2261-1", "Hop and Stick": "IMG_2263-1", "Bulgarian Split Squat": "IMG_2264-1",
  "Seated External Rotation (Elbow on Knee)": "IMG_2265-1", "Side-Lying External Rotation": "IMG_2267-1", "Lateral Raise": "IMG_2268-1", "Banded Row": "IMG_2269-1",
  "Reverse Lunge": "IMG_2270-1", "Lateral Lunge": "IMG_2271-1", "Curtsy Lunge": "IMG_2272-1", "Wall Tibialis Raise": "IMG_2273-1",
  "Band Shoulder External Rotation": "IMG_2274-1",
};

const finals = fs.readdirSync(FINAL).filter((f) => f.endsWith(".mp4"));
fs.mkdirSync(OUT, { recursive: true });
const manifest = {};
const problems = [];
for (const name of filmed) {
  const clip = CLIP[name];
  const slug = slugOf[name];
  const file = clip && finals.find((f) => f.startsWith(clip + "_"));
  if (!clip || !slug || !file) { problems.push(`${name} (clip ${clip ?? "?"}, dessin ${slug ?? "?"}, fichier ${file ?? "?"})`); continue; }
  const target = `${slug}.mp4`;
  if (manifest[target]) { problems.push(`${name} : dessin ${slug} déjà utilisé par ${manifest[target].exercise}`); continue; }
  fs.copyFileSync(path.join(FINAL, file), path.join(OUT, target));
  manifest[target] = { exercise: name, clip, source: file };
}
fs.writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2));

const q = (s) => `'${s.replace(/'/g, "''")}'`;
const rows = Object.entries(manifest).map(([f, m]) => `  (${q(m.exercise)}, ${q("r2:" + f)})`).join(",\n");
fs.writeFileSync("supabase/migrations/0075_exercise_videos_r2.sql", `-- Physio-App — Migration 0075 : vidéos de démonstration des exercices filmés
-- Safe to re-run.
--
-- Philippe, 2026-10-31 : les ${Object.keys(manifest).length} vidéos du tournage avec Jules sont chez
-- Cloudflare R2 (bucket privé). Chaque exercice de la PLATEFORME filmé reçoit
-- media_url = 'r2:<fichier>.mp4' ; le serveur en fait un lien signé de 6 h au
-- moment d'afficher la page (lib/storage/r2-videos.ts). Généré par
-- scripts/videos-r2-preparer.mjs.
--
-- Ne touche qu'à exercises.media_url / media_start_seconds des exercices de la
-- plateforme (created_by null) listés ci-dessous. Aucune règle d'accès (RLS),
-- aucun patient, aucune séance. FORCE ROW LEVEL SECURITY est levé le temps de
-- la mise à jour puis remis, dans la transaction de scripts/migrate.mjs --only.

alter table public.exercises no force row level security;

update public.exercises e
set media_url = v.url, media_start_seconds = 0
from (values
${rows}
) as v(name, url)
where e.name = v.name and e.created_by is null;

alter table public.exercises force row level security;
`);
const bytes = Object.keys(manifest).reduce((s, f) => s + fs.statSync(path.join(OUT, f)).size, 0);
console.log(Object.keys(manifest).length, "vidéos prêtes,", (bytes / 1e9).toFixed(2), "Go");
if (problems.length) console.log("Non associés :\n  " + problems.join("\n  "));
