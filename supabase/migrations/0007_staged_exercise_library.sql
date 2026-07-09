-- Physio-App — Migration 0007: richer, stage-based exercise library
-- Run once in Supabase (SQL Editor -> New query -> paste -> Run). Idempotent.
--
-- Adds ~22 exercises and 12 stage-tagged workouts (3 conditions × 4 phases) so
-- the séances suggested to a patient depend on their declared recovery stage:
--   acute → jours 0-7 · subacute → sem. 1-2 · recovery → sem. 2-4 · return_to_sport → sem. 4+
--
-- CLINICAL NOTE: these are standard starter progressions, meant to be reviewed
-- and adjusted by the physiotherapist — not fixed medical prescriptions.

-- ---------------------------------------------------------------------------
-- 1. New exercises (idempotent by name)
-- ---------------------------------------------------------------------------
insert into public.exercises (name, instructions)
select v.name, v.instr
from (values
  ('Bascule du bassin', 'Allongé sur le dos, genoux pliés, basculez le bassin pour plaquer le bas du dos au sol, puis relâchez. Lent et contrôlé.'),
  ('Étirement genou-poitrine', 'Allongé sur le dos, ramenez un genou vers la poitrine avec les mains, maintenez, puis changez de jambe.'),
  ('Respiration abdominale', 'Allongé, une main sur le ventre, inspirez en gonflant le ventre, expirez lentement. Relâchez les tensions.'),
  ('Chat-vache', 'À quatre pattes, alternez dos rond (expiration) et dos creux (inspiration). Mouvement fluide.'),
  ('Quadrupède alterné', 'À quatre pattes, tendez le bras droit et la jambe gauche, dos stable, puis alternez côté.'),
  ('Squat', 'Pieds écartés largeur des épaules, descendez en pliant les genoux comme pour vous asseoir, dos droit, puis remontez.'),
  ('Fente avant', 'Grand pas en avant, descendez le genou arrière vers le sol, buste droit, puis remontez. Alternez.'),
  ('Planche latérale', 'En appui sur un avant-bras, corps aligné sur le côté, soulevez le bassin et maintenez.'),
  ('Pompes de cheville', 'Assis ou allongé, montez et descendez la pointe du pied pour relancer la circulation.'),
  ('Cercles de cheville', 'Dessinez des cercles lents avec la pointe du pied, dans un sens puis dans l''autre.'),
  ('Alphabet avec le pied', 'Avec la pointe du pied, dessinez les lettres de l''alphabet dans l''air pour mobiliser la cheville.'),
  ('Éversion avec élastique', 'Un élastique autour du pied, poussez le pied vers l''extérieur contre la résistance, puis revenez lentement.'),
  ('Montées sur pointes', 'Debout, montez sur la pointe des pieds puis redescendez lentement. Appui possible si besoin.'),
  ('Équilibre sur surface instable', 'Tenez-vous en équilibre sur une jambe sur un coussin ou une surface souple.'),
  ('Sauts latéraux contrôlés', 'Sautez d''un côté à l''autre en amortissant la réception, sous contrôle.'),
  ('Saut sur une jambe', 'Petits sauts sur une jambe en contrôlant l''équilibre à la réception.'),
  ('Rotation cervicale douce', 'Tournez lentement la tête d''un côté puis de l''autre, sans forcer, dans l''amplitude confortable.'),
  ('Inclinaison latérale du cou', 'Inclinez doucement la tête vers une épaule, maintenez, puis changez de côté.'),
  ('Étirement des trapèzes', 'Inclinez la tête sur le côté et tirez doucement avec la main opposée. Maintenez.'),
  ('Renforcement isométrique du cou', 'Main sur le front, poussez la tête contre la main sans bouger, maintenez, relâchez. Variez les directions.'),
  ('Rétraction scapulaire', 'Serrez les omoplates l''une vers l''autre, épaules basses, maintenez, puis relâchez.'),
  ('Gainage postural', 'Debout ou assis, grandissez-vous, rentrez le menton et engagez les abdominaux pour tenir une posture alignée.')
) as v(name, instr)
where not exists (select 1 from public.exercises e where e.name = v.name);

-- ---------------------------------------------------------------------------
-- 2. Stage-tagged workouts (idempotent by condition + name)
-- ---------------------------------------------------------------------------
insert into public.workouts (condition_id, name, description, duration_minutes, times_per_week, stage, created_by)
select c.id, v.wname, v.descr, v.dur, v.tpw, v.stage, null
from public.conditions c
join (values
  ('Lombalgie chronique',    'Phase 1 — Soulagement (jours 0-7)',      'Mobilité très douce et soulagement de la douleur.',            10, 7, 'acute'),
  ('Lombalgie chronique',    'Phase 2 — Mobilité (semaines 1-2)',      'Réactivation en douceur du bas du dos et des fessiers.',        12, 6, 'subacute'),
  ('Lombalgie chronique',    'Phase 3 — Renforcement (semaines 2-4)',  'Renforcement du tronc et stabilité.',                          20, 4, 'recovery'),
  ('Lombalgie chronique',    'Phase 4 — Reprise (semaines 4+)',        'Renforcement fonctionnel et retour aux activités.',            25, 3, 'return_to_sport'),
  ('Entorse de la cheville', 'Phase 1 — Protection (jours 0-7)',       'Mobilité douce sans douleur pour relancer la circulation.',      8, 7, 'acute'),
  ('Entorse de la cheville', 'Phase 2 — Mobilité (semaines 1-2)',      'Récupération de la mobilité et renforcement léger.',           10, 6, 'subacute'),
  ('Entorse de la cheville', 'Phase 3 — Renforcement (semaines 2-4)',  'Renforcement et proprioception.',                              15, 4, 'recovery'),
  ('Entorse de la cheville', 'Phase 4 — Reprise (semaines 4+)',        'Exercices dynamiques et retour au sport.',                     18, 3, 'return_to_sport'),
  ('Cervicalgie',            'Phase 1 — Soulagement (jours 0-7)',      'Mobilité douce du cou et soulagement des tensions.',            6, 7, 'acute'),
  ('Cervicalgie',            'Phase 2 — Mobilité (semaines 1-2)',      'Étirements et mobilité des cervicales.',                        8, 6, 'subacute'),
  ('Cervicalgie',            'Phase 3 — Renforcement (semaines 2-4)',  'Renforcement du cou et des muscles posturaux.',                12, 4, 'recovery'),
  ('Cervicalgie',            'Phase 4 — Reprise (semaines 4+)',        'Renforcement fonctionnel et posture globale.',                 12, 3, 'return_to_sport')
) as v(cname, wname, descr, dur, tpw, stage)
  on v.cname = c.name and c.created_by is null
where not exists (
  select 1 from public.workouts w where w.condition_id = c.id and w.name = v.wname
);

-- ---------------------------------------------------------------------------
-- 3. Exercises inside each staged workout (idempotent)
-- ---------------------------------------------------------------------------
insert into public.workout_exercises (workout_id, exercise_id, position)
select w.id, e.id, v.pos
from public.workouts w
join public.conditions c on c.id = w.condition_id and c.created_by is null
join (values
  -- Lombalgie
  ('Lombalgie chronique','Phase 1 — Soulagement (jours 0-7)','Bascule du bassin',0),
  ('Lombalgie chronique','Phase 1 — Soulagement (jours 0-7)','Étirement genou-poitrine',1),
  ('Lombalgie chronique','Phase 1 — Soulagement (jours 0-7)','Respiration abdominale',2),
  ('Lombalgie chronique','Phase 2 — Mobilité (semaines 1-2)','Chat-vache',0),
  ('Lombalgie chronique','Phase 2 — Mobilité (semaines 1-2)','Pont fessier',1),
  ('Lombalgie chronique','Phase 2 — Mobilité (semaines 1-2)','Étirement du piriforme',2),
  ('Lombalgie chronique','Phase 3 — Renforcement (semaines 2-4)','Quadrupède alterné',0),
  ('Lombalgie chronique','Phase 3 — Renforcement (semaines 2-4)','Gainage abdominal (planche)',1),
  ('Lombalgie chronique','Phase 3 — Renforcement (semaines 2-4)','Pont fessier',2),
  ('Lombalgie chronique','Phase 4 — Reprise (semaines 4+)','Squat',0),
  ('Lombalgie chronique','Phase 4 — Reprise (semaines 4+)','Fente avant',1),
  ('Lombalgie chronique','Phase 4 — Reprise (semaines 4+)','Planche latérale',2),
  -- Cheville
  ('Entorse de la cheville','Phase 1 — Protection (jours 0-7)','Pompes de cheville',0),
  ('Entorse de la cheville','Phase 1 — Protection (jours 0-7)','Cercles de cheville',1),
  ('Entorse de la cheville','Phase 1 — Protection (jours 0-7)','Alphabet avec le pied',2),
  ('Entorse de la cheville','Phase 2 — Mobilité (semaines 1-2)','Flexion dorsale de la cheville',0),
  ('Entorse de la cheville','Phase 2 — Mobilité (semaines 1-2)','Éversion avec élastique',1),
  ('Entorse de la cheville','Phase 2 — Mobilité (semaines 1-2)','Renforcement des mollets',2),
  ('Entorse de la cheville','Phase 3 — Renforcement (semaines 2-4)','Montées sur pointes',0),
  ('Entorse de la cheville','Phase 3 — Renforcement (semaines 2-4)','Équilibre sur une jambe',1),
  ('Entorse de la cheville','Phase 3 — Renforcement (semaines 2-4)','Renforcement des mollets',2),
  ('Entorse de la cheville','Phase 4 — Reprise (semaines 4+)','Équilibre sur surface instable',0),
  ('Entorse de la cheville','Phase 4 — Reprise (semaines 4+)','Sauts latéraux contrôlés',1),
  ('Entorse de la cheville','Phase 4 — Reprise (semaines 4+)','Saut sur une jambe',2),
  -- Cervicalgie
  ('Cervicalgie','Phase 1 — Soulagement (jours 0-7)','Rétraction cervicale (double menton)',0),
  ('Cervicalgie','Phase 1 — Soulagement (jours 0-7)','Rotation cervicale douce',1),
  ('Cervicalgie','Phase 1 — Soulagement (jours 0-7)','Inclinaison latérale du cou',2),
  ('Cervicalgie','Phase 2 — Mobilité (semaines 1-2)','Étirement des cervicales',0),
  ('Cervicalgie','Phase 2 — Mobilité (semaines 1-2)','Étirement des trapèzes',1),
  ('Cervicalgie','Phase 2 — Mobilité (semaines 1-2)','Rétraction cervicale (double menton)',2),
  ('Cervicalgie','Phase 3 — Renforcement (semaines 2-4)','Renforcement isométrique du cou',0),
  ('Cervicalgie','Phase 3 — Renforcement (semaines 2-4)','Rétraction scapulaire',1),
  ('Cervicalgie','Phase 3 — Renforcement (semaines 2-4)','Étirement des trapèzes',2),
  ('Cervicalgie','Phase 4 — Reprise (semaines 4+)','Rétraction scapulaire',0),
  ('Cervicalgie','Phase 4 — Reprise (semaines 4+)','Gainage postural',1),
  ('Cervicalgie','Phase 4 — Reprise (semaines 4+)','Renforcement isométrique du cou',2)
) as v(cname, wname, ename, pos)
  on v.cname = c.name and v.wname = w.name
join public.exercises e on e.name = v.ename
where not exists (
  select 1 from public.workout_exercises we where we.workout_id = w.id and we.exercise_id = e.id
);
