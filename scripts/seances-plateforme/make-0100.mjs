// 0100 : matériel exigé par les exercices corrigé (consignes 0098, bouteille d'eau au lieu d'haltère).
import fs from "node:fs";
import path from "node:path";
const repo = process.argv[2];
const TAGS = [
  ["Upper Trapezius Stretch", []],
  ["Lateral Raise", []],
  ["Romanian Deadlift", []],
  ["Hip Thrust", ["chaise"]],
  ["Seated External Rotation (Elbow on Knee)", []],
  ["Side-Lying External Rotation", []],
  ["Wrist Radial-Ulnar Deviation", []],
];
const INSTR = [
  ["Side-Lying External Rotation",
    "Allongé sur le côté, coude du dessus plié à 90° et collé au corps (une serviette roulée sous le coude si besoin), un haltère léger (ou une petite bouteille d'eau) en main. Faites pivoter l'avant-bras vers le plafond sans décoller le coude, puis redescendez lentement.",
    "Lie on your side, top elbow bent at 90° and tucked against your body (a rolled towel under the elbow if needed), holding a light dumbbell (or a small water bottle). Rotate your forearm up towards the ceiling without lifting your elbow, then lower slowly."],
  ["Wrist Radial-Ulnar Deviation",
    "Assis, le coude contre le corps, l'avant-bras à l'horizontale devant vous, pouce vers le haut, un haltère léger (ou une petite bouteille d'eau) en main. Inclinez la main vers le haut (côté pouce) puis vers le bas (côté auriculaire), sans bouger l'avant-bras.",
    "Seated, elbow against your side, forearm level in front of you, thumb up, holding a light dumbbell (or a small water bottle). Tilt your hand up (thumb side) then down (little-finger side), without moving your forearm."],
  ["Foam Ball Squeeze",
    "Une balle en mousse dans la main (ou une chaussette roulée en boule). Serrez le plus fort possible sans douleur, tenez quelques secondes, puis relâchez doucement.",
    "Hold a foam ball in your hand (or a rolled-up sock). Squeeze as hard as you can without pain, hold for a few seconds, then release slowly."],
];
const q = (s) => "'" + s.replace(/'/g, "''") + "'";
const arr = (a) => (a.length ? `array[${a.map(q).join(", ")}]::text[]` : "'{}'::text[]");
const sql = `-- =============================================================================
-- 0100 — Matériel exigé par les exercices, corrigé (Philippe, 2026-11-17)
--
-- En clair : la colonne « matériel indispensable » de ${TAGS.length} exercices est remise
-- d'accord avec leur consigne (charge devenue facultative le 17/11 ; petite
-- bouteille d'eau au lieu d'un haltère ; plus de chaise pour l'étirement du
-- trapèze). 3 consignes précisent l'objet de remplacement. Sert au
-- remplacement automatique des exercices quand le patient n'a pas le matériel
-- (lib/exercise/equipmentSwaps.ts). Aucune règle d'accès ne change.
-- =============================================================================

alter table public.exercises no force row level security;

${TAGS.map(([n, a]) => `update public.exercises set equipment = ${arr(a)} where name = ${q(n)} and created_by is null;`).join("\n")}

update public.exercises e
set instructions = v.instr
from (values
${INSTR.map(([n, fr]) => `  (${q(n)}, ${q(fr)})`).join(",\n")}
) as v(name, instr)
where e.name = v.name and e.created_by is null;

alter table public.exercises force row level security;
`;
fs.writeFileSync(path.join(repo, "supabase/migrations/0100_exercise_equipment_fixes.sql"), sql);
const ef = path.join(repo, "i18n/content/en.json");
const j = JSON.parse(fs.readFileSync(ef, "utf8"));
for (const [, fr, en] of INSTR) j[fr] = en;
fs.writeFileSync(ef, JSON.stringify(j, null, 2) + "\n");
console.log("0100 écrite");
