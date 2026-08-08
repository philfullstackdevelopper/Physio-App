-- Physio-App — Migration 0021: extended exercise library v2
-- Run once in Supabase (SQL Editor -> New query -> paste -> Run). Idempotent.
--
-- Ten new conditions not yet covered, ~120 new exercises. Same approach as
-- migration 0016: ORIGINAL content (own wording, own selection — standard,
-- widely-known physiotherapy movements, not copied from any third-party
-- platform).
--
-- CLINICAL NOTE: standard starter progressions, meant to be reviewed and
-- adjusted by the physiotherapist — not fixed medical prescriptions.

-- ---------------------------------------------------------------------------
-- 1. New exercises (idempotent by name)
-- ---------------------------------------------------------------------------
insert into public.exercises (name, instructions)
select v.name, v.instr
from (values
  -- Tendinopathie du coude (épicondylite / épitrochléite)
  ('Flexion-extension douce du poignet, coude tendu', 'Bras tendu devant vous, montez et descendez lentement la main au niveau du poignet, sans forcer.'),
  ('Étirement doux des extenseurs, coude tendu', 'Bras tendu devant vous, poignet fléchi vers le bas, tirez doucement la main vers vous avec l''autre main.'),
  ('Auto-massage transversal léger de l''avant-bras', 'Avec le pouce de l''autre main, effectuez de petits mouvements transversaux sur la zone douloureuse de l''avant-bras, sans appuyer fort.'),
  ('Étirement prolongé des extenseurs du poignet', 'Bras tendu, poignet fléchi vers le bas, maintenez l''étirement 30 secondes, coude bien tendu.'),
  ('Pronosupination sans charge', 'Coude plié à 90° collé au corps, tournez lentement l''avant-bras paume vers le haut puis vers le bas.'),
  ('Serrage de balle souple (coude)', 'Serrez une balle souple dans la main, maintenez quelques secondes, puis relâchez. Répétez.'),
  ('Renforcement excentrique des extenseurs du poignet', 'Avant-bras posé, main hors du bord, remontez le poignet avec l''autre main puis laissez-le redescendre lentement seul.'),
  ('Renforcement excentrique des fléchisseurs du poignet', 'Avant-bras posé, paume vers le haut, remontez le poignet avec l''autre main puis laissez-le redescendre lentement seul.'),
  ('Pronosupination avec léger poids', 'Coude plié à 90°, tenez un léger poids et tournez l''avant-bras paume vers le haut puis vers le bas, mouvement contrôlé.'),
  ('Préhension progressive avec charge légère', 'Saisissez et soulevez de petits objets de poids croissant, en contrôlant le geste.'),
  ('Simulation du geste habituel à faible intensité', 'Reproduisez lentement le mouvement qui vous a gêné (outil, raquette, clavier), sans douleur, à faible intensité.'),
  ('Renforcement combiné poignet-coude', 'Coude tendu, poignet en mouvement contrôlé contre une résistance légère (élastique), en variant les angles.'),

  -- Sciatique (lombosciatique)
  ('Position antalgique, genoux surélevés', 'Allongé sur le dos, jambes surélevées sur un coussin ou une chaise, relâchez le bas du dos quelques minutes.'),
  ('Bascule du bassin en douceur (sciatique)', 'Allongé sur le dos, genoux pliés, basculez doucement le bassin d''avant en arrière en contractant légèrement le ventre.'),
  ('Respiration abdominale profonde', 'Allongé, une main sur le ventre, respirez profondément en gonflant le ventre à l''inspiration, en le rentrant à l''expiration.'),
  ('Étirement du piriforme, allongé', 'Allongé sur le dos, croisez une cheville sur le genou opposé et ramenez la cuisse vers vous. Maintenez 30 secondes.'),
  ('Glissement neural du nerf sciatique, léger', 'Assis, tendez doucement le genou en fléchissant la cheville, sans forcer sur la sensation de tension. Mouvement lent et répété.'),
  ('Extension lombaire debout', 'Debout, mains dans le bas du dos, penchez doucement le buste en arrière, dans une amplitude confortable.'),
  ('Gainage abdominal léger (sciatique)', 'Allongé sur le dos, genoux pliés, contractez légèrement le ventre en gardant une respiration normale, maintenez quelques secondes.'),
  ('Pont fessier progressif', 'Allongé sur le dos, genoux pliés, soulevez le bassin doucement en contractant les fessiers, puis redescendez lentement.'),
  ('Étirement des ischio-jambiers assis (sciatique)', 'Assis, une jambe tendue devant vous, penchez le buste vers l''avant en gardant le dos droit. Maintenez.'),
  ('Squat fonctionnel léger', 'Pieds écartés largeur des épaules, descendez légèrement en pliant les genoux, dos droit, puis remontez.'),
  ('Marche rapide progressive', 'Marchez à un rythme légèrement soutenu pendant quelques minutes, en augmentant progressivement la durée.'),
  ('Gainage dynamique (sciatique)', 'En position de gainage, alternez de légers mouvements des bras ou des jambes tout en gardant le tronc stable.'),

  -- Fasciite plantaire
  ('Auto-massage de la voûte plantaire', 'Assis, faites rouler une balle souple sous la voûte plantaire pendant quelques minutes, pression modérée.'),
  ('Étirement du mollet genou tendu (pied)', 'Face à un mur, jambe en arrière tendue, talon au sol, penchez-vous vers le mur jusqu''à sentir l''étirement du mollet.'),
  ('Flexion-extension active des orteils', 'Assis, pliez et dépliez activement les orteils plusieurs fois, en contrôlant le mouvement.'),
  ('Étirement du fascia plantaire, orteils en extension', 'Assis, ramenez les orteils vers vous avec la main jusqu''à sentir un étirement sous le pied. Maintenez 20 secondes.'),
  ('Étirement du mollet contre un mur (fascia)', 'Debout face à un mur, une jambe en arrière tendue, poussez doucement la hanche vers le mur.'),
  ('Renforcement des intrinsèques du pied (serviette)', 'Assis, pieds sur une serviette posée au sol, ramenez la serviette vers vous en pliant les orteils.'),
  ('Montée sur pointe des pieds bilatérale (fascia)', 'Debout, montez sur la pointe des pieds puis redescendez lentement, les deux jambes ensemble.'),
  ('Montée sur pointe des pieds unilatérale', 'Debout sur une jambe, montez sur la pointe du pied puis redescendez lentement, en gardant l''équilibre.'),
  ('Équilibre sur surface instable', 'Tenez-vous debout sur un coussin ou une surface souple, en gardant l''équilibre 20 à 30 secondes.'),
  ('Marche sur terrain varié', 'Marchez quelques minutes sur différentes surfaces (herbe, sable si possible), à allure modérée.'),
  ('Course légère progressive (fascia)', 'Trottinez à allure très modérée sur une courte distance, en augmentant progressivement si aucune douleur.'),
  ('Sauts contrôlés à faible impact', 'Effectuez de petits sauts sur place, réception souple genoux fléchis, en contrôlant l''amortissement.'),

  -- Syndrome du canal carpien
  ('Glissement neural du nerf médian, position douce', 'Bras tendu devant vous, poignet et doigts en extension douce, puis relâchez. Mouvement lent et répété.'),
  ('Mobilité active du poignet, amplitude confortable', 'Assis, bougez le poignet dans toutes les directions, dans une amplitude confortable, sans douleur.'),
  ('Positionnement neutre du poignet au repos', 'Gardez le poignet dans une position neutre (ni trop plié, ni trop tendu) au repos, notamment la nuit si besoin d''une attelle.'),
  ('Étirement des fléchisseurs du poignet (canal carpien)', 'Bras tendu, poignet en extension, tirez doucement les doigts vers vous avec l''autre main. Maintenez.'),
  ('Étirement des extenseurs du poignet (canal carpien)', 'Bras tendu, poignet fléchi vers le bas, tirez doucement la main vers vous avec l''autre main. Maintenez.'),
  ('Ouverture-fermeture de la main, résistance légère', 'Un élastique autour des doigts, ouvrez la main contre la résistance, puis refermez lentement.'),
  ('Renforcement de la préhension, balle souple', 'Serrez une balle souple dans la main, maintenez quelques secondes, puis relâchez. Répétez.'),
  ('Renforcement des extenseurs du poignet à l''élastique', 'Avant-bras posé, main hors du bord, poussez le dos de la main vers le haut contre un élastique léger.'),
  ('Pince fine progressive', 'Saisissez de petits objets entre le pouce et l''index, en augmentant progressivement la difficulté.'),
  ('Reprise du geste répétitif à faible cadence', 'Reproduisez le geste habituel (clavier, outil) à rythme très lent, en augmentant progressivement la cadence.'),
  ('Renforcement combiné poignet-avant-bras', 'Alternez des mouvements de flexion-extension et de rotation du poignet contre une résistance légère.'),
  ('Endurance de préhension prolongée', 'Maintenez une prise ferme sur un objet pendant 20 à 30 secondes, en répétant plusieurs fois.'),

  -- Capsulite rétractile de l'épaule
  ('Pendulaire de Codman (capsulite)', 'Penché en avant, appui sur une main, laissez le bras pendre et le balancer doucement en petits cercles.'),
  ('Mobilité passive assistée en élévation (capsulite)', 'Allongé sur le dos, aidez le bras douloureux à monter vers le plafond avec l''autre main, sans forcer.'),
  ('Mobilité passive assistée en rotation externe', 'Coude au corps plié à 90°, à l''aide d''un bâton tenu des deux mains, poussez doucement l''avant-bras vers l''extérieur.'),
  ('Étirement en rotation externe à la porte', 'Avant-bras contre le cadre d''une porte, coude à 90°, tournez doucement le corps pour étirer l''épaule.'),
  ('Mobilité active-aidée avec bâton', 'Tenez un bâton des deux mains, aidez le bras raide à monter en poussant avec le bras valide.'),
  ('Étirement en élévation, mains jointes', 'Mains jointes devant vous, levez les bras tendus vers le haut le plus loin possible sans douleur vive.'),
  ('Renforcement de la coiffe des rotateurs à l''élastique (capsulite)', 'Coude au corps plié à 90°, tirez l''élastique vers l''extérieur puis revenez lentement.'),
  ('Renforcement des stabilisateurs de l''omoplate', 'Buste légèrement penché en avant, serrez les omoplates l''une vers l''autre, maintenez puis relâchez.'),
  ('Mobilité active complète progressive', 'Levez le bras le plus haut possible sans aide, dans toutes les directions, en notant les progrès.'),
  ('Mouvements fonctionnels au-dessus de la tête', 'Simulez des gestes du quotidien nécessitant de lever le bras (ranger un objet en hauteur), à charge légère.'),
  ('Renforcement global de l''épaule, charge légère', 'Effectuez des élévations latérales et frontales du bras avec un léger poids, mouvement contrôlé.'),
  ('Retour aux activités habituelles (épaule)', 'Reprenez progressivement vos activités quotidiennes ou sportives impliquant l''épaule, en augmentant l''intensité par paliers.'),

  -- Tendinopathie d'Achille
  ('Isométrie du mollet contre résistance', 'Debout, poussez sur la pointe des pieds contre une résistance (mur ou marche) et maintenez la position quelques secondes.'),
  ('Mobilité active de la cheville (achille)', 'Assis, bougez la cheville dans toutes les directions, mouvement lent et contrôlé.'),
  ('Auto-massage léger du mollet', 'Avec les mains ou un rouleau, massez doucement le mollet du bas vers le haut, sans appuyer sur la zone la plus sensible.'),
  ('Étirement du mollet genou tendu (achille)', 'Face à un mur, jambe en arrière tendue, talon au sol, penchez-vous vers le mur jusqu''à sentir l''étirement.'),
  ('Étirement du mollet genou fléchi (soléaire)', 'Même position que l''étirement du mollet, mais genou arrière légèrement fléchi, pour cibler le muscle profond du mollet.'),
  ('Montée sur pointe des pieds bilatérale lente', 'Debout, montez lentement sur la pointe des pieds puis redescendez tout aussi lentement, les deux jambes ensemble.'),
  ('Renforcement excentrique du mollet, genou tendu', 'Sur une marche, montez sur la pointe des pieds avec les deux jambes, puis redescendez lentement sur une seule jambe, genou tendu.'),
  ('Renforcement excentrique du mollet, genou fléchi', 'Même exercice que le précédent, mais genou légèrement fléchi pendant la descente.'),
  ('Montée sur pointe des pieds unilatérale (achille)', 'Debout sur une jambe, montez sur la pointe du pied puis redescendez lentement.'),
  ('Sauts à la corde légers', 'Effectuez de petits sauts légers, à faible amplitude, en contrôlant la réception.'),
  ('Course progressive (achille)', 'Reprenez la course sur de courtes distances à allure modérée, en augmentant progressivement.'),
  ('Changements de direction contrôlés (achille)', 'En marchant ou en trottinant, changez de direction de façon contrôlée, sans à-coup sur le tendon.'),

  -- Arthrose du genou (gonarthrose)
  ('Mobilité active du genou sans charge', 'Assis ou allongé, pliez et tendez lentement le genou, dans l''amplitude confortable, sans douleur.'),
  ('Contraction isométrique du quadriceps (arthrose)', 'Jambe tendue, contractez le devant de la cuisse en poussant l''arrière du genou vers le sol, maintenez, relâchez.'),
  ('Élévation de jambe tendue', 'Allongé sur le dos, une jambe pliée, l''autre tendue, soulevez la jambe tendue de quelques centimètres, maintenez, redescendez.'),
  ('Vélo stationnaire sans résistance', 'Pédalez sur un vélo d''appartement sans résistance, à rythme confortable, quelques minutes.'),
  ('Renforcement du quadriceps en chaîne fermée légère', 'Debout, légère flexion des genoux en gardant les pieds au sol, dans une amplitude confortable.'),
  ('Étirement des ischio-jambiers (genou arthrose)', 'Assis, une jambe tendue devant vous, penchez le buste vers l''avant en gardant le dos droit. Maintenez.'),
  ('Mini-squats contrôlés (arthrose genou)', 'Pieds écartés largeur des épaules, descendez légèrement en pliant les genoux, sans dépasser une flexion confortable.'),
  ('Montée de marche contrôlée (genou arthrose)', 'Montez sur une marche ou un step avec une jambe, contrôlez la descente, puis alternez.'),
  ('Renforcement des abducteurs de hanche (genou)', 'Allongé sur le côté, jambe du dessus tendue, levez-la légèrement puis redescendez, sans bouger le bassin.'),
  ('Marche prolongée (genou arthrose)', 'Marchez à allure confortable, en augmentant progressivement la durée selon la tolérance.'),
  ('Squat fonctionnel (genou arthrose)', 'Pieds écartés largeur des épaules, descendez en squat en gardant le dos droit, puis remontez.'),
  ('Équilibre unipodal dynamique', 'Tenez-vous sur une jambe en effectuant de petits mouvements du bras opposé, pour travailler la stabilité.'),

  -- Arthrose de la hanche (coxarthrose)
  ('Mobilité active de la hanche en flexion', 'Allongé sur le dos, ramenez doucement un genou vers la poitrine, puis reposez la jambe.'),
  ('Contraction isométrique des fessiers (coxarthrose)', 'Debout ou allongé, contractez les fessiers et maintenez quelques secondes, puis relâchez.'),
  ('Marche courte avec aide si besoin', 'Marchez sur une courte distance à votre rythme, en utilisant une aide à la marche si nécessaire.'),
  ('Mobilité active en abduction', 'Allongé sur le dos, jambe tendue, écartez doucement la jambe sur le côté puis ramenez-la.'),
  ('Renforcement léger des abducteurs, allongé', 'Allongé sur le côté, jambe du dessus tendue, levez-la légèrement, maintenez, puis redescendez.'),
  ('Étirement doux des fléchisseurs de hanche', 'Genou au sol en fente basse, poussez doucement le bassin vers l''avant jusqu''à sentir l''étirement à l''avant de la hanche.'),
  ('Pont fessier (coxarthrose)', 'Allongé sur le dos, genoux pliés, soulevez le bassin en contractant les fessiers, puis redescendez lentement.'),
  ('Squat partiel avec appui', 'En vous tenant à un support stable, descendez légèrement en pliant les genoux, puis remontez.'),
  ('Renforcement des abducteurs debout à l''élastique', 'Debout, élastique autour des chevilles, écartez une jambe sur le côté contre la résistance, puis revenez.'),
  ('Marche prolongée sans aide (hanche)', 'Marchez à allure confortable sans aide à la marche, si votre tolérance le permet, en augmentant progressivement.'),
  ('Montée d''escaliers contrôlée', 'Montez les escaliers en contrôlant le mouvement, en vous tenant à la rampe si besoin.'),
  ('Squat fonctionnel complet (hanche)', 'Pieds écartés largeur des épaules, descendez en squat en gardant le dos droit, puis remontez.'),

  -- Syndrome de la bandelette ilio-tibiale
  ('Mobilité de hanche douce (bandelette)', 'Allongé sur le dos, genou plié à 90°, faites tourner doucement la jambe vers l''intérieur puis l''extérieur.'),
  ('Auto-massage de la face externe de la cuisse', 'À l''aide d''un rouleau ou des mains, massez doucement la face externe de la cuisse, du genou vers la hanche.'),
  ('Étirement doux de la bandelette ilio-tibiale', 'Debout, croisez une jambe derrière l''autre et penchez le buste sur le côté opposé, en sentant l''étirement sur la cuisse.'),
  ('Renforcement des abducteurs de hanche, allongé (bandelette)', 'Allongé sur le côté, jambe du dessus tendue, levez-la légèrement, maintenez, puis redescendez.'),
  ('Étirement croisé debout', 'Debout, croisez une jambe devant l''autre, penchez légèrement le buste vers le côté pour étirer la hanche.'),
  ('Gainage latéral léger', 'Allongé sur le côté, appui sur l''avant-bras, soulevez légèrement le bassin et maintenez quelques secondes.'),
  ('Squat sur une jambe avec contrôle du genou', 'En appui sur une jambe, descendez légèrement en veillant à ce que le genou reste aligné avec le pied.'),
  ('Marche latérale avec élastique (bandelette)', 'Élastique autour des chevilles, jambes légèrement fléchies, avancez sur le côté par petits pas.'),
  ('Fentes latérales contrôlées (bandelette)', 'Grand pas sur le côté, pliez le genou d''appui en gardant l''autre jambe tendue, puis revenez au centre.'),
  ('Course progressive sur terrain plat', 'Reprenez la course sur terrain plat, à allure modérée, en augmentant progressivement la distance.'),
  ('Changements de direction contrôlés (bandelette)', 'En courant légèrement, changez de direction de façon contrôlée, genou aligné avec le pied.'),
  ('Retour à l''entraînement progressif (bandelette)', 'Reprenez votre activité sportive habituelle par paliers d''intensité croissante, en surveillant l''absence de douleur.'),

  -- Torticolis / raideur cervicale aiguë
  ('Respiration et relâchement des trapèzes', 'Assis, épaules détendues, respirez profondément en laissant les épaules descendre à chaque expiration.'),
  ('Mobilité cervicale très douce en rotation', 'Assis, tournez très doucement la tête d''un côté puis de l''autre, dans une amplitude confortable, sans forcer.'),
  ('Position antalgique de repos (torticolis)', 'Trouvez une position assise ou allongée qui soulage la douleur cervicale, et maintenez-la quelques minutes.'),
  ('Mobilité cervicale active en flexion-extension', 'Assis, penchez doucement la tête vers l''avant puis vers l''arrière, dans une amplitude confortable.'),
  ('Mobilité cervicale active en inclinaison latérale', 'Assis, penchez doucement l''oreille vers l''épaule d''un côté puis de l''autre, sans forcer.'),
  ('Auto-massage doux du cou et des trapèzes', 'Avec les doigts, massez doucement les muscles du cou et du haut des épaules, mouvements circulaires légers.'),
  ('Renforcement isométrique cervical multidirectionnel', 'Main contre le front (puis la tempe, puis l''arrière de la tête), poussez doucement la tête contre la main sans bouger, maintenez.'),
  ('Rétraction cervicale, double menton (torticolis)', 'Reculez la tête pour rentrer le menton, sans baisser le regard. Maintenez quelques secondes, répétez.'),
  ('Renforcement des trapèzes et rhomboïdes', 'Buste légèrement penché en avant, tirez les bras vers l''arrière en serrant les omoplates, puis relâchez.'),
  ('Mobilité cervicale complète active', 'Effectuez lentement l''ensemble des mouvements du cou (rotation, flexion, extension, inclinaison) dans une amplitude confortable.'),
  ('Renforcement fonctionnel du rachis cervical', 'Maintenez une bonne posture de la tête et du cou pendant des mouvements simples du quotidien (marche, tâches légères).'),
  ('Retour aux activités habituelles (cervical)', 'Reprenez progressivement vos activités quotidiennes normales, en étant attentif à une bonne posture.')
) as v(name, instr)
where not exists (select 1 from public.exercises e where e.name = v.name);

-- ---------------------------------------------------------------------------
-- 2. New conditions (idempotent by name)
-- ---------------------------------------------------------------------------
insert into public.conditions (name, description)
select v.name, v.descr
from (values
  ('Tendinopathie du coude', 'Programme progressif pour soulager et renforcer le coude en cas d''épicondylite ou d''épitrochléite.'),
  ('Sciatique', 'Rééducation progressive en cas de douleur sciatique : soulagement, mobilité neurale et renforcement du tronc.'),
  ('Fasciite plantaire', 'Programme progressif pour soulager la voûte plantaire et renforcer les muscles du pied.'),
  ('Syndrome du canal carpien', 'Rééducation du poignet et de la main en cas de compression du nerf médian.'),
  ('Capsulite de l''épaule', 'Récupération progressive de la mobilité et de la force de l''épaule en cas de capsulite rétractile.'),
  ('Tendinopathie d''Achille', 'Renforcement progressif du mollet et du tendon d''Achille, mobilité et retour à la course.'),
  ('Arthrose du genou', 'Programme d''entretien et de renforcement du genou en cas d''arthrose (gonarthrose).'),
  ('Arthrose de la hanche', 'Programme d''entretien et de renforcement de la hanche en cas d''arthrose (coxarthrose).'),
  ('Syndrome de la bandelette ilio-tibiale', 'Rééducation pour coureurs : soulagement, renforcement de la hanche et retour progressif à la course.'),
  ('Torticolis', 'Programme de soulagement et de mobilité en cas de raideur cervicale aiguë.')
) as v(name, descr)
where not exists (select 1 from public.conditions c where c.name = v.name and c.created_by is null);

-- ---------------------------------------------------------------------------
-- 3. Stage-tagged workouts for the new conditions (idempotent)
-- ---------------------------------------------------------------------------
insert into public.workouts (condition_id, name, description, duration_minutes, times_per_week, stage, created_by)
select c.id, v.wname, v.descr, v.dur, v.tpw, v.stage, null
from public.conditions c
join (values
  ('Tendinopathie du coude',              'Phase 1 — Protection (jours 0-7)',      'Soulagement et mobilité très douce du coude et du poignet.',       8, 7, 'acute'),
  ('Tendinopathie du coude',              'Phase 2 — Mobilité (semaines 1-2)',     'Étirements et premiers exercices de préhension.',                 10, 6, 'subacute'),
  ('Tendinopathie du coude',              'Phase 3 — Renforcement (semaines 2-4)', 'Renforcement excentrique du poignet et de l''avant-bras.',        12, 4, 'recovery'),
  ('Tendinopathie du coude',              'Phase 4 — Reprise (semaines 4+)',       'Retour progressif au geste sportif ou professionnel.',            12, 3, 'return_to_sport'),

  ('Sciatique',                           'Phase 1 — Soulagement (jours 0-7)',     'Positions antalgiques et mobilité très douce du bassin.',          8, 7, 'acute'),
  ('Sciatique',                           'Phase 2 — Mobilité (semaines 1-2)',     'Glissements neuraux et mobilité lombaire douce.',                 10, 6, 'subacute'),
  ('Sciatique',                           'Phase 3 — Renforcement (semaines 2-4)', 'Renforcement du tronc et des fessiers.',                          15, 4, 'recovery'),
  ('Sciatique',                           'Phase 4 — Reprise (semaines 4+)',       'Renforcement fonctionnel et retour aux activités.',               18, 3, 'return_to_sport'),

  ('Fasciite plantaire',                  'Phase 1 — Soulagement (jours 0-7)',     'Auto-massage et mobilité douce du pied.',                          8, 7, 'acute'),
  ('Fasciite plantaire',                  'Phase 2 — Mobilité (semaines 1-2)',     'Étirements du fascia plantaire et du mollet.',                    10, 6, 'subacute'),
  ('Fasciite plantaire',                  'Phase 3 — Renforcement (semaines 2-4)', 'Renforcement des muscles intrinsèques du pied.',                  12, 4, 'recovery'),
  ('Fasciite plantaire',                  'Phase 4 — Reprise (semaines 4+)',       'Retour progressif à la marche et à la course.',                   15, 3, 'return_to_sport'),

  ('Syndrome du canal carpien',           'Phase 1 — Protection (jours 0-7)',      'Positionnement et mobilité douce du poignet.',                     6, 7, 'acute'),
  ('Syndrome du canal carpien',           'Phase 2 — Mobilité (semaines 1-2)',     'Étirements et glissements neuraux.',                               8, 6, 'subacute'),
  ('Syndrome du canal carpien',           'Phase 3 — Renforcement (semaines 2-4)', 'Renforcement progressif de la préhension.',                       10, 4, 'recovery'),
  ('Syndrome du canal carpien',           'Phase 4 — Reprise (semaines 4+)',       'Retour progressif au geste répétitif.',                           10, 3, 'return_to_sport'),

  ('Capsulite de l''épaule',              'Phase 1 — Protection (jours 0-7)',      'Mobilité passive très douce de l''épaule.',                        8, 7, 'acute'),
  ('Capsulite de l''épaule',              'Phase 2 — Mobilité (semaines 1-2)',     'Mobilité active-aidée et étirements progressifs.',                10, 6, 'subacute'),
  ('Capsulite de l''épaule',              'Phase 3 — Renforcement (semaines 2-4)', 'Renforcement de la coiffe des rotateurs et de l''omoplate.',      15, 4, 'recovery'),
  ('Capsulite de l''épaule',              'Phase 4 — Reprise (semaines 4+)',       'Mouvements fonctionnels et retour aux activités.',                15, 3, 'return_to_sport'),

  ('Tendinopathie d''Achille',            'Phase 1 — Protection (jours 0-7)',      'Soulagement et mobilité douce de la cheville.',                    8, 7, 'acute'),
  ('Tendinopathie d''Achille',            'Phase 2 — Mobilité (semaines 1-2)',     'Étirements du mollet et premiers renforcements.',                 10, 6, 'subacute'),
  ('Tendinopathie d''Achille',            'Phase 3 — Renforcement (semaines 2-4)', 'Renforcement excentrique du mollet.',                             15, 4, 'recovery'),
  ('Tendinopathie d''Achille',            'Phase 4 — Reprise (semaines 4+)',       'Retour progressif à la course.',                                  15, 3, 'return_to_sport'),

  ('Arthrose du genou',                   'Phase 1 — Soulagement (jours 0-7)',     'Mobilité douce et activation du quadriceps sans douleur.',         8, 7, 'acute'),
  ('Arthrose du genou',                   'Phase 2 — Mobilité (semaines 1-2)',     'Mobilité fonctionnelle et premiers renforcements légers.',       10, 6, 'subacute'),
  ('Arthrose du genou',                   'Phase 3 — Renforcement (semaines 2-4)', 'Renforcement du quadriceps et de la hanche.',                     15, 4, 'recovery'),
  ('Arthrose du genou',                   'Phase 4 — Reprise (semaines 4+)',       'Renforcement fonctionnel et activités quotidiennes.',             18, 3, 'return_to_sport'),

  ('Arthrose de la hanche',               'Phase 1 — Soulagement (jours 0-7)',     'Mobilité douce et activation des fessiers.',                       8, 7, 'acute'),
  ('Arthrose de la hanche',               'Phase 2 — Mobilité (semaines 1-2)',     'Mobilité fonctionnelle et renforcement léger.',                  10, 6, 'subacute'),
  ('Arthrose de la hanche',               'Phase 3 — Renforcement (semaines 2-4)', 'Renforcement des fessiers et des abducteurs.',                    15, 4, 'recovery'),
  ('Arthrose de la hanche',               'Phase 4 — Reprise (semaines 4+)',       'Renforcement fonctionnel et activités quotidiennes.',             18, 3, 'return_to_sport'),

  ('Syndrome de la bandelette ilio-tibiale', 'Phase 1 — Soulagement (jours 0-7)',  'Repos actif et auto-massage.',                                     8, 7, 'acute'),
  ('Syndrome de la bandelette ilio-tibiale', 'Phase 2 — Mobilité (semaines 1-2)',  'Étirements et renforcement léger de la hanche.',                 10, 6, 'subacute'),
  ('Syndrome de la bandelette ilio-tibiale', 'Phase 3 — Renforcement (semaines 2-4)', 'Renforcement des abducteurs et contrôle du genou.',           15, 4, 'recovery'),
  ('Syndrome de la bandelette ilio-tibiale', 'Phase 4 — Reprise (semaines 4+)',    'Retour progressif à la course.',                                 18, 3, 'return_to_sport'),

  ('Torticolis',                          'Phase 1 — Soulagement (jours 0-7)',     'Relâchement et mobilité cervicale très douce.',                    6, 7, 'acute'),
  ('Torticolis',                          'Phase 2 — Mobilité (semaines 1-2)',     'Mobilité active complète et auto-massage.',                        8, 6, 'subacute'),
  ('Torticolis',                          'Phase 3 — Renforcement (semaines 2-4)', 'Renforcement isométrique et postural du cou.',                    10, 4, 'recovery'),
  ('Torticolis',                          'Phase 4 — Reprise (semaines 4+)',       'Retour aux activités habituelles.',                               10, 3, 'return_to_sport')
) as v(cname, wname, descr, dur, tpw, stage)
  on v.cname = c.name and c.created_by is null
where not exists (
  select 1 from public.workouts w where w.condition_id = c.id and w.name = v.wname
);

-- ---------------------------------------------------------------------------
-- 4. Exercises inside each new workout (idempotent)
-- ---------------------------------------------------------------------------
insert into public.workout_exercises (workout_id, exercise_id, position)
select w.id, e.id, v.pos
from public.workouts w
join public.conditions c on c.id = w.condition_id and c.created_by is null
join (values
  -- Coude
  ('Tendinopathie du coude', 'Phase 1 — Protection (jours 0-7)', 'Flexion-extension douce du poignet, coude tendu', 0),
  ('Tendinopathie du coude', 'Phase 1 — Protection (jours 0-7)', 'Étirement doux des extenseurs, coude tendu', 1),
  ('Tendinopathie du coude', 'Phase 1 — Protection (jours 0-7)', 'Auto-massage transversal léger de l''avant-bras', 2),
  ('Tendinopathie du coude', 'Phase 2 — Mobilité (semaines 1-2)', 'Étirement prolongé des extenseurs du poignet', 0),
  ('Tendinopathie du coude', 'Phase 2 — Mobilité (semaines 1-2)', 'Pronosupination sans charge', 1),
  ('Tendinopathie du coude', 'Phase 2 — Mobilité (semaines 1-2)', 'Serrage de balle souple (coude)', 2),
  ('Tendinopathie du coude', 'Phase 3 — Renforcement (semaines 2-4)', 'Renforcement excentrique des extenseurs du poignet', 0),
  ('Tendinopathie du coude', 'Phase 3 — Renforcement (semaines 2-4)', 'Renforcement excentrique des fléchisseurs du poignet', 1),
  ('Tendinopathie du coude', 'Phase 3 — Renforcement (semaines 2-4)', 'Pronosupination avec léger poids', 2),
  ('Tendinopathie du coude', 'Phase 4 — Reprise (semaines 4+)', 'Préhension progressive avec charge légère', 0),
  ('Tendinopathie du coude', 'Phase 4 — Reprise (semaines 4+)', 'Simulation du geste habituel à faible intensité', 1),
  ('Tendinopathie du coude', 'Phase 4 — Reprise (semaines 4+)', 'Renforcement combiné poignet-coude', 2),

  -- Sciatique
  ('Sciatique', 'Phase 1 — Soulagement (jours 0-7)', 'Position antalgique, genoux surélevés', 0),
  ('Sciatique', 'Phase 1 — Soulagement (jours 0-7)', 'Bascule du bassin en douceur (sciatique)', 1),
  ('Sciatique', 'Phase 1 — Soulagement (jours 0-7)', 'Respiration abdominale profonde', 2),
  ('Sciatique', 'Phase 2 — Mobilité (semaines 1-2)', 'Étirement du piriforme, allongé', 0),
  ('Sciatique', 'Phase 2 — Mobilité (semaines 1-2)', 'Glissement neural du nerf sciatique, léger', 1),
  ('Sciatique', 'Phase 2 — Mobilité (semaines 1-2)', 'Extension lombaire debout', 2),
  ('Sciatique', 'Phase 3 — Renforcement (semaines 2-4)', 'Gainage abdominal léger (sciatique)', 0),
  ('Sciatique', 'Phase 3 — Renforcement (semaines 2-4)', 'Pont fessier progressif', 1),
  ('Sciatique', 'Phase 3 — Renforcement (semaines 2-4)', 'Étirement des ischio-jambiers assis (sciatique)', 2),
  ('Sciatique', 'Phase 4 — Reprise (semaines 4+)', 'Squat fonctionnel léger', 0),
  ('Sciatique', 'Phase 4 — Reprise (semaines 4+)', 'Marche rapide progressive', 1),
  ('Sciatique', 'Phase 4 — Reprise (semaines 4+)', 'Gainage dynamique (sciatique)', 2),

  -- Fasciite plantaire
  ('Fasciite plantaire', 'Phase 1 — Soulagement (jours 0-7)', 'Auto-massage de la voûte plantaire', 0),
  ('Fasciite plantaire', 'Phase 1 — Soulagement (jours 0-7)', 'Étirement du mollet genou tendu (pied)', 1),
  ('Fasciite plantaire', 'Phase 1 — Soulagement (jours 0-7)', 'Flexion-extension active des orteils', 2),
  ('Fasciite plantaire', 'Phase 2 — Mobilité (semaines 1-2)', 'Étirement du fascia plantaire, orteils en extension', 0),
  ('Fasciite plantaire', 'Phase 2 — Mobilité (semaines 1-2)', 'Étirement du mollet contre un mur (fascia)', 1),
  ('Fasciite plantaire', 'Phase 2 — Mobilité (semaines 1-2)', 'Renforcement des intrinsèques du pied (serviette)', 2),
  ('Fasciite plantaire', 'Phase 3 — Renforcement (semaines 2-4)', 'Montée sur pointe des pieds bilatérale (fascia)', 0),
  ('Fasciite plantaire', 'Phase 3 — Renforcement (semaines 2-4)', 'Montée sur pointe des pieds unilatérale', 1),
  ('Fasciite plantaire', 'Phase 3 — Renforcement (semaines 2-4)', 'Équilibre sur surface instable', 2),
  ('Fasciite plantaire', 'Phase 4 — Reprise (semaines 4+)', 'Marche sur terrain varié', 0),
  ('Fasciite plantaire', 'Phase 4 — Reprise (semaines 4+)', 'Course légère progressive (fascia)', 1),
  ('Fasciite plantaire', 'Phase 4 — Reprise (semaines 4+)', 'Sauts contrôlés à faible impact', 2),

  -- Canal carpien
  ('Syndrome du canal carpien', 'Phase 1 — Protection (jours 0-7)', 'Glissement neural du nerf médian, position douce', 0),
  ('Syndrome du canal carpien', 'Phase 1 — Protection (jours 0-7)', 'Mobilité active du poignet, amplitude confortable', 1),
  ('Syndrome du canal carpien', 'Phase 1 — Protection (jours 0-7)', 'Positionnement neutre du poignet au repos', 2),
  ('Syndrome du canal carpien', 'Phase 2 — Mobilité (semaines 1-2)', 'Étirement des fléchisseurs du poignet (canal carpien)', 0),
  ('Syndrome du canal carpien', 'Phase 2 — Mobilité (semaines 1-2)', 'Étirement des extenseurs du poignet (canal carpien)', 1),
  ('Syndrome du canal carpien', 'Phase 2 — Mobilité (semaines 1-2)', 'Ouverture-fermeture de la main, résistance légère', 2),
  ('Syndrome du canal carpien', 'Phase 3 — Renforcement (semaines 2-4)', 'Renforcement de la préhension, balle souple', 0),
  ('Syndrome du canal carpien', 'Phase 3 — Renforcement (semaines 2-4)', 'Renforcement des extenseurs du poignet à l''élastique', 1),
  ('Syndrome du canal carpien', 'Phase 3 — Renforcement (semaines 2-4)', 'Pince fine progressive', 2),
  ('Syndrome du canal carpien', 'Phase 4 — Reprise (semaines 4+)', 'Reprise du geste répétitif à faible cadence', 0),
  ('Syndrome du canal carpien', 'Phase 4 — Reprise (semaines 4+)', 'Renforcement combiné poignet-avant-bras', 1),
  ('Syndrome du canal carpien', 'Phase 4 — Reprise (semaines 4+)', 'Endurance de préhension prolongée', 2),

  -- Capsulite
  ('Capsulite de l''épaule', 'Phase 1 — Protection (jours 0-7)', 'Pendulaire de Codman (capsulite)', 0),
  ('Capsulite de l''épaule', 'Phase 1 — Protection (jours 0-7)', 'Mobilité passive assistée en élévation (capsulite)', 1),
  ('Capsulite de l''épaule', 'Phase 1 — Protection (jours 0-7)', 'Mobilité passive assistée en rotation externe', 2),
  ('Capsulite de l''épaule', 'Phase 2 — Mobilité (semaines 1-2)', 'Étirement en rotation externe à la porte', 0),
  ('Capsulite de l''épaule', 'Phase 2 — Mobilité (semaines 1-2)', 'Mobilité active-aidée avec bâton', 1),
  ('Capsulite de l''épaule', 'Phase 2 — Mobilité (semaines 1-2)', 'Étirement en élévation, mains jointes', 2),
  ('Capsulite de l''épaule', 'Phase 3 — Renforcement (semaines 2-4)', 'Renforcement de la coiffe des rotateurs à l''élastique (capsulite)', 0),
  ('Capsulite de l''épaule', 'Phase 3 — Renforcement (semaines 2-4)', 'Renforcement des stabilisateurs de l''omoplate', 1),
  ('Capsulite de l''épaule', 'Phase 3 — Renforcement (semaines 2-4)', 'Mobilité active complète progressive', 2),
  ('Capsulite de l''épaule', 'Phase 4 — Reprise (semaines 4+)', 'Mouvements fonctionnels au-dessus de la tête', 0),
  ('Capsulite de l''épaule', 'Phase 4 — Reprise (semaines 4+)', 'Renforcement global de l''épaule, charge légère', 1),
  ('Capsulite de l''épaule', 'Phase 4 — Reprise (semaines 4+)', 'Retour aux activités habituelles (épaule)', 2),

  -- Achille
  ('Tendinopathie d''Achille', 'Phase 1 — Protection (jours 0-7)', 'Isométrie du mollet contre résistance', 0),
  ('Tendinopathie d''Achille', 'Phase 1 — Protection (jours 0-7)', 'Mobilité active de la cheville (achille)', 1),
  ('Tendinopathie d''Achille', 'Phase 1 — Protection (jours 0-7)', 'Auto-massage léger du mollet', 2),
  ('Tendinopathie d''Achille', 'Phase 2 — Mobilité (semaines 1-2)', 'Étirement du mollet genou tendu (achille)', 0),
  ('Tendinopathie d''Achille', 'Phase 2 — Mobilité (semaines 1-2)', 'Étirement du mollet genou fléchi (soléaire)', 1),
  ('Tendinopathie d''Achille', 'Phase 2 — Mobilité (semaines 1-2)', 'Montée sur pointe des pieds bilatérale lente', 2),
  ('Tendinopathie d''Achille', 'Phase 3 — Renforcement (semaines 2-4)', 'Renforcement excentrique du mollet, genou tendu', 0),
  ('Tendinopathie d''Achille', 'Phase 3 — Renforcement (semaines 2-4)', 'Renforcement excentrique du mollet, genou fléchi', 1),
  ('Tendinopathie d''Achille', 'Phase 3 — Renforcement (semaines 2-4)', 'Montée sur pointe des pieds unilatérale (achille)', 2),
  ('Tendinopathie d''Achille', 'Phase 4 — Reprise (semaines 4+)', 'Sauts à la corde légers', 0),
  ('Tendinopathie d''Achille', 'Phase 4 — Reprise (semaines 4+)', 'Course progressive (achille)', 1),
  ('Tendinopathie d''Achille', 'Phase 4 — Reprise (semaines 4+)', 'Changements de direction contrôlés (achille)', 2),

  -- Genou arthrose
  ('Arthrose du genou', 'Phase 1 — Soulagement (jours 0-7)', 'Mobilité active du genou sans charge', 0),
  ('Arthrose du genou', 'Phase 1 — Soulagement (jours 0-7)', 'Contraction isométrique du quadriceps (arthrose)', 1),
  ('Arthrose du genou', 'Phase 1 — Soulagement (jours 0-7)', 'Élévation de jambe tendue', 2),
  ('Arthrose du genou', 'Phase 2 — Mobilité (semaines 1-2)', 'Vélo stationnaire sans résistance', 0),
  ('Arthrose du genou', 'Phase 2 — Mobilité (semaines 1-2)', 'Renforcement du quadriceps en chaîne fermée légère', 1),
  ('Arthrose du genou', 'Phase 2 — Mobilité (semaines 1-2)', 'Étirement des ischio-jambiers (genou arthrose)', 2),
  ('Arthrose du genou', 'Phase 3 — Renforcement (semaines 2-4)', 'Mini-squats contrôlés (arthrose genou)', 0),
  ('Arthrose du genou', 'Phase 3 — Renforcement (semaines 2-4)', 'Montée de marche contrôlée (genou arthrose)', 1),
  ('Arthrose du genou', 'Phase 3 — Renforcement (semaines 2-4)', 'Renforcement des abducteurs de hanche (genou)', 2),
  ('Arthrose du genou', 'Phase 4 — Reprise (semaines 4+)', 'Marche prolongée (genou arthrose)', 0),
  ('Arthrose du genou', 'Phase 4 — Reprise (semaines 4+)', 'Squat fonctionnel (genou arthrose)', 1),
  ('Arthrose du genou', 'Phase 4 — Reprise (semaines 4+)', 'Équilibre unipodal dynamique', 2),

  -- Hanche arthrose
  ('Arthrose de la hanche', 'Phase 1 — Soulagement (jours 0-7)', 'Mobilité active de la hanche en flexion', 0),
  ('Arthrose de la hanche', 'Phase 1 — Soulagement (jours 0-7)', 'Contraction isométrique des fessiers (coxarthrose)', 1),
  ('Arthrose de la hanche', 'Phase 1 — Soulagement (jours 0-7)', 'Marche courte avec aide si besoin', 2),
  ('Arthrose de la hanche', 'Phase 2 — Mobilité (semaines 1-2)', 'Mobilité active en abduction', 0),
  ('Arthrose de la hanche', 'Phase 2 — Mobilité (semaines 1-2)', 'Renforcement léger des abducteurs, allongé', 1),
  ('Arthrose de la hanche', 'Phase 2 — Mobilité (semaines 1-2)', 'Étirement doux des fléchisseurs de hanche', 2),
  ('Arthrose de la hanche', 'Phase 3 — Renforcement (semaines 2-4)', 'Pont fessier (coxarthrose)', 0),
  ('Arthrose de la hanche', 'Phase 3 — Renforcement (semaines 2-4)', 'Squat partiel avec appui', 1),
  ('Arthrose de la hanche', 'Phase 3 — Renforcement (semaines 2-4)', 'Renforcement des abducteurs debout à l''élastique', 2),
  ('Arthrose de la hanche', 'Phase 4 — Reprise (semaines 4+)', 'Marche prolongée sans aide (hanche)', 0),
  ('Arthrose de la hanche', 'Phase 4 — Reprise (semaines 4+)', 'Montée d''escaliers contrôlée', 1),
  ('Arthrose de la hanche', 'Phase 4 — Reprise (semaines 4+)', 'Squat fonctionnel complet (hanche)', 2),

  -- Bandelette ilio-tibiale
  ('Syndrome de la bandelette ilio-tibiale', 'Phase 1 — Soulagement (jours 0-7)', 'Mobilité de hanche douce (bandelette)', 0),
  ('Syndrome de la bandelette ilio-tibiale', 'Phase 1 — Soulagement (jours 0-7)', 'Auto-massage de la face externe de la cuisse', 1),
  ('Syndrome de la bandelette ilio-tibiale', 'Phase 1 — Soulagement (jours 0-7)', 'Étirement doux de la bandelette ilio-tibiale', 2),
  ('Syndrome de la bandelette ilio-tibiale', 'Phase 2 — Mobilité (semaines 1-2)', 'Renforcement des abducteurs de hanche, allongé (bandelette)', 0),
  ('Syndrome de la bandelette ilio-tibiale', 'Phase 2 — Mobilité (semaines 1-2)', 'Étirement croisé debout', 1),
  ('Syndrome de la bandelette ilio-tibiale', 'Phase 2 — Mobilité (semaines 1-2)', 'Gainage latéral léger', 2),
  ('Syndrome de la bandelette ilio-tibiale', 'Phase 3 — Renforcement (semaines 2-4)', 'Squat sur une jambe avec contrôle du genou', 0),
  ('Syndrome de la bandelette ilio-tibiale', 'Phase 3 — Renforcement (semaines 2-4)', 'Marche latérale avec élastique (bandelette)', 1),
  ('Syndrome de la bandelette ilio-tibiale', 'Phase 3 — Renforcement (semaines 2-4)', 'Fentes latérales contrôlées (bandelette)', 2),
  ('Syndrome de la bandelette ilio-tibiale', 'Phase 4 — Reprise (semaines 4+)', 'Course progressive sur terrain plat', 0),
  ('Syndrome de la bandelette ilio-tibiale', 'Phase 4 — Reprise (semaines 4+)', 'Changements de direction contrôlés (bandelette)', 1),
  ('Syndrome de la bandelette ilio-tibiale', 'Phase 4 — Reprise (semaines 4+)', 'Retour à l''entraînement progressif (bandelette)', 2),

  -- Torticolis
  ('Torticolis', 'Phase 1 — Soulagement (jours 0-7)', 'Respiration et relâchement des trapèzes', 0),
  ('Torticolis', 'Phase 1 — Soulagement (jours 0-7)', 'Mobilité cervicale très douce en rotation', 1),
  ('Torticolis', 'Phase 1 — Soulagement (jours 0-7)', 'Position antalgique de repos (torticolis)', 2),
  ('Torticolis', 'Phase 2 — Mobilité (semaines 1-2)', 'Mobilité cervicale active en flexion-extension', 0),
  ('Torticolis', 'Phase 2 — Mobilité (semaines 1-2)', 'Mobilité cervicale active en inclinaison latérale', 1),
  ('Torticolis', 'Phase 2 — Mobilité (semaines 1-2)', 'Auto-massage doux du cou et des trapèzes', 2),
  ('Torticolis', 'Phase 3 — Renforcement (semaines 2-4)', 'Renforcement isométrique cervical multidirectionnel', 0),
  ('Torticolis', 'Phase 3 — Renforcement (semaines 2-4)', 'Rétraction cervicale, double menton (torticolis)', 1),
  ('Torticolis', 'Phase 3 — Renforcement (semaines 2-4)', 'Renforcement des trapèzes et rhomboïdes', 2),
  ('Torticolis', 'Phase 4 — Reprise (semaines 4+)', 'Mobilité cervicale complète active', 0),
  ('Torticolis', 'Phase 4 — Reprise (semaines 4+)', 'Renforcement fonctionnel du rachis cervical', 1),
  ('Torticolis', 'Phase 4 — Reprise (semaines 4+)', 'Retour aux activités habituelles (cervical)', 2)
) as v(cname, wname, ename, pos)
  on v.cname = c.name and v.wname = w.name
join public.exercises e on e.name = v.ename
where not exists (
  select 1 from public.workout_exercises we where we.workout_id = w.id and we.exercise_id = e.id
);
