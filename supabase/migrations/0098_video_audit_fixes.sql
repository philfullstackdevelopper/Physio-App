-- =============================================================================
-- 0098 — Audit des vidéos du 17/11 (Philippe : « run a final audit »)
--
-- En clair, pour Philippe (CLAUDE.md §3) :
--   Chaque vidéo a été comparée image par image à son exercice.
--   1. 21 consignes sont réécrites pour décrire ce que la vidéo montre
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
  ('Upper Trapezius Stretch', 'Debout, les mains dans le dos, attrapez le poignet du côté à étirer avec l''autre main et tirez-le doucement vers le bas. Penchez la tête du côté opposé, oreille vers l''épaule, jusqu''à sentir l''étirement sur le côté du cou. Maintenez la position, puis changez de côté.'),
  ('Wrist Radial-Ulnar Deviation', 'Assis, le coude contre le corps, l''avant-bras à l''horizontale devant vous, pouce vers le haut, un haltère léger en main. Inclinez la main vers le haut (côté pouce) puis vers le bas (côté auriculaire), sans bouger l''avant-bras.'),
  ('Supine Stick Shoulder Flexion', 'Allongé sur le dos, genoux fléchis, un bâton tenu à deux mains devant la poitrine. Tendez les bras pour monter le bâton à la verticale, puis, si possible, continuez vers l''arrière de la tête sans douleur forte, le bras sain aidant l''autre. Redescendez lentement.'),
  ('Wall Slides', 'Debout face à un mur, mains posées à plat contre le mur à hauteur d''épaules. Faites glisser les mains vers le haut le plus loin possible sans douleur, en gardant les épaules basses, puis redescendez.'),
  ('Lateral Jump (Two Feet)', 'Debout, pieds écartés de la largeur du bassin, genoux légèrement fléchis. Sautez sur le côté sur les deux pieds en gardant le même écart, réceptionnez-vous genoux fléchis et stables, marquez une pause, puis sautez de l''autre côté.'),
  ('Lateral Lunge', 'Debout, mains sur les hanches, un pied posé sur un disque de glisse (ou une serviette sur un sol lisse). Faites glisser ce pied sur le côté en gardant la jambe tendue, tout en fléchissant le genou de la jambe d''appui, hanches vers l''arrière. Ramenez le pied au centre, puis changez de côté.'),
  ('Lateral Raise', 'Debout, bras le long du corps, levez les bras sur les côtés jusqu''à hauteur d''épaule, coudes légèrement fléchis, puis redescendez lentement. Pour plus de difficulté, tenez un petit poids dans chaque main.'),
  ('Quad Set', 'Assis (ou allongé sur le dos), jambes tendues posées devant vous. Sans bouger la jambe, contractez fort le muscle de la cuisse en écrasant l''arrière du genou vers le support et en tirant les orteils vers vous. Tenez la contraction quelques secondes, puis relâchez.'),
  ('Romanian Deadlift', 'Debout, jambes presque tendues, avec ou sans charge dans les mains. Penchez le buste vers l''avant en poussant les hanches vers l''arrière, en gardant le dos le plus droit possible, jusqu''à sentir l''étirement à l''arrière des cuisses, puis remontez.'),
  ('Prone T Arm Raise (Floor)', 'Allongé sur le ventre au sol, le front posé au sol (ou sur une serviette roulée si besoin), les bras tendus sur les côtés en T, pouces vers le haut. Resserrez les omoplates et levez les deux bras de quelques centimètres, sans lever la tête. Tenez une seconde, puis reposez-les lentement.'),
  ('Side-Lying External Rotation', 'Allongé sur le côté, coude du dessus plié à 90° et collé au corps (une serviette roulée sous le coude si besoin), un haltère léger en main. Faites pivoter l''avant-bras vers le plafond sans décoller le coude, puis redescendez lentement.'),
  ('Side-Lying Hip Abduction', 'Allongé sur le côté, en appui sur l''avant-bras, jambes tendues. Levez la jambe du dessus tendue vers le plafond sans faire rouler le bassin en arrière, puis redescendez avec contrôle. Plus facile : tête posée sur le bras, jambe du dessous fléchie.'),
  ('Single-Leg Calf Raise', 'Debout sur une jambe, une main contre le mur pour l''équilibre. Montez sur la pointe du pied le plus haut possible, puis redescendez lentement. Pour plus d''amplitude : avant-pied sur une marche, talon dans le vide.'),
  ('Calf Raise', 'Debout, une main posée sur le dossier d''une chaise. Montez sur la pointe des pieds le plus haut possible, puis redescendez lentement. Pour plus d''amplitude : avant-pieds sur une marche, talons dans le vide.'),
  ('Ankle Circles', 'Assis, le genou tenu entre les mains, le pied dans le vide. Dessinez lentement de grands cercles avec la pointe du pied, sans bouger la jambe, dans un sens puis dans l''autre.'),
  ('Banded Clamshell', 'Allongé sur le côté, appuyé sur l''avant-bras (ou la tête posée sur le bras), genoux fléchis, élastique juste au-dessus des genoux. Pieds collés, ouvrez le genou du dessus contre la résistance, puis refermez avec contrôle.'),
  ('Banded Lateral Walk', 'Élastique autour des pieds ou des chevilles, jambes légèrement fléchies, avancez par petits pas latéraux en maintenant la tension de l''élastique.'),
  ('External Rotation at 90° Abduction (Band)', 'Debout, bras levé sur le côté à hauteur d''épaule, coude plié à 90°. L''autre extrémité de l''élastique est bloquée au niveau de la hanche opposée (tenue de l''autre main), ou fixée devant vous. Faites pivoter l''avant-bras vers le haut jusqu''à la verticale, sans baisser le coude, puis revenez lentement.'),
  ('Straight Leg Raise', 'Allongé sur le dos, appuyé sur les avant-bras, l''autre jambe allongée sur le support. Contractez la cuisse pour verrouiller le genou, puis levez la jambe tendue jusqu''à environ 45°, sans plier le genou. Redescendez lentement.'),
  ('Kneeling Hip Flexor Stretch', 'Debout face à une table ou un support haut, posez un pied à plat dessus, avant-bras sur le genou avant. Gardez la jambe arrière tendue, pied au sol, et avancez doucement le bassin jusqu''à sentir l''étirement à l''avant de la hanche arrière. Maintenez la position, puis changez de côté.'),
  ('Reverse Lunge', 'Debout, mains sur les hanches, un pied posé sur un disque de glisse (ou une serviette sur un sol lisse). Faites glisser ce pied vers l''arrière en fléchissant le genou de la jambe d''appui, buste légèrement penché en avant, puis ramenez-le. Faites les deux côtés.')
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
