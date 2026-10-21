// Proposition de simplification de la banque d'exercices (2026-10-18).
// Philippe : trop d'exercices « salle de muscu » (variantes de pompes,
// tractions, dips, barre…) qu'un kiné ne prescrira presque jamais, surtout
// quand une variante plus simple existe déjà. Chaque exercice retiré est
// remplacé, dans toutes les séances qui l'utilisent, par l'exercice gardé.
//   node scripts/simplification-banque.mjs
// écrit docs/simplification-banque.md (à relire) et
// supabase/migrations/0069_simplify_exercise_bank.sql (NON appliquée).
import fs from "node:fs";

// [exercice retiré, exercice gardé qui le remplace dans les séances, raison]
const GROUPES = {
  "Pompes : on garde Pompe murale, inclinée, à genoux, classique, scapulaire, avec touches d'épaule, archer, diamant, explosive et typewriter": [
    ["Wide Push-up", "Push-up", "variante de musculation"],
    ["Decline Push-up", "Push-up", "variante de musculation"],
    ["Hindu Push-up", "Push-up", "variante de musculation"],
    ["Weighted Push-up", "Push-up", "lestée, salle de sport"],
    ["Pike Push-up", "Push-up", "variante avancée, épaule en charge"],
    ["Feet-Elevated Pike Push-up", "Push-up", "variante avancée, épaule en charge"],
    ["Handstand Push-up", "Push-up", "gymnastique avancée"],
    ["Wall Walk", "Push-up", "gymnastique avancée (montée en appui renversé)"],
    ["Wall Handstand Push-up", "Push-up", "gymnastique avancée"],
  ],
  "Tractions : on garde Traction, Traction assistée, Suspension active / passive et Traction scapulaire": [
    ["Chin-up", "Pull-up", "doublon de la traction"],
    ["Neutral-Grip Pull-up", "Pull-up", "doublon de la traction"],
    ["Commando Pull-up", "Pull-up", "variante de musculation"],
    ["L-Sit Pull-up", "Pull-up", "gymnastique avancée"],
    ["Weighted Pull-up", "Pull-up", "lestée, performance"],
    ["Weighted Chin-up", "Pull-up", "lestée, performance"],
    ["Towel Pull-up", "Pull-up", "variante de grimpe / préhension"],
    ["Negative Pull-up", "Assisted Pull-up", "même objectif que la traction assistée"],
    ["Assisted Chin-up", "Assisted Pull-up", "doublon de la traction assistée"],
  ],
  "Dips : on garde Dips (barres parallèles), Dips sur chaise et Dips sur banc": [
    ["Chest Dip", "Dip", "barres parallèles, épaule très sollicitée"],
    ["Weighted Dip", "Dip", "lesté, performance"],
    ["Assisted Dip", "Dip", "machine de salle, doublon"],
  ],
  "Exercices à la barre et à la machine guidée : on garde les versions haltères / poids du corps": [
    ["Bench Press", "Dumbbell Bench Press", "barre, salle de sport"],
    ["Close-Grip Bench Press", "Dumbbell Bench Press", "barre, salle de sport"],
    ["Decline Bench Press", "Dumbbell Bench Press", "barre, salle de sport"],
    ["Incline Bench Press", "Incline Dumbbell Press", "barre, salle de sport"],
    ["Smith Machine Bench Press", "Dumbbell Bench Press", "machine guidée"],
    ["Decline Dumbbell Press", "Dumbbell Bench Press", "doublon"],
    ["Barbell Row", "One-Arm Dumbbell Row", "barre, salle de sport"],
    ["Pendlay Row", "One-Arm Dumbbell Row", "haltérophilie"],
    ["T-Bar Row", "One-Arm Dumbbell Row", "barre, salle de sport"],
    ["Meadows Row", "One-Arm Dumbbell Row", "barre, salle de sport"],
    ["Sumo Deadlift", "Romanian Deadlift", "barre, charge lourde"],
    ["Trap Bar Deadlift", "Romanian Deadlift", "barre, charge lourde"],
    ["Rack Pull", "Romanian Deadlift", "barre, charge lourde"],
    ["Good Morning", "Romanian Deadlift", "barre sur la nuque"],
    ["Smith Machine Romanian Deadlift", "Romanian Deadlift", "machine guidée"],
    ["Landmine Romanian Deadlift", "Romanian Deadlift", "barre, salle de sport"],
    ["Dumbbell Sumo Deadlift", "Dumbbell Sumo Squat", "presque identique au squat sumo (demandé par Philippe)"],
    ["Front Squat", "Goblet Squat", "barre, salle de sport"],
    ["Smith Machine Squat", "Goblet Squat", "machine guidée"],
    ["Hack Squat", "Leg Press", "machine, doublon de la presse"],
    ["Leg Press Calf Raise", "Calf Raise", "machine, doublon des mollets debout"],
    ["Seated Calf Raise", "Eccentric Calf Raise (Bent Knee, Soleus)", "machine ; le travail genou fléchi (soléaire) existe sans machine"],
    ["Standing Calf Raise", "Calf Raise", "barre sur les épaules, doublon"],
    ["Assisted Standing Calf Raise", "Slow Bilateral Calf Raise", "même exercice que l'élévation lente à deux pieds (demandé par Philippe)"],
    ["Lying Leg Curl", "Leg Curl", "doublon du leg curl"],
    ["Kettlebell Romanian Deadlift", "Romanian Deadlift", "doublon (haltères)"],
    ["Landmine Squat", "Goblet Squat", "barre, salle de sport"],
    ["Belt Squat", "Goblet Squat", "machine spécialisée"],
    ["Smith Machine Split Squat", "Split Squat", "machine guidée"],
    ["Smith Machine Bulgarian Split Squat", "Bulgarian Split Squat", "machine guidée"],
    ["Smith Machine Reverse Lunge", "Reverse Lunge", "machine guidée"],
    ["Smith Machine Hip Thrust", "Hip Thrust", "machine guidée"],
    ["Barbell Glute Bridge", "Dumbbell Glute Bridge", "barre, salle de sport"],
    ["Barbell Shrug", "Dumbbell Shrug", "barre, doublon"],
    ["Push Press", "Standing Dumbbell Press", "haltérophilie"],
    ["Landmine Press", "Standing Dumbbell Press", "barre, salle de sport"],
    ["Overhead Press", "Standing Dumbbell Press", "doublon"],
    ["Machine Shoulder Press", "Dumbbell Seated Shoulder Press", "machine, doublon"],
  ],
  "Bras (biceps / triceps) : on garde Curl biceps (haltères et bouteille d'eau), Curl marteau, Extension triceps au-dessus de la tête, Kickback triceps": [
    ["EZ-Bar Curl", "Bicep Curl", "barre, variante de musculation"],
    ["Drag Curl", "Bicep Curl", "variante de musculation"],
    ["Spider Curl", "Bicep Curl", "variante de musculation"],
    ["Preacher Curl", "Bicep Curl", "machine / pupitre"],
    ["Cable Curl", "Bicep Curl", "poulie, doublon"],
    ["Incline Dumbbell Curl", "Bicep Curl", "variante de musculation"],
    ["Rope Hammer Curl", "Hammer Curl", "poulie, doublon"],
    ["Reverse Curl", "Hammer Curl", "barre, doublon du curl marteau"],
    ["Skull Crusher", "Overhead Tricep Extension", "variante de musculation"],
    ["Two Dumbbell Skullcrusher", "Overhead Tricep Extension", "variante de musculation"],
    ["Single Dumbbell Skullcrusher", "Overhead Tricep Extension", "variante de musculation"],
    ["Dumbbell Overhead Tricep Extension", "Overhead Tricep Extension", "doublon"],
    ["Single Arm Dumbbell Tricep Extension", "Overhead Tricep Extension", "doublon"],
    ["Rope Tricep Pushdown", "Tricep Pushdown", "doublon"],
  ],
  "Pectoraux, épaules, dos à la machine : on garde Écarté haltères, Élévations latérales / frontales, Oiseau, Tirage poitrine, Tirage horizontal": [
    ["Cable Fly", "Dumbbell Fly", "poulie, doublon"],
    ["Incline Cable Fly", "Dumbbell Fly", "poulie, doublon"],
    ["Pec Deck", "Dumbbell Fly", "machine, doublon"],
    ["Cable Lateral Raise", "Lateral Raise", "poulie, doublon"],
    ["Machine Lateral Raise", "Lateral Raise", "machine, doublon"],
    ["Cable Front Raise", "Front Raise", "poulie, doublon"],
    ["Plate Front Raise", "Front Raise", "doublon"],
    ["Cable Rear Delt Fly", "Rear Delt Fly", "poulie, doublon"],
    ["Reverse Pec Deck", "Rear Delt Fly", "machine, doublon"],
    ["Bent-Over Rear Delt Raise", "Rear Delt Fly", "doublon"],
    ["Upright Row", "Lateral Raise", "souvent évité en kiné (conflit sous-acromial)"],
    ["Wide-Grip Lat Pulldown", "Lat Pulldown", "doublon"],
    ["Close-Grip Lat Pulldown", "Lat Pulldown", "doublon"],
    ["Straight-Arm Pulldown", "Lat Pulldown", "poulie, variante de musculation"],
    ["Machine Row", "Seated Cable Row", "machine, doublon"],
    ["Chest Supported Row", "Seated Cable Row", "machine, doublon"],
    ["Single-Arm Cable Row", "Seated Cable Row", "doublon"],
  ],
  "Abdominaux / gainage avancés : on garde Crunch, Crunch inversé, Relevé de jambes, Hollow, Dead bug, gainages": [
    ["Dragon Flag", "Lying Leg Raise", "trop complexe (demandé par Philippe)"],
    ["L-Sit Hold", "Hollow Body Hold", "gymnastique avancée"],
    ["Hanging Leg Raise", "Hanging Knee Raise", "variante avancée"],
    ["Decline Sit-Up", "Crunch", "banc incliné, lombaires sollicitées"],
    ["Weighted Crunch", "Crunch", "lesté, doublon"],
    ["Cable Crunch", "Crunch", "poulie, doublon"],
    ["Weighted Russian Twist", "Russian Twist", "lesté, doublon"],
  ],
  "Fessiers / lombaires à la machine": [
    ["Machine Glute Kickback", "Banded Kickback", "machine, doublon"],
    ["Cable Kickback", "Banded Kickback", "poulie, doublon"],
    ["Reverse Hyperextension", "Back Extension", "machine spécialisée"],
    ["Glute-Focused Back Extension", "Back Extension", "doublon"],
  ],
  "Jambes, variantes avancées : on garde Pistol assisté, Squat sur box une jambe, Skater squat": [
    ["Pistol Squat", "Assisted Pistol Squat", "variante avancée"],
    ["Shrimp Squat", "Single-Leg Box Squat", "variante avancée"],
    ["Sissy Squat", "Bodyweight Squat", "genou très sollicité, rarement prescrit"],
    ["Weighted Single-Leg Glute Bridge", "Single-Leg Glute Bridge", "lesté, doublon"],
  ],
  "Cardio de salle : on garde Marche, Vélo, Rameur, Course, Escaliers": [
    ["Elliptical", "Cycling", "demandé par Philippe"],
    ["Assault Bike", "Cycling", "doublon du vélo"],
    ["SkiErg", "Rowing", "machine rare"],
    ["Battle Ropes", "Jumping Jack", "matériel de salle, performance"],
    ["Stair Climber", "Controlled Stair Climbing", "machine, doublon des escaliers"],
    ["Seal Jack", "Jumping Jack", "doublon"],
  ],
};

const csv = fs.readFileSync("docs/relecture-materiel-exercices.csv", "utf8").replace(/^﻿/, "");
const names = new Set(csv.split(/\r?\n/).slice(1).map((l) => l.match(/^"([^"]*)"/)?.[1]).filter(Boolean));
const all = Object.values(GROUPES).flat();
const drops = new Set(all.map(([d]) => d));
const errors = [];
for (const [d, k] of all) {
  if (!names.has(d)) errors.push(`retiré inconnu : ${d}`);
  if (!names.has(k)) errors.push(`gardé inconnu : ${k}`);
  if (drops.has(k)) errors.push(`gardé aussi retiré : ${k}`);
}
if (drops.size !== all.length) errors.push("doublon dans la liste");
if (errors.length) { console.error(errors.join("\n")); process.exit(1); }

// --- Document de relecture
let md = `# Simplifier la banque d'exercices — proposition à valider\n\n`;
md += `**${all.length} exercices retirés** sur ${names.size + 24} (banque : ${names.size} + 24 P1). Il en resterait **${names.size + 24 - all.length}**.\n\n`;
md += `Règle : on retire les variantes « salle de musculation » (barre, machine guidée, poulie, versions lestées ou acrobatiques) qu'un kiné ne prescrit presque jamais, surtout quand une variante plus simple existe déjà. **Aucune séance ne perd d'exercice** : partout où un exercice retiré apparaît, il est remplacé par l'exercice gardé indiqué. Rien n'est supprimé tant que Philippe n'a pas validé (la migration 0069 est écrite mais pas appliquée).\n\n`;
md += `Pour garder un exercice, il suffit de le rayer de la liste : je l'enlève du fichier \`scripts/simplification-banque.mjs\` et je régénère.\n\n`;
for (const [titre, rows] of Object.entries(GROUPES)) {
  md += `## ${titre} (${rows.length})\n\n| Retiré | Remplacé dans les séances par | Pourquoi |\n|---|---|---|\n`;
  for (const [d, k, why] of rows) md += `| ${d} | ${k} | ${why} |\n`;
  md += "\n";
}
fs.writeFileSync("docs/simplification-banque.md", md);

// --- Migration (non appliquée)
const q = (s) => `'${s.replace(/'/g, "''")}'`;
const pairs = all.map(([d, k]) => `  (${q(d)}, ${q(k)})`).join(",\n");
const sql = `-- Physio-App — Migration 0069: simplify the platform exercise bank
-- NOT APPLIED — waiting for Philippe's confirmation (2026-10-18).
-- Generated by scripts/simplification-banque.mjs; human-readable list with the
-- reason for every line: docs/simplification-banque.md.
--
-- En clair : retire ${all.length} exercices de la plateforme (variantes de
-- musculation rarement prescrites en kiné). Même méthode sûre que 0042 :
--   1. dans une séance qui contient déjà l'exercice gardé, on enlève
--      simplement la ligne de l'exercice retiré ;
--   2. partout ailleurs, l'exercice retiré est remplacé par l'exercice gardé
--      (séances de la plateforme, séances des kinés, copies « Ajuster la
--      séance » des patients) — aucune séance ne perd de contenu ;
--   3. on supprime les exercices retirés (seulement ceux de la plateforme,
--      created_by is null ; un exercice créé par un kiné n'est jamais touché).
-- Les historiques (workout_logs) pointent vers les séances, pas vers les
-- exercices : rien n'est perdu.
-- Les règles RLS ne changent pas. Comme 0068, la migration lève le « force
-- row level security » le temps de ses propres écritures, puis le remet.



alter table public.exercises no force row level security;
alter table public.workout_exercises no force row level security;

create temporary table simplify_pairs on commit drop as
select d.id as drop_id, k.id as keep_id
from (values
${pairs}
) as v(drop_name, keep_name)
join public.exercises d on d.name = v.drop_name and d.created_by is null
join public.exercises k on k.name = v.keep_name and k.created_by is null;

-- 1.
delete from public.workout_exercises we
using simplify_pairs p
where we.exercise_id = p.drop_id
  and exists (select 1 from public.workout_exercises we2 where we2.workout_id = we.workout_id and we2.exercise_id = p.keep_id);

-- 2.
update public.workout_exercises we
set exercise_id = p.keep_id
from simplify_pairs p
where we.exercise_id = p.drop_id;

-- 3.
delete from public.exercises e
using simplify_pairs p
where e.id = p.drop_id;

alter table public.workout_exercises force row level security;
alter table public.exercises force row level security;


`;
fs.writeFileSync("supabase/migrations/0069_simplify_exercise_bank.sql", sql);
console.log(all.length, "retirés,", names.size + 24 - all.length, "restants");
