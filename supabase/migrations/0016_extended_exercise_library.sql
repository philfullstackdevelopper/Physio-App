-- Physio-App — Migration 0016: extended exercise library
-- Run once in Supabase (SQL Editor -> New query -> paste -> Run). Idempotent.
--
-- Two additions, both ORIGINAL content (own wording, own selection — not copied
-- from any third-party platform):
--   1. One extra exercise per phase on the 3 existing conditions (12 exercises).
--   2. Four new conditions covering body areas not yet present: épaule, genou,
--      hanche, poignet — 4 staged phases each, matching the 0007 pattern.
--
-- CLINICAL NOTE: standard starter progressions, meant to be reviewed and
-- adjusted by the physiotherapist — not fixed medical prescriptions.

-- ---------------------------------------------------------------------------
-- 1. New exercises (idempotent by name)
-- ---------------------------------------------------------------------------
insert into public.exercises (name, instructions)
select v.name, v.instr
from (values
  -- Étoffement — Lombalgie chronique
  ('Étirement lombaire en enroulement, jambes repliées', 'Allongé sur le dos, ramenez les deux genoux vers la poitrine avec les mains et maintenez 20 secondes.'),
  ('Étirement latéral du bas du dos', 'Debout ou assis, penchez le buste sur le côté en glissant une main le long de la jambe. Maintenez, puis changez de côté.'),
  ('Extension lombaire allégée', 'Allongé sur le ventre, soulevez doucement un bras et la jambe opposée de quelques centimètres, maintenez, puis alternez.'),
  ('Soulevé de terre à la jambe tendue, dos droit (léger)', 'Debout, penchez le buste en avant en gardant le dos droit et une jambe qui se lève à l''arrière, puis revenez. Alternez.'),
  -- Étoffement — Entorse de la cheville
  ('Flexion plantaire active de la cheville', 'Assis ou allongé, pointez puis relâchez la pointe du pied, mouvement lent et contrôlé.'),
  ('Étirement du mollet contre le mur', 'Face à un mur, une jambe en arrière tendue, talon au sol, penchez-vous vers le mur jusqu''à sentir l''étirement du mollet.'),
  ('Marche sur la pointe des pieds', 'Marchez quelques pas sur la pointe des pieds, en gardant l''équilibre et le dos droit.'),
  ('Changements de direction contrôlés (proprioception de cheville)', 'En marchant, changez de direction à angle droit de façon contrôlée, sans à-coup sur la cheville.'),
  -- Étoffement — Cervicalgie
  ('Extension cervicale douce', 'Assis, levez doucement le menton vers le plafond dans une amplitude confortable, puis revenez au centre.'),
  ('Rotation cervicale avec regard actif', 'Assis, tournez la tête d''un côté en accompagnant du regard, maintenez, puis changez de côté.'),
  ('Extension cervicale résistée', 'Une main derrière la tête, poussez la tête vers l''arrière contre la main sans bouger, maintenez, relâchez.'),
  ('Posture debout dos au mur, menton rentré', 'Dos, tête et talons contre un mur, rentrez légèrement le menton et maintenez la posture quelques secondes.'),

  -- Nouvelle zone — Épaule (tendinopathie / coiffe des rotateurs)
  ('Pendulaire de Codman', 'Penché en avant, appui sur une main, laissez le bras pendre et le balancer doucement en petits cercles.'),
  ('Mobilité passive en élévation assistée', 'Allongé sur le dos, aidez le bras douloureux à monter vers le plafond avec l''autre main, sans forcer.'),
  ('Rotation externe à la bande élastique, coude au corps', 'Coude collé au corps et plié à 90°, tirez la bande élastique vers l''extérieur, puis revenez lentement.'),
  ('Élévation antérieure du bras assistée', 'Debout, levez le bras tendu vers l''avant jusqu''à l''amplitude confortable, aidé si besoin par l''autre main.'),
  ('Étirement de l''épaule en adduction croisée', 'Ramenez un bras tendu devant la poitrine avec l''autre bras, maintenez l''étirement 20 secondes.'),
  ('Rotation interne à la bande élastique, coude au corps', 'Coude collé au corps et plié à 90°, tirez la bande élastique vers l''intérieur, puis revenez lentement.'),
  ('Élévation latérale contrôlée (charge légère)', 'Debout, bras le long du corps, levez les bras sur le côté jusqu''à l''horizontale avec une charge légère, puis redescendez.'),
  ('Rétropulsion d''épaule en position penchée', 'Buste penché en avant, tirez les bras vers l''arrière en serrant les omoplates, puis relâchez.'),
  ('Rotation externe en position bras à 90°', 'Bras levé à l''horizontale, coude plié à 90°, tournez l''avant-bras vers le haut puis revenez, mouvement contrôlé.'),
  ('Pompes murales (doigts au mur)', 'Face à un mur, faites grimper les doigts le long du mur pour gagner en amplitude d''élévation du bras.'),
  ('Mouvement de lancer contrôlé, bras tendu', 'Bras tendu, simulez un mouvement de lancer lent et contrôlé contre une légère résistance élastique.'),

  -- Nouvelle zone — Genou (syndrome fémoro-patellaire)
  ('Contraction isométrique du quadriceps', 'Jambe tendue, contractez le devant de la cuisse en poussant l''arrière du genou vers le sol, maintenez, relâchez.'),
  ('Mobilité active du genou en flexion-extension', 'Assis, pliez et tendez lentement le genou dans l''amplitude confortable, sans douleur.'),
  ('Étirement doux des ischio-jambiers assis', 'Assis, une jambe tendue devant vous, penchez le buste vers l''avant en gardant le dos droit. Maintenez.'),
  ('Mini-squat contrôlé', 'Pieds écartés largeur des épaules, descendez légèrement en pliant les genoux, sans dépasser une flexion confortable, puis remontez.'),
  ('Assis-debout sur chaise', 'Depuis une chaise, levez-vous en poussant sur les jambes, dos droit, puis rasseyez-vous lentement.'),
  ('Étirement du quadriceps debout', 'Debout, ramenez un pied vers la fesse en tenant la cheville, genoux alignés. Maintenez, puis changez de jambe.'),
  ('Montée de marche contrôlée', 'Montez sur une marche ou un step avec une jambe, contrôlez la descente, puis alternez.'),
  ('Squat sur une jambe partiel', 'En appui sur une jambe, descendez légèrement en pliant le genou, genou aligné avec le pied, puis remontez.'),
  ('Squat sauté contrôlé', 'Descendez en squat puis sautez légèrement vers le haut, en amortissant la réception avec les genoux fléchis.'),
  ('Fentes latérales dynamiques', 'Grand pas sur le côté, pliez le genou d''appui en gardant l''autre jambe tendue, puis revenez au centre. Alternez.'),
  ('Descente de marche en contrôle du genou', 'Depuis une marche, descendez lentement une jambe vers le sol en contrôlant le genou d''appui, sans à-coup.'),

  -- Nouvelle zone — Hanche (tendinopathie des fessiers)
  ('Contraction isométrique des fessiers', 'Debout ou allongé, contractez les fessiers et maintenez quelques secondes, puis relâchez.'),
  ('Mobilité douce de la hanche en rotation', 'Allongé sur le dos, genou plié à 90°, faites tourner doucement la jambe vers l''intérieur puis l''extérieur.'),
  ('Étirement du psoas en fente basse', 'Genou au sol en fente basse, poussez le bassin vers l''avant jusqu''à sentir l''étirement à l''avant de la hanche arrière.'),
  ('Clam (palourde) avec élastique', 'Allongé sur le côté, genoux pliés, élastique autour des cuisses, ouvrez le genou du dessus comme une coquille, puis revenez.'),
  ('Marche latérale avec élastique (crabe)', 'Élastique autour des chevilles, jambes légèrement fléchies, avancez sur le côté par petits pas, tension constante.'),
  ('Pont fessier unilatéral', 'Allongé sur le dos, un genou plié et l''autre jambe tendue, soulevez le bassin en poussant sur le talon au sol, puis redescendez.'),
  ('Renforcement des fessiers en coquille progressive', 'Comme le clam, mais en ajoutant une résistance ou une pause en position ouverte pour intensifier le travail des fessiers.'),
  ('Squat sumo, focus fessiers', 'Pieds largement écartés, pointes tournées vers l''extérieur, descendez en squat en gardant le dos droit, puis remontez.'),
  ('Extension de hanche en quadrupédie (donkey kick)', 'À quatre pattes, tendez une jambe vers l''arrière et le haut en gardant le genou plié à 90°, puis redescendez sans cambrer le dos.'),
  ('Pont fessier avec charge (une jambe)', 'Comme le pont fessier unilatéral, avec une légère charge sur le bassin pour intensifier le travail des fessiers.'),
  ('Fentes latérales avec élastique aux hanches', 'Élastique au-dessus des genoux, réalisez une fente latérale en maintenant une tension constante sur l''élastique.'),
  ('Sauts latéraux avec réception contrôlée (renforcement hanche)', 'Sautez d''un côté à l''autre en contrôlant la réception, genou et hanche alignés, sans affaissement vers l''intérieur.'),

  -- Nouvelle zone — Poignet (tendinopathie du poignet et de l'avant-bras)
  ('Mobilité active du poignet en flexion-extension', 'Avant-bras posé, montez et descendez lentement la main au niveau du poignet, dans l''amplitude confortable.'),
  ('Étirement doux des extenseurs du poignet, coude tendu', 'Bras tendu devant vous, poignet fléchi vers le bas, tirez doucement la main vers vous avec l''autre main. Maintenez.'),
  ('Étirement doux des fléchisseurs du poignet, coude tendu', 'Bras tendu devant vous, poignet en extension, tirez doucement les doigts vers vous avec l''autre main. Maintenez.'),
  ('Serrage de balle souple', 'Serrez une balle souple dans la main, maintenez quelques secondes, puis relâchez. Répétez.'),
  ('Ouverture et fermeture des doigts contre résistance légère', 'Un élastique autour des doigts, ouvrez la main contre la résistance, puis refermez lentement.'),
  ('Renforcement isométrique du poignet en extension', 'Avant-bras posé, main hors du bord, poussez le dos de la main vers le haut contre une résistance manuelle, maintenez.'),
  ('Renforcement du poignet en extension avec haltère léger', 'Avant-bras posé, main hors du bord tenant un léger poids, montez et descendez le poignet lentement.'),
  ('Renforcement du poignet en flexion avec haltère léger', 'Avant-bras posé, paume vers le haut tenant un léger poids, montez et descendez le poignet lentement.'),
  ('Pronation-supination avec bouteille lestée', 'Coude plié à 90°, tenez une bouteille par un bout et tournez l''avant-bras paume vers le haut puis vers le bas.'),
  ('Renforcement excentrique du poignet (épicondylien)', 'Avant-bras posé, remontez le poignet avec l''autre main puis laissez-le redescendre lentement et seul contre une légère résistance.'),
  ('Prise en pince avec les doigts, objets variés', 'Saisissez et maintenez différents petits objets entre le pouce et les doigts pour travailler la préhension fine.'),
  ('Retour progressif au geste sportif ou professionnel (poignet)', 'Reproduisez lentement et sans douleur le geste habituel (raquette, clavier, outil...) en augmentant progressivement l''intensité.')
) as v(name, instr)
where not exists (select 1 from public.exercises e where e.name = v.name);

-- ---------------------------------------------------------------------------
-- 2. New conditions (idempotent by name)
-- ---------------------------------------------------------------------------
insert into public.conditions (name, description)
select v.name, v.descr
from (values
  ('Tendinopathie de l''épaule', 'Programme progressif pour soulager et renforcer l''épaule en cas de douleur ou de tendinopathie de la coiffe des rotateurs.'),
  ('Syndrome fémoro-patellaire', 'Rééducation progressive du genou : mobilité, renforcement du quadriceps et retour au mouvement fonctionnel.'),
  ('Tendinopathie des fessiers', 'Renforcement des fessiers et mobilité de la hanche pour soulager les douleurs latérales de hanche.'),
  ('Tendinopathie du poignet', 'Rééducation progressive du poignet et de l''avant-bras : mobilité, renforcement et retour au geste.')
) as v(name, descr)
where not exists (select 1 from public.conditions c where c.name = v.name and c.created_by is null);

-- ---------------------------------------------------------------------------
-- 3. Stage-tagged workouts for the new conditions (idempotent)
-- ---------------------------------------------------------------------------
insert into public.workouts (condition_id, name, description, duration_minutes, times_per_week, stage, created_by)
select c.id, v.wname, v.descr, v.dur, v.tpw, v.stage, null
from public.conditions c
join (values
  ('Tendinopathie de l''épaule',   'Phase 1 — Protection (jours 0-7)',      'Mobilité très douce et soulagement de la douleur à l''épaule.',        8, 7, 'acute'),
  ('Tendinopathie de l''épaule',   'Phase 2 — Mobilité (semaines 1-2)',     'Récupération de l''amplitude et premiers exercices assistés.',        10, 6, 'subacute'),
  ('Tendinopathie de l''épaule',   'Phase 3 — Renforcement (semaines 2-4)', 'Renforcement de la coiffe des rotateurs à la bande élastique.',       15, 4, 'recovery'),
  ('Tendinopathie de l''épaule',   'Phase 4 — Reprise (semaines 4+)',       'Renforcement fonctionnel et retour au geste sportif.',                18, 3, 'return_to_sport'),
  ('Syndrome fémoro-patellaire',   'Phase 1 — Soulagement (jours 0-7)',     'Mobilité douce et activation du quadriceps sans douleur.',            8, 7, 'acute'),
  ('Syndrome fémoro-patellaire',   'Phase 2 — Mobilité (semaines 1-2)',     'Mobilité fonctionnelle et premiers renforcements légers.',            10, 6, 'subacute'),
  ('Syndrome fémoro-patellaire',   'Phase 3 — Renforcement (semaines 2-4)','Renforcement du quadriceps et du contrôle du genou.',                  15, 4, 'recovery'),
  ('Syndrome fémoro-patellaire',   'Phase 4 — Reprise (semaines 4+)',       'Exercices dynamiques et retour aux activités.',                       18, 3, 'return_to_sport'),
  ('Tendinopathie des fessiers',   'Phase 1 — Soulagement (jours 0-7)',     'Activation douce des fessiers et mobilité de la hanche.',              8, 7, 'acute'),
  ('Tendinopathie des fessiers',   'Phase 2 — Mobilité (semaines 1-2)',     'Renforcement léger des fessiers et stabilité du bassin.',             10, 6, 'subacute'),
  ('Tendinopathie des fessiers',   'Phase 3 — Renforcement (semaines 2-4)','Renforcement progressif des fessiers et de la hanche.',                15, 4, 'recovery'),
  ('Tendinopathie des fessiers',   'Phase 4 — Reprise (semaines 4+)',       'Renforcement fonctionnel et retour aux activités.',                    18, 3, 'return_to_sport'),
  ('Tendinopathie du poignet',     'Phase 1 — Protection (jours 0-7)',      'Mobilité douce du poignet et soulagement de la douleur.',              6, 7, 'acute'),
  ('Tendinopathie du poignet',     'Phase 2 — Mobilité (semaines 1-2)',     'Renforcement léger et premiers exercices de préhension.',              8, 6, 'subacute'),
  ('Tendinopathie du poignet',     'Phase 3 — Renforcement (semaines 2-4)','Renforcement progressif du poignet et de l''avant-bras.',              10, 4, 'recovery'),
  ('Tendinopathie du poignet',     'Phase 4 — Reprise (semaines 4+)',       'Retour progressif au geste sportif ou professionnel.',                10, 3, 'return_to_sport')
) as v(cname, wname, descr, dur, tpw, stage)
  on v.cname = c.name and c.created_by is null
where not exists (
  select 1 from public.workouts w where w.condition_id = c.id and w.name = v.wname
);

-- ---------------------------------------------------------------------------
-- 4. Exercises inside each new workout, plus one extra exercise per phase on
--    the 3 existing conditions (idempotent)
-- ---------------------------------------------------------------------------
insert into public.workout_exercises (workout_id, exercise_id, position)
select w.id, e.id, v.pos
from public.workouts w
join public.conditions c on c.id = w.condition_id and c.created_by is null
join (values
  -- Étoffement des conditions existantes (4e exercice de chaque phase)
  ('Lombalgie chronique',    'Phase 1 — Soulagement (jours 0-7)',      'Étirement lombaire en enroulement, jambes repliées', 3),
  ('Lombalgie chronique',    'Phase 2 — Mobilité (semaines 1-2)',      'Étirement latéral du bas du dos', 3),
  ('Lombalgie chronique',    'Phase 3 — Renforcement (semaines 2-4)',  'Extension lombaire allégée', 3),
  ('Lombalgie chronique',    'Phase 4 — Reprise (semaines 4+)',        'Soulevé de terre à la jambe tendue, dos droit (léger)', 3),
  ('Entorse de la cheville', 'Phase 1 — Protection (jours 0-7)',       'Flexion plantaire active de la cheville', 3),
  ('Entorse de la cheville', 'Phase 2 — Mobilité (semaines 1-2)',      'Étirement du mollet contre le mur', 3),
  ('Entorse de la cheville', 'Phase 3 — Renforcement (semaines 2-4)',  'Marche sur la pointe des pieds', 3),
  ('Entorse de la cheville', 'Phase 4 — Reprise (semaines 4+)',        'Changements de direction contrôlés (proprioception de cheville)', 3),
  ('Cervicalgie',            'Phase 1 — Soulagement (jours 0-7)',      'Extension cervicale douce', 3),
  ('Cervicalgie',            'Phase 2 — Mobilité (semaines 1-2)',      'Rotation cervicale avec regard actif', 3),
  ('Cervicalgie',            'Phase 3 — Renforcement (semaines 2-4)',  'Extension cervicale résistée', 3),
  ('Cervicalgie',            'Phase 4 — Reprise (semaines 4+)',        'Posture debout dos au mur, menton rentré', 3),

  -- Épaule
  ('Tendinopathie de l''épaule', 'Phase 1 — Protection (jours 0-7)',      'Pendulaire de Codman', 0),
  ('Tendinopathie de l''épaule', 'Phase 1 — Protection (jours 0-7)',      'Mobilité passive en élévation assistée', 1),
  ('Tendinopathie de l''épaule', 'Phase 1 — Protection (jours 0-7)',      'Rétraction scapulaire', 2),
  ('Tendinopathie de l''épaule', 'Phase 2 — Mobilité (semaines 1-2)',     'Rotation externe à la bande élastique, coude au corps', 0),
  ('Tendinopathie de l''épaule', 'Phase 2 — Mobilité (semaines 1-2)',     'Élévation antérieure du bras assistée', 1),
  ('Tendinopathie de l''épaule', 'Phase 2 — Mobilité (semaines 1-2)',     'Étirement de l''épaule en adduction croisée', 2),
  ('Tendinopathie de l''épaule', 'Phase 3 — Renforcement (semaines 2-4)', 'Rotation interne à la bande élastique, coude au corps', 0),
  ('Tendinopathie de l''épaule', 'Phase 3 — Renforcement (semaines 2-4)', 'Élévation latérale contrôlée (charge légère)', 1),
  ('Tendinopathie de l''épaule', 'Phase 3 — Renforcement (semaines 2-4)', 'Rétropulsion d''épaule en position penchée', 2),
  ('Tendinopathie de l''épaule', 'Phase 4 — Reprise (semaines 4+)',       'Rotation externe en position bras à 90°', 0),
  ('Tendinopathie de l''épaule', 'Phase 4 — Reprise (semaines 4+)',       'Pompes murales (doigts au mur)', 1),
  ('Tendinopathie de l''épaule', 'Phase 4 — Reprise (semaines 4+)',       'Mouvement de lancer contrôlé, bras tendu', 2),

  -- Genou
  ('Syndrome fémoro-patellaire', 'Phase 1 — Soulagement (jours 0-7)',      'Contraction isométrique du quadriceps', 0),
  ('Syndrome fémoro-patellaire', 'Phase 1 — Soulagement (jours 0-7)',      'Mobilité active du genou en flexion-extension', 1),
  ('Syndrome fémoro-patellaire', 'Phase 1 — Soulagement (jours 0-7)',      'Étirement doux des ischio-jambiers assis', 2),
  ('Syndrome fémoro-patellaire', 'Phase 2 — Mobilité (semaines 1-2)',      'Mini-squat contrôlé', 0),
  ('Syndrome fémoro-patellaire', 'Phase 2 — Mobilité (semaines 1-2)',      'Assis-debout sur chaise', 1),
  ('Syndrome fémoro-patellaire', 'Phase 2 — Mobilité (semaines 1-2)',      'Étirement du quadriceps debout', 2),
  ('Syndrome fémoro-patellaire', 'Phase 3 — Renforcement (semaines 2-4)', 'Montée de marche contrôlée', 0),
  ('Syndrome fémoro-patellaire', 'Phase 3 — Renforcement (semaines 2-4)', 'Squat sur une jambe partiel', 1),
  ('Syndrome fémoro-patellaire', 'Phase 3 — Renforcement (semaines 2-4)', 'Fente avant', 2),
  ('Syndrome fémoro-patellaire', 'Phase 4 — Reprise (semaines 4+)',       'Squat sauté contrôlé', 0),
  ('Syndrome fémoro-patellaire', 'Phase 4 — Reprise (semaines 4+)',       'Fentes latérales dynamiques', 1),
  ('Syndrome fémoro-patellaire', 'Phase 4 — Reprise (semaines 4+)',       'Descente de marche en contrôle du genou', 2),

  -- Hanche
  ('Tendinopathie des fessiers', 'Phase 1 — Soulagement (jours 0-7)',      'Contraction isométrique des fessiers', 0),
  ('Tendinopathie des fessiers', 'Phase 1 — Soulagement (jours 0-7)',      'Mobilité douce de la hanche en rotation', 1),
  ('Tendinopathie des fessiers', 'Phase 1 — Soulagement (jours 0-7)',      'Étirement du psoas en fente basse', 2),
  ('Tendinopathie des fessiers', 'Phase 2 — Mobilité (semaines 1-2)',      'Clam (palourde) avec élastique', 0),
  ('Tendinopathie des fessiers', 'Phase 2 — Mobilité (semaines 1-2)',      'Marche latérale avec élastique (crabe)', 1),
  ('Tendinopathie des fessiers', 'Phase 2 — Mobilité (semaines 1-2)',      'Pont fessier unilatéral', 2),
  ('Tendinopathie des fessiers', 'Phase 3 — Renforcement (semaines 2-4)', 'Renforcement des fessiers en coquille progressive', 0),
  ('Tendinopathie des fessiers', 'Phase 3 — Renforcement (semaines 2-4)', 'Squat sumo, focus fessiers', 1),
  ('Tendinopathie des fessiers', 'Phase 3 — Renforcement (semaines 2-4)', 'Extension de hanche en quadrupédie (donkey kick)', 2),
  ('Tendinopathie des fessiers', 'Phase 4 — Reprise (semaines 4+)',       'Pont fessier avec charge (une jambe)', 0),
  ('Tendinopathie des fessiers', 'Phase 4 — Reprise (semaines 4+)',       'Fentes latérales avec élastique aux hanches', 1),
  ('Tendinopathie des fessiers', 'Phase 4 — Reprise (semaines 4+)',       'Sauts latéraux avec réception contrôlée (renforcement hanche)', 2),

  -- Poignet
  ('Tendinopathie du poignet', 'Phase 1 — Protection (jours 0-7)',      'Mobilité active du poignet en flexion-extension', 0),
  ('Tendinopathie du poignet', 'Phase 1 — Protection (jours 0-7)',      'Étirement doux des extenseurs du poignet, coude tendu', 1),
  ('Tendinopathie du poignet', 'Phase 1 — Protection (jours 0-7)',      'Étirement doux des fléchisseurs du poignet, coude tendu', 2),
  ('Tendinopathie du poignet', 'Phase 2 — Mobilité (semaines 1-2)',     'Serrage de balle souple', 0),
  ('Tendinopathie du poignet', 'Phase 2 — Mobilité (semaines 1-2)',     'Ouverture et fermeture des doigts contre résistance légère', 1),
  ('Tendinopathie du poignet', 'Phase 2 — Mobilité (semaines 1-2)',     'Renforcement isométrique du poignet en extension', 2),
  ('Tendinopathie du poignet', 'Phase 3 — Renforcement (semaines 2-4)', 'Renforcement du poignet en extension avec haltère léger', 0),
  ('Tendinopathie du poignet', 'Phase 3 — Renforcement (semaines 2-4)', 'Renforcement du poignet en flexion avec haltère léger', 1),
  ('Tendinopathie du poignet', 'Phase 3 — Renforcement (semaines 2-4)', 'Pronation-supination avec bouteille lestée', 2),
  ('Tendinopathie du poignet', 'Phase 4 — Reprise (semaines 4+)',       'Renforcement excentrique du poignet (épicondylien)', 0),
  ('Tendinopathie du poignet', 'Phase 4 — Reprise (semaines 4+)',       'Prise en pince avec les doigts, objets variés', 1),
  ('Tendinopathie du poignet', 'Phase 4 — Reprise (semaines 4+)',       'Retour progressif au geste sportif ou professionnel (poignet)', 2)
) as v(cname, wname, ename, pos)
  on v.cname = c.name and v.wname = w.name
join public.exercises e on e.name = v.ename
where not exists (
  select 1 from public.workout_exercises we where we.workout_id = w.id and we.exercise_id = e.id
);
