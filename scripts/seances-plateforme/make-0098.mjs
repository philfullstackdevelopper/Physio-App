// 0098 : audit vidéo du 17/11 — consignes alignées sur ce que montre chaque vidéo,
// vidéo erronée de « Rotational Step-Up » retirée.
import fs from "node:fs";
import path from "node:path";
const repo = process.argv[2];
const INSTR = [
  ["Upper Trapezius Stretch",
    "Debout, les mains dans le dos, attrapez le poignet du côté à étirer avec l'autre main et tirez-le doucement vers le bas. Penchez la tête du côté opposé, oreille vers l'épaule, jusqu'à sentir l'étirement sur le côté du cou. Maintenez la position, puis changez de côté.",
    "Standing, hands behind your back, grab the wrist on the side to stretch with your other hand and gently pull it down. Tilt your head to the opposite side, ear towards shoulder, until you feel the stretch along the side of your neck. Hold, then switch sides."],
  ["Wrist Radial-Ulnar Deviation",
    "Assis, le coude contre le corps, l'avant-bras à l'horizontale devant vous, pouce vers le haut, un haltère léger en main. Inclinez la main vers le haut (côté pouce) puis vers le bas (côté auriculaire), sans bouger l'avant-bras.",
    "Seated, elbow against your side, forearm level in front of you, thumb up, holding a light dumbbell. Tilt your hand up (thumb side) then down (little-finger side), without moving your forearm."],
  ["Supine Stick Shoulder Flexion",
    "Allongé sur le dos, genoux fléchis, un bâton tenu à deux mains devant la poitrine. Tendez les bras pour monter le bâton à la verticale, puis, si possible, continuez vers l'arrière de la tête sans douleur forte, le bras sain aidant l'autre. Redescendez lentement.",
    "Lie on your back, knees bent, holding a stick in both hands in front of your chest. Straighten your arms to raise the stick to vertical, then, if you can, keep going back over your head without strong pain, your good arm helping the other. Lower slowly."],
  ["Wall Slides",
    "Debout face à un mur, mains posées à plat contre le mur à hauteur d'épaules. Faites glisser les mains vers le haut le plus loin possible sans douleur, en gardant les épaules basses, puis redescendez.",
    "Stand facing a wall, hands flat against the wall at shoulder height. Slide your hands up as far as you can without pain, keeping your shoulders down, then slide back down."],
  ["Lateral Jump (Two Feet)",
    "Debout, pieds écartés de la largeur du bassin, genoux légèrement fléchis. Sautez sur le côté sur les deux pieds en gardant le même écart, réceptionnez-vous genoux fléchis et stables, marquez une pause, puis sautez de l'autre côté.",
    "Stand with feet hip-width apart, knees slightly bent. Jump sideways on both feet keeping the same gap, land with knees bent and steady, pause, then jump back the other way."],
  ["Lateral Lunge",
    "Debout, mains sur les hanches, un pied posé sur un disque de glisse (ou une serviette sur un sol lisse). Faites glisser ce pied sur le côté en gardant la jambe tendue, tout en fléchissant le genou de la jambe d'appui, hanches vers l'arrière. Ramenez le pied au centre, puis changez de côté.",
    "Standing, hands on hips, one foot on a sliding disc (or a towel on a smooth floor). Slide that foot out to the side keeping the leg straight while bending the knee of your standing leg, hips back. Bring the foot back to the centre, then switch sides."],
  ["Lateral Raise",
    "Debout, bras le long du corps, levez les bras sur les côtés jusqu'à hauteur d'épaule, coudes légèrement fléchis, puis redescendez lentement. Pour plus de difficulté, tenez un petit poids dans chaque main.",
    "Standing, arms by your sides, raise your arms out to the side to shoulder height, elbows slightly bent, then lower slowly. To make it harder, hold a small weight in each hand."],
  ["Quad Set",
    "Assis (ou allongé sur le dos), jambes tendues posées devant vous. Sans bouger la jambe, contractez fort le muscle de la cuisse en écrasant l'arrière du genou vers le support et en tirant les orteils vers vous. Tenez la contraction quelques secondes, puis relâchez.",
    "Sitting (or lying on your back) with your legs straight in front of you. Without moving your leg, tighten your thigh muscle hard, pressing the back of your knee down into the surface and pulling your toes towards you. Hold for a few seconds, then relax."],
  ["Romanian Deadlift",
    "Debout, jambes presque tendues, avec ou sans charge dans les mains. Penchez le buste vers l'avant en poussant les hanches vers l'arrière, en gardant le dos le plus droit possible, jusqu'à sentir l'étirement à l'arrière des cuisses, puis remontez.",
    "Standing with legs almost straight, with or without a weight in your hands. Lean forward by pushing your hips back, keeping your back as straight as you can, until you feel a stretch at the back of your thighs, then stand back up."],
  ["Prone T Arm Raise (Floor)",
    "Allongé sur le ventre au sol, le front posé au sol (ou sur une serviette roulée si besoin), les bras tendus sur les côtés en T, pouces vers le haut. Resserrez les omoplates et levez les deux bras de quelques centimètres, sans lever la tête. Tenez une seconde, puis reposez-les lentement.",
    "Lie face down on the floor, forehead resting on the floor (or on a rolled towel if needed), arms straight out to the sides in a T, thumbs up. Squeeze your shoulder blades and lift both arms a few centimetres without lifting your head. Hold for a second, then lower slowly."],
  ["Side-Lying External Rotation",
    "Allongé sur le côté, coude du dessus plié à 90° et collé au corps (une serviette roulée sous le coude si besoin), un haltère léger en main. Faites pivoter l'avant-bras vers le plafond sans décoller le coude, puis redescendez lentement.",
    "Lie on your side, top elbow bent at 90° and tucked against your body (a rolled towel under the elbow if needed), holding a light dumbbell. Rotate your forearm up towards the ceiling without lifting your elbow, then lower slowly."],
  ["Side-Lying Hip Abduction",
    "Allongé sur le côté, en appui sur l'avant-bras, jambes tendues. Levez la jambe du dessus tendue vers le plafond sans faire rouler le bassin en arrière, puis redescendez avec contrôle. Plus facile : tête posée sur le bras, jambe du dessous fléchie.",
    "Lie on your side, propped on your forearm, legs straight. Lift your top leg straight up towards the ceiling without rolling your pelvis back, then lower with control. Easier: head resting on your arm, bottom leg bent."],
  ["Single-Leg Calf Raise",
    "Debout sur une jambe, une main contre le mur pour l'équilibre. Montez sur la pointe du pied le plus haut possible, puis redescendez lentement. Pour plus d'amplitude : avant-pied sur une marche, talon dans le vide.",
    "Stand on one leg, one hand on the wall for balance. Rise up onto your toes as high as you can, then lower slowly. For more range: forefoot on a step, heel hanging off."],
  ["Calf Raise",
    "Debout, une main posée sur le dossier d'une chaise. Montez sur la pointe des pieds le plus haut possible, puis redescendez lentement. Pour plus d'amplitude : avant-pieds sur une marche, talons dans le vide.",
    "Standing, one hand on the back of a chair. Rise up onto your toes as high as you can, then lower slowly. For more range: forefeet on a step, heels hanging off."],
  ["Ankle Circles",
    "Assis, le genou tenu entre les mains, le pied dans le vide. Dessinez lentement de grands cercles avec la pointe du pied, sans bouger la jambe, dans un sens puis dans l'autre.",
    "Sitting, holding your knee in both hands, foot off the ground. Slowly draw big circles with your toes without moving your leg, one way then the other."],
  ["Banded Clamshell",
    "Allongé sur le côté, appuyé sur l'avant-bras (ou la tête posée sur le bras), genoux fléchis, élastique juste au-dessus des genoux. Pieds collés, ouvrez le genou du dessus contre la résistance, puis refermez avec contrôle.",
    "Lie on your side, propped on your forearm (or head resting on your arm), knees bent, band just above your knees. Keeping your feet together, open your top knee against the band, then close with control."],
  ["Banded Lateral Walk",
    "Élastique autour des pieds ou des chevilles, jambes légèrement fléchies, avancez par petits pas latéraux en maintenant la tension de l'élastique.",
    "Band around your feet or ankles, knees slightly bent, take small steps sideways keeping tension on the band."],
  ["External Rotation at 90° Abduction (Band)",
    "Debout, bras levé sur le côté à hauteur d'épaule, coude plié à 90°. L'autre extrémité de l'élastique est bloquée au niveau de la hanche opposée (tenue de l'autre main), ou fixée devant vous. Faites pivoter l'avant-bras vers le haut jusqu'à la verticale, sans baisser le coude, puis revenez lentement.",
    "Stand with your arm raised to the side at shoulder height, elbow bent at 90°. The other end of the band is held at your opposite hip (with your other hand) or anchored in front of you. Rotate your forearm up to vertical without dropping your elbow, then return slowly."],
  ["Straight Leg Raise",
    "Allongé sur le dos, appuyé sur les avant-bras, l'autre jambe allongée sur le support. Contractez la cuisse pour verrouiller le genou, puis levez la jambe tendue jusqu'à environ 45°, sans plier le genou. Redescendez lentement.",
    "Lie on your back propped on your forearms, other leg resting straight on the surface. Tighten your thigh to lock your knee, then lift the straight leg to about 45° without bending the knee. Lower slowly."],
  ["Kneeling Hip Flexor Stretch",
    "Debout face à une table ou un support haut, posez un pied à plat dessus, avant-bras sur le genou avant. Gardez la jambe arrière tendue, pied au sol, et avancez doucement le bassin jusqu'à sentir l'étirement à l'avant de la hanche arrière. Maintenez la position, puis changez de côté.",
    "Standing facing a table or high surface, put one foot flat on it, forearms on the front knee. Keep the back leg straight, foot on the floor, and gently move your hips forward until you feel a stretch at the front of the back hip. Hold, then switch sides."],
  ["Reverse Lunge",
    "Debout, mains sur les hanches, un pied posé sur un disque de glisse (ou une serviette sur un sol lisse). Faites glisser ce pied vers l'arrière en fléchissant le genou de la jambe d'appui, buste légèrement penché en avant, puis ramenez-le. Faites les deux côtés.",
    "Standing, hands on hips, one foot on a sliding disc (or a towel on a smooth floor). Slide that foot back while bending the knee of your standing leg, chest leaning slightly forward, then bring it back. Do both sides."],
];
const FR_NAMES = {
  "Kneeling Hip Flexor Stretch": "Étirement du psoas, pied sur un support",
  "Lateral Jump (Two Feet)": "Saut latéral à deux pieds",
};
const q = (s) => "'" + s.replace(/'/g, "''") + "'";
const sql = `-- =============================================================================
-- 0098 — Audit des vidéos du 17/11 (Philippe : « run a final audit »)
--
-- En clair, pour Philippe (CLAUDE.md §3) :
--   Chaque vidéo a été comparée image par image à son exercice.
--   1. ${INSTR.length} consignes sont réécrites pour décrire ce que la vidéo montre
--      vraiment (position, matériel, côté).
--   2. « Rotational Step-Up » : la vidéo montre Jules debout sur la marche en
--      train d'expliquer, pas l'exercice. La vidéo est retirée (l'exercice
--      retrouve son dessin animé) et, dans les séances de la PLATEFORME, il est
--      remplacé par « Step-Up » (ou simplement retiré si la séance l'a déjà).
--   Les séances des kinés et les copies des patients ne sont pas touchées.
--   Aucune règle d'accès ne change.
-- =============================================================================

alter table public.exercises no force row level security;
alter table public.workouts no force row level security;
alter table public.workout_exercises no force row level security;

update public.exercises e
set instructions = v.instr
from (values
${INSTR.map(([n, fr]) => `  (${q(n)}, ${q(fr)})`).join(",\n")}
) as v(name, instr)
where e.name = v.name and e.created_by is null;

update public.exercises set media_url = null
where name = 'Rotational Step-Up' and created_by is null;

create temporary table swap on commit drop as
select s.id as from_id, t.id as to_id
from public.exercises s, public.exercises t
where s.name = 'Rotational Step-Up' and s.created_by is null
  and t.name = 'Step-Up' and t.created_by is null;

delete from public.workout_exercises we using swap p
where we.exercise_id = p.from_id
  and we.workout_id in (select id from public.workouts where created_by is null and patient_id is null)
  and exists (select 1 from public.workout_exercises x where x.workout_id = we.workout_id and x.exercise_id = p.to_id);

update public.workout_exercises we set exercise_id = p.to_id, reps = 10
from swap p
where we.exercise_id = p.from_id
  and we.workout_id in (select id from public.workouts where created_by is null and patient_id is null);

alter table public.exercises force row level security;
alter table public.workouts force row level security;
alter table public.workout_exercises force row level security;
`;
fs.writeFileSync(path.join(repo, "supabase/migrations/0098_video_audit_fixes.sql"), sql);
const ef = path.join(repo, "i18n/content/en.json");
const j = JSON.parse(fs.readFileSync(ef, "utf8"));
for (const [, fr, en] of INSTR) j[fr] = en;
fs.writeFileSync(ef, JSON.stringify(j, null, 2) + "\n");
const ff = path.join(repo, "i18n/content/fr-exercise-names.json");
const raw = fs.readFileSync(ff, "utf8");
const k = JSON.parse(raw);
for (const [en, fr] of Object.entries(FR_NAMES)) { if (!(en in k)) throw new Error(en); k[en] = fr; }
fs.writeFileSync(ff, JSON.stringify(k, null, 2) + "\n");
console.log("0098 écrite :", INSTR.length, "consignes");
