-- Physio-App — Migration 0025: top-50 conditions, round-out
-- Run once in Supabase (SQL Editor -> New query -> paste -> Run). Idempotent.
--
-- Goal: cover the 50 most common reasons patients see a physiotherapist for,
-- so there's an exercise + phase structure ready for every condition before
-- video is recorded with the clinical partner. 17 were already covered
-- (0001/0007/0016/0021 — lombalgie, entorse de cheville, cervicalgie,
-- tendinopathies épaule/coude/poignet/Achille, fémoro-patellaire, fessiers,
-- sciatique, fasciite plantaire, canal carpien, capsulite, arthroses
-- genou/hanche, bandelette ilio-tibiale, torticolis). This migration adds the
-- other 33: spine, shoulder, wrist/hand, hip, knee, ankle/foot, common
-- sports strains, and post-operative rehab (joint replacements, ligament/
-- tendon repairs, fractures).
--
-- Same approach as 0007/0016/0021: ORIGINAL wording, standard well-known
-- physiotherapy movements, not copied from any third-party platform.
--
-- CLINICAL NOTE: standard starter progressions, meant to be reviewed and
-- adjusted by the physiotherapist before use with real patients — not fixed
-- medical prescriptions. Post-operative timelines here are conservative
-- generic defaults; real timelines depend on the surgeon's protocol.

-- ---------------------------------------------------------------------------
-- 1. New exercises (idempotent by name)
-- ---------------------------------------------------------------------------
insert into public.exercises (name, instructions)
select v.name, v.instr
from (values
  -- Hernie discale lombaire
  ('Position antalgique en crochet', 'Allongé sur le dos, jambes pliées et pieds au sol, ou jambes surélevées sur une chaise, pour relâcher le bas du dos.'),
  ('Extension lombaire en décubitus (McKenzie doux)', 'Allongé sur le ventre, en appui sur les avant-bras, laissez le bas du dos se détendre sans forcer sur la remontée.'),
  ('Marche courte fractionnée', 'Marchez quelques minutes à allure lente, plusieurs fois par jour, en évitant la position assise prolongée.'),
  ('Gainage abdominal en douceur (hernie)', 'Allongé sur le dos, genoux pliés, contractez légèrement le ventre sans bloquer la respiration, maintenez quelques secondes.'),
  ('Étirement du psoas à genoux', 'Un genou au sol, l''autre pied devant, avancez le bassin doucement pour étirer l''avant de la hanche arrière.'),
  ('Gainage en planche modifiée', 'En appui sur les avant-bras et les genoux, gardez le dos droit et le ventre engagé, maintenez.'),
  ('Renforcement des extenseurs du dos, léger', 'Allongé sur le ventre, soulevez légèrement la poitrine du sol en gardant le regard vers le bas, redescendez lentement.'),
  ('Squat contre un mur', 'Dos contre un mur, descendez légèrement en pliant les genoux, comme pour vous asseoir, puis remontez.'),

  -- Entorse cervicale (coup du lapin)
  ('Mobilité cervicale en amplitude protégée', 'Assis, tournez et inclinez doucement la tête dans une amplitude confortable, sans jamais forcer sur la douleur.'),
  ('Isométrique cervical multidirectionnel léger', 'Main sur le côté de la tête, poussez légèrement la tête contre la main sans bouger, maintenez quelques secondes, changez de côté.'),
  ('Auto-mobilisation des trapèzes supérieurs', 'Massez doucement le haut des trapèzes avec les doigts, en petits mouvements circulaires.'),
  ('Relâchement des épaules', 'Assis ou debout, montez les épaules vers les oreilles puis relâchez-les complètement. Répétez lentement.'),

  -- Dorsalgie (douleurs du milieu du dos)
  ('Extension thoracique sur chaise', 'Assis, mains derrière la tête, cambrez doucement le haut du dos par-dessus le dossier de la chaise.'),
  ('Rotation du tronc assise', 'Assis, bras croisés sur la poitrine, tournez doucement le buste d''un côté puis de l''autre.'),
  ('Étirement des pectoraux à la porte (dorsalgie)', 'Avant-bras contre le cadre d''une porte, avancez doucement le corps pour ouvrir la poitrine.'),
  ('Renforcement des rhomboïdes', 'Coudes pliés au corps, tirez les coudes vers l''arrière en rapprochant les omoplates, maintenez, relâchez.'),

  -- Sténose spinale lombaire
  ('Flexion lombaire assise, soulagement', 'Assis, penchez doucement le buste vers l''avant, mains sur les genoux, jusqu''à sentir un soulagement.'),
  ('Vélo stationnaire assis (sténose)', 'Pédalez à allure douce sur un vélo d''appartement, buste légèrement penché en avant si cela soulage.'),
  ('Bascule du bassin en position assise', 'Assis, basculez doucement le bassin d''avant en arrière en gardant le dos souple.'),
  ('Marche en position penchée, courte durée', 'Marchez quelques minutes en gardant un léger appui en avant (caddie, canne) si cela soulage la marche.'),

  -- Conflit sous-acromial de l'épaule
  ('Mobilité pendulaire de l''épaule', 'Penché en avant, appui sur une main, laissez le bras pendre et le balancer doucement en petits cercles.'),
  ('Rotation externe basse résistance', 'Coude au corps plié à 90°, tournez l''avant-bras vers l''extérieur contre un élastique léger, revenez lentement.'),
  ('Renforcement du serratus antérieur', 'Bras tendus devant vous contre un mur, poussez le mur en arrondissant légèrement le haut du dos.'),
  ('Élévation active limitée', 'Levez le bras devant vous jusqu''à l''horizontale, sans dépasser le seuil de douleur, puis redescendez lentement.'),

  -- Instabilité de l'épaule
  ('Renforcement isométrique de l''épaule, multidirectionnel', 'Coude plié à 90° au corps, poussez l''avant-bras contre un mur ou votre autre main dans chaque direction, maintenez.'),
  ('Stabilité scapulaire en quadrupédie', 'À quatre pattes, gardez les omoplates stables en soulevant légèrement un bras puis l''autre.'),
  ('Renforcement de la coiffe en rotation, élastique', 'Coude au corps, tournez l''avant-bras vers l''extérieur puis l''intérieur contre un élastique léger, mouvement contrôlé.'),
  ('Proprioception de l''épaule sur appui', 'En appui sur les mains contre un mur ou une table stable, transférez doucement le poids d''un bras à l''autre.'),

  -- Réparation de la coiffe des rotateurs (post-opératoire)
  ('Mobilité passive protégée (post-coiffe)', 'À l''aide de votre bras valide ou d''un bâton, aidez le bras opéré à monter doucement, sans jamais forcer.'),
  ('Pendulaire protégé post-opératoire', 'Penché en avant, bras opéré relâché, laissez-le se balancer très doucement en petits cercles, sans contraction active.'),
  ('Mobilité active-aidée précoce (coiffe)', 'Allongé sur le dos, aidez le bras opéré à monter avec l''autre main, dans l''amplitude autorisée par votre chirurgien.'),
  ('Renforcement isométrique doux (post-coiffe)', 'Coude plié au corps, contractez très légèrement contre votre main sans bouger le bras, uniquement si autorisé.'),

  -- Prothèse totale d'épaule (post-opératoire)
  ('Mobilité pendulaire post-prothèse', 'Penché en avant, bras opéré relâché, laissez-le se balancer très doucement, sans forcer.'),
  ('Mobilité passive assistée post-prothèse', 'Allongé sur le dos, à l''aide d''un bâton tenu des deux mains, aidez le bras opéré à monter doucement.'),
  ('Rotation externe passive au bâton', 'Coudes au corps, à l''aide d''un bâton, poussez doucement l''avant-bras opéré vers l''extérieur.'),
  ('Renforcement fonctionnel léger (post-prothèse)', 'Une fois autorisé, exercez de petits mouvements actifs du bras dans les amplitudes sans douleur.'),

  -- Bursite du coude
  ('Repos positionnel du coude', 'Évitez l''appui prolongé sur le coude ; gardez-le dans une position confortable, non fléchie de façon prolongée.'),
  ('Mobilité active du coude, amplitude complète', 'Pliez et tendez doucement le coude sur toute son amplitude, sans appui direct sur la zone enflammée.'),
  ('Renforcement léger du triceps', 'Bras tendu au-dessus de la tête, pliez et tendez le coude avec un poids léger, mouvement contrôlé.'),

  -- Tendinopathie de De Quervain
  ('Repositionnement neutre du pouce', 'Gardez le pouce dans une position neutre au repos, évitez de le maintenir fléchi dans la paume de façon prolongée.'),
  ('Étirement du pouce en flexion (De Quervain)', 'Pouce replié dans la paume, penchez doucement le poignet vers l''extérieur jusqu''à sentir l''étirement.'),
  ('Renforcement progressif du pouce, élastique', 'Un élastique autour du pouce et des doigts, écartez le pouce contre la résistance, puis revenez lentement.'),
  ('Mobilité active du pouce et du poignet', 'Bougez doucement le pouce et le poignet dans toutes les directions, dans une amplitude confortable.'),

  -- Entorse du poignet
  ('Mobilité active du poignet en douceur (entorse)', 'Bougez doucement le poignet en flexion, extension et rotation, dans une amplitude sans douleur.'),
  ('Renforcement de la préhension légère (poignet)', 'Serrez une balle souple dans la main, maintenez quelques secondes, relâchez. Répétez.'),
  ('Renforcement du poignet à l''élastique', 'Avant-bras posé, main hors du bord, bougez le poignet contre un élastique léger dans chaque direction.'),
  ('Appui progressif sur la main', 'En position à quatre pattes, prenez progressivement appui sur la main du poignet atteint, poids toléré.'),

  -- Fracture du poignet (post-opératoire)
  ('Mobilité active des doigts (post-fracture poignet)', 'Une fois le plâtre/l''attelle retiré ou autorisé, ouvrez et fermez doucement les doigts et la main.'),
  ('Mobilité active protégée du poignet', 'Bougez très doucement le poignet dans l''amplitude autorisée par votre chirurgien, sans forcer.'),
  ('Désœdématisation par élévation', 'Gardez la main surélevée au-dessus du niveau du cœur et ouvrez-fermez la main pour réduire le gonflement.'),
  ('Renforcement progressif post-immobilisation', 'Une fois autorisé, serrez une balle souple puis progressez vers un élastique léger autour du poignet.'),

  -- Rhizarthrose (arthrose de la base du pouce)
  ('Mobilité douce de la base du pouce', 'Bougez doucement le pouce en cercles et en écartement, dans une amplitude confortable.'),
  ('Renforcement de la pince pouce-index', 'Pincez doucement une balle souple entre le pouce et l''index, maintenez, relâchez.'),
  ('Ergonomie de préhension', 'Privilégiez une prise large (poignée épaisse) plutôt qu''une pince fine pour les gestes du quotidien.'),

  -- Conflit fémoro-acétabulaire
  ('Mobilité de hanche en amplitude confortable', 'Allongé sur le dos, ramenez doucement le genou vers la poitrine, sans dépasser le seuil de gêne à l''aine.'),
  ('Renforcement du moyen fessier, coquille', 'Allongé sur le côté, genoux pliés et pieds joints, ouvrez le genou du dessus comme une coquille, puis refermez.'),
  ('Gainage du tronc en pont', 'Allongé sur le dos, genoux pliés, soulevez le bassin en gardant le tronc stable, redescendez lentement.'),
  ('Squat en amplitude limitée (hanche)', 'Descendez en squat uniquement jusqu''à l''amplitude confortable pour la hanche, sans douleur à l''aine.'),

  -- Prothèse totale de hanche (post-opératoire)
  ('Pompes de cheville (post-prothèse hanche)', 'Allongé, montez et descendez la pointe des pieds pour relancer la circulation, dès le lendemain de l''opération.'),
  ('Contraction du quadriceps, isométrique', 'Allongé, jambe tendue, contractez le dessus de la cuisse en poussant le genou vers le lit, maintenez, relâchez.'),
  ('Abduction de hanche allongée (post-prothèse)', 'Allongé sur le dos, jambe tendue, glissez-la doucement sur le côté puis ramenez-la, sans croiser la ligne médiane.'),
  ('Marche assistée progressive', 'Marchez avec l''aide technique prescrite (déambulateur, cannes), en augmentant progressivement la distance.'),
  ('Mise en charge progressive sur la jambe opérée', 'En appui sur une surface stable, transférez progressivement plus de poids sur la jambe opérée, selon l''autorisation du chirurgien.'),

  -- Pubalgie
  ('Gainage des adducteurs, ballon', 'Allongé sur le dos, genoux pliés, un ballon souple entre les genoux, pressez doucement puis relâchez.'),
  ('Étirement des adducteurs assis', 'Assis, plantes de pieds jointes, laissez doucement les genoux s''ouvrir vers le sol jusqu''à l''étirement.'),
  ('Gainage abdominal anti-rotation', 'À genoux ou debout, tenez un élastique tendu devant vous sans laisser le tronc tourner, maintenez.'),
  ('Renforcement excentrique des adducteurs', 'Debout, jambe tendue, ramenez-la lentement vers l''intérieur contre une résistance légère, en contrôlant le retour.'),

  -- Rupture du ligament croisé antérieur (LCA)
  ('Contraction du quadriceps, isométrique (LCA)', 'Jambe tendue, contractez le dessus de la cuisse en poussant le genou vers le sol, maintenez, relâchez.'),
  ('Mobilité active du genou, amplitude protégée', 'Assis, pliez et tendez doucement le genou dans l''amplitude autorisée, sans forcer.'),
  ('Renforcement des ischio-jambiers, pont sur talons', 'Allongé sur le dos, talons au sol genoux pliés, soulevez le bassin en appuyant sur les talons.'),
  ('Équilibre bipodal puis unipodal progressif', 'Tenez-vous en équilibre sur les deux jambes puis, quand autorisé, sur la jambe opérée, appui stable.'),
  ('Squat protégé sur amplitude réduite (LCA)', 'Descendez légèrement en squat, amplitude limitée, dos droit, genoux alignés avec les pieds.'),

  -- Méniscopathie (lésion du ménisque)
  ('Mobilité active du genou sans charge', 'Assis ou allongé, pliez et tendez doucement le genou, jambe non porteuse, dans une amplitude confortable.'),
  ('Renforcement du quadriceps à faible amplitude', 'Assis, jambe tendue, soulevez légèrement la jambe et maintenez, redescendez lentement.'),
  ('Vélo stationnaire, faible résistance (ménisque)', 'Pédalez à faible résistance, sans douleur, pour entretenir la mobilité du genou.'),
  ('Renforcement des fessiers, pont fessier (ménisque)', 'Allongé sur le dos, genoux pliés, soulevez le bassin en contractant les fessiers, redescendez lentement.'),

  -- Tendinopathie rotulienne
  ('Renforcement isométrique du quadriceps, chaise', 'Dos contre un mur, genoux pliés à environ 60°, maintenez la position quelques secondes, comme assis sans chaise.'),
  ('Renforcement excentrique du quadriceps, plan incliné', 'Sur une légère pente ou une planche inclinée, descendez lentement en squat sur une jambe, puis remontez à deux jambes.'),
  ('Étirement du quadriceps debout', 'Debout, ramenez le talon vers la fesse en tenant la cheville, genoux alignés, maintenez.'),
  ('Montée sur step contrôlée', 'Montez sur une marche basse en contrôlant la descente lente de l''autre jambe.'),

  -- Prothèse totale de genou (post-opératoire)
  ('Mobilité passive du genou, glissé talon', 'Allongé, glissez doucement le talon vers la fesse en pliant le genou, puis retendez lentement.'),
  ('Contraction du quadriceps, isométrique (post-prothèse)', 'Jambe tendue, contractez le dessus de la cuisse en poussant le genou vers le lit, maintenez, relâchez.'),
  ('Extension active du genou, talon surélevé', 'Assis, talon posé sur un support, laissez le genou se tendre passivement puis activement quelques secondes.'),
  ('Marche assistée progressive (post-prothèse genou)', 'Marchez avec l''aide technique prescrite, en augmentant progressivement la distance et la mise en charge.'),
  ('Montée de marche assistée', 'Montez une marche basse en prenant appui sur une rampe, jambe opérée en tête, à faible cadence.'),

  -- Entorse du ligament collatéral médial (genou)
  ('Renforcement du quadriceps, chaîne fermée légère', 'Debout, appui sur les deux jambes, descendez légèrement en squat, amplitude confortable, sans douleur interne au genou.'),
  ('Renforcement des adducteurs, léger (genou)', 'Allongé sur le côté, jambe du dessous légèrement soulevée puis reposée, mouvement contrôlé.'),
  ('Équilibre unipodal progressif (genou)', 'Tenez-vous en équilibre sur la jambe atteinte, appui stable, quelques secondes, en progressant.'),

  -- Rupture du tendon d'Achille (post-opératoire)
  ('Pompes de cheville en amplitude protégée', 'Assis, bougez doucement la cheville de haut en bas dans l''amplitude autorisée, sans forcer sur la flexion dorsale.'),
  ('Mise en charge progressive du mollet', 'Une fois autorisé, prenez progressivement appui sur la pointe du pied opéré, poids toléré.'),
  ('Renforcement isométrique du mollet, léger', 'Assis, poussez doucement la pointe du pied contre une résistance légère (main ou élastique), maintenez.'),
  ('Montée sur pointes assistée (post-Achille)', 'En appui sur un support stable, montez lentement sur la pointe des pieds à deux jambes, redescendez.'),

  -- Fracture de la cheville (post-opératoire)
  ('Mobilité active de la cheville, amplitude protégée', 'Assis, bougez doucement la cheville dans toutes les directions, dans l''amplitude autorisée par votre chirurgien.'),
  ('Contraction musculaire sans mouvement (cheville)', 'Poussez doucement le pied contre une résistance légère sans bouger la cheville, maintenez, relâchez.'),
  ('Mise en charge progressive (post-fracture cheville)', 'Selon l''autorisation médicale, transférez progressivement du poids sur la jambe opérée, appui stable.'),
  ('Renforcement proprioceptif assis (cheville)', 'Assis, dessinez lentement l''alphabet avec la pointe du pied pour mobiliser la cheville en douceur.'),

  -- Instabilité chronique de cheville
  ('Renforcement des péroniers, élastique', 'Un élastique autour du pied, poussez le pied vers l''extérieur contre la résistance, revenez lentement.'),
  ('Équilibre unipodal yeux ouverts puis fermés', 'Tenez-vous en équilibre sur la jambe instable, d''abord yeux ouverts puis, si maîtrisé, yeux fermés.'),
  ('Renforcement proprioceptif sur coussin', 'Debout sur un coussin ou une surface instable, gardez l''équilibre sur les deux jambes puis une seule.'),
  ('Sauts contrôlés multidirectionnels (cheville)', 'Effectuez de petits sauts vers l''avant, l''arrière et les côtés, réception souple et contrôlée.'),

  -- Élongation des ischio-jambiers
  ('Étirement doux des ischio-jambiers, position allongée', 'Allongé sur le dos, jambe tendue vers le plafond soutenue par les mains ou une bande, sans douleur.'),
  ('Renforcement isométrique des ischio-jambiers', 'Allongé sur le ventre, genou plié à 90°, poussez doucement le talon vers le plafond sans bouger, maintenez.'),
  ('Pont fessier unipodal progressif', 'Allongé sur le dos, une jambe tendue, l''autre pliée, soulevez le bassin en appuyant sur le talon au sol.'),
  ('Marche puis course progressive (ischio-jambiers)', 'Augmentez progressivement l''allure de la marche vers un trottinement léger, sans douleur.'),

  -- Élongation du mollet
  ('Étirement doux du mollet, genou tendu', 'Face à un mur, jambe en arrière tendue, talon au sol, penchez-vous doucement vers le mur.'),
  ('Étirement du mollet, genou plié', 'Face à un mur, jambe en arrière légèrement pliée, talon au sol, penchez-vous doucement vers le mur.'),
  ('Renforcement isométrique du mollet (élongation)', 'Debout, montez légèrement sur la pointe des pieds et maintenez la position quelques secondes.'),
  ('Marche puis trottinement progressif (mollet)', 'Augmentez progressivement l''intensité de la marche vers un trottinement léger, sans douleur au mollet.'),

  -- Déchirure du quadriceps
  ('Contraction isométrique du quadriceps, léger', 'Jambe tendue, contractez doucement le dessus de la cuisse, maintenez quelques secondes, relâchez.'),
  ('Mobilité active du genou sans résistance', 'Assis, pliez et tendez doucement le genou, amplitude confortable, sans forcer.'),
  ('Renforcement progressif du quadriceps, chaise', 'Assis, tendez lentement la jambe jusqu''à l''horizontale, maintenez, redescendez avec contrôle.'),
  ('Squat protégé (quadriceps)', 'Descendez légèrement en squat, amplitude réduite, sans douleur à l''avant de la cuisse.'),

  -- Syndrome du piriforme
  ('Étirement du piriforme assis', 'Assis, croisez une cheville sur le genou opposé, penchez doucement le buste en avant jusqu''à l''étirement de la fesse.'),
  ('Auto-massage de la fesse à la balle', 'Assis sur une balle souple, faites rouler doucement sous la fesse atteinte, pression modérée.'),
  ('Renforcement du moyen fessier, coquille (piriforme)', 'Allongé sur le côté, genoux pliés, ouvrez le genou du dessus comme une coquille, puis refermez.'),

  -- Syndrome du défilé thoracique
  ('Ouverture de la cage thoracique', 'Assis ou debout, mains derrière la tête, ouvrez doucement les coudes vers l''arrière en respirant profondément.'),
  ('Étirement des scalènes', 'Assis, inclinez doucement la tête d''un côté en regardant légèrement vers le plafond, maintenez.'),
  ('Renforcement postural des trapèzes moyens', 'Bras le long du corps, tirez doucement les épaules vers l''arrière et le bas, maintenez.'),
  ('Mobilité neurale du membre supérieur, douce', 'Bras tendu sur le côté, ouvrez doucement les doigts et inclinez la tête du côté opposé, sensation de tension légère seulement.'),

  -- Entorse acromio-claviculaire
  ('Mobilité active protégée de l''épaule (AC)', 'Bougez doucement le bras dans une amplitude confortable, en évitant l''élévation complète au-dessus de la tête au début.'),
  ('Renforcement isométrique de l''épaule, léger (AC)', 'Coude plié au corps, poussez doucement contre votre autre main sans bouger le bras, maintenez.'),
  ('Rétraction scapulaire douce (AC)', 'Serrez doucement les omoplates l''une vers l''autre, épaules basses, maintenez, relâchez.'),

  -- Syndrome croisé supérieur (douleurs posturales)
  ('Étirement des pectoraux à la porte', 'Avant-bras contre le cadre d''une porte, avancez doucement le corps pour ouvrir la poitrine.'),
  ('Renforcement des trapèzes moyens et rhomboïdes', 'Coudes pliés au corps, tirez les coudes vers l''arrière en rapprochant les omoplates, maintenez.'),
  ('Étirement des fléchisseurs du cou', 'Assis, grand dos droit, reculez doucement le menton pour étirer l''arrière du cou, maintenez.'),
  ('Correction posturale au mur', 'Dos contre un mur, talons, fessiers, omoplates et tête en contact, maintenez la position quelques secondes.'),

  -- Reconditionnement physique général (post-alitement / sédentarité)
  ('Marche progressive quotidienne', 'Marchez chaque jour un peu plus longtemps que la veille, à allure confortable, sans essoufflement excessif.'),
  ('Lever de chaise assisté', 'Assis, levez-vous en poussant sur les jambes, aidez-vous des accoudoirs si besoin, puis rasseyez-vous lentement.'),
  ('Renforcement global léger, position assise', 'Assis, alternez extension des genoux et légers mouvements des bras pour réactiver l''ensemble du corps.'),
  ('Équilibre debout assisté', 'Debout, appui léger sur un meuble stable, transférez doucement le poids d''une jambe à l''autre.'),

  -- Périostite tibiale (syndrome de stress tibial médial)
  ('Étirement du mollet et du tibial antérieur', 'Face à un mur, étirez le mollet jambe tendue en arrière, puis étirez l''avant du tibia en pointant les orteils vers le sol derrière vous.'),
  ('Renforcement du tibial antérieur', 'Assis, talon au sol, ramenez la pointe du pied vers vous contre une légère résistance (main ou élastique).'),
  ('Marche avant course progressive (périostite)', 'Reprenez la marche puis un trottinement très progressif, sur terrain souple, en l''absence de douleur.'),
  ('Renforcement des mollets, montées lentes', 'Montez lentement sur la pointe des pieds puis redescendez avec contrôle, à deux jambes.')
) as v(name, instr)
where not exists (select 1 from public.exercises e where e.name = v.name);

-- ---------------------------------------------------------------------------
-- 2. New conditions (idempotent by name, created_by null = platform)
-- ---------------------------------------------------------------------------
insert into public.conditions (name, description)
select v.name, v.descr
from (values
  ('Hernie discale lombaire', 'Programme progressif de soulagement, mobilité contrôlée et renforcement du tronc en cas de hernie discale lombaire.'),
  ('Entorse cervicale', 'Rééducation progressive en cas d''entorse cervicale (coup du lapin) : soulagement, mobilité et renforcement doux du cou.'),
  ('Dorsalgie', 'Programme de mobilité et de renforcement postural pour les douleurs du milieu du dos.'),
  ('Sténose spinale lombaire', 'Programme d''entretien et de soulagement en cas de rétrécissement du canal lombaire.'),
  ('Conflit sous-acromial', 'Rééducation progressive de l''épaule en cas de syndrome du conflit sous-acromial.'),
  ('Instabilité de l''épaule', 'Programme de renforcement et de stabilité pour une épaule instable ou après un épisode de subluxation.'),
  ('Réparation de la coiffe des rotateurs', 'Rééducation post-opératoire progressive après réparation chirurgicale de la coiffe des rotateurs.'),
  ('Prothèse totale d''épaule', 'Rééducation post-opératoire progressive après pose d''une prothèse d''épaule.'),
  ('Bursite du coude', 'Programme de soulagement et de mobilité en cas d''inflammation de la bourse du coude.'),
  ('Tendinopathie de De Quervain', 'Rééducation progressive du pouce et du poignet en cas de tendinopathie de De Quervain.'),
  ('Entorse du poignet', 'Rééducation progressive du poignet après une entorse : mobilité, renforcement et reprise d''appui.'),
  ('Fracture du poignet', 'Rééducation post-opératoire ou post-immobilisation progressive après une fracture du poignet.'),
  ('Rhizarthrose', 'Programme d''entretien et de renforcement en cas d''arthrose de la base du pouce.'),
  ('Conflit fémoro-acétabulaire', 'Rééducation progressive de la hanche en cas de conflit fémoro-acétabulaire.'),
  ('Prothèse totale de hanche', 'Rééducation post-opératoire progressive après pose d''une prothèse de hanche.'),
  ('Pubalgie', 'Programme de rééducation progressive pour les douleurs pubiennes et de l''aine liées au sport.'),
  ('Rupture du ligament croisé antérieur', 'Rééducation post-opératoire progressive après reconstruction du ligament croisé antérieur (LCA).'),
  ('Méniscopathie', 'Rééducation progressive du genou en cas de lésion méniscale, opérée ou non.'),
  ('Tendinopathie rotulienne', 'Programme progressif pour soulager et renforcer le genou en cas de tendinopathie rotulienne.'),
  ('Prothèse totale de genou', 'Rééducation post-opératoire progressive après pose d''une prothèse de genou.'),
  ('Entorse du ligament collatéral médial', 'Rééducation progressive du genou après une entorse du ligament collatéral médial.'),
  ('Rupture du tendon d''Achille', 'Rééducation post-opératoire progressive après rupture et réparation du tendon d''Achille.'),
  ('Fracture de la cheville', 'Rééducation post-opératoire ou post-immobilisation progressive après une fracture de la cheville.'),
  ('Instabilité chronique de cheville', 'Programme de renforcement et de proprioception pour une cheville instable après entorses répétées.'),
  ('Élongation des ischio-jambiers', 'Rééducation progressive après une élongation ou déchirure des ischio-jambiers.'),
  ('Élongation du mollet', 'Rééducation progressive après une élongation ou déchirure du mollet.'),
  ('Déchirure du quadriceps', 'Rééducation progressive après une élongation ou déchirure du quadriceps.'),
  ('Syndrome du piriforme', 'Programme de soulagement et de renforcement en cas de syndrome du piriforme.'),
  ('Syndrome du défilé thoracique', 'Programme de mobilité et de renforcement postural en cas de syndrome du défilé thoracique.'),
  ('Entorse acromio-claviculaire', 'Rééducation progressive de l''épaule après une entorse acromio-claviculaire.'),
  ('Syndrome croisé supérieur', 'Programme de correction posturale pour les douleurs de nuque et d''épaules liées à la posture (travail de bureau).'),
  ('Reconditionnement physique général', 'Programme de reprise progressive de l''activité après une période d''alitement ou de sédentarité prolongée.'),
  ('Périostite tibiale', 'Programme progressif pour soulager et renforcer la jambe en cas de périostite tibiale (syndrome de stress tibial médial).')
) as v(name, descr)
where not exists (select 1 from public.conditions c where c.name = v.name and c.created_by is null);

-- ---------------------------------------------------------------------------
-- 3. Stage-tagged workouts, 4 phases per condition (idempotent)
-- ---------------------------------------------------------------------------
insert into public.workouts (condition_id, name, description, duration_minutes, times_per_week, stage, created_by)
select c.id, v.wname, v.descr, v.dur, v.tpw, v.stage, null
from public.conditions c
join (values
  ('Hernie discale lombaire','Phase 1 — Soulagement (jours 0-7)','Positions de soulagement et mobilité très douce.',8,7,'acute'),
  ('Hernie discale lombaire','Phase 2 — Mobilité (semaines 1-2)','Mobilité contrôlée et marche progressive.',12,6,'subacute'),
  ('Hernie discale lombaire','Phase 3 — Renforcement (semaines 2-4)','Renforcement du tronc en douceur.',18,4,'recovery'),
  ('Hernie discale lombaire','Phase 4 — Reprise (semaines 4+)','Renforcement fonctionnel et retour aux activités.',22,3,'return_to_sport'),

  ('Entorse cervicale','Phase 1 — Soulagement (jours 0-7)','Mobilité protégée et relâchement musculaire.',6,7,'acute'),
  ('Entorse cervicale','Phase 2 — Mobilité (semaines 1-2)','Récupération progressive de la mobilité du cou.',8,6,'subacute'),
  ('Entorse cervicale','Phase 3 — Renforcement (semaines 2-4)','Renforcement isométrique du cou.',10,4,'recovery'),
  ('Entorse cervicale','Phase 4 — Reprise (semaines 4+)','Renforcement postural global.',12,3,'return_to_sport'),

  ('Dorsalgie','Phase 1 — Soulagement (jours 0-7)','Mobilité douce du dos et des épaules.',8,7,'acute'),
  ('Dorsalgie','Phase 2 — Mobilité (semaines 1-2)','Rotation et extension thoracique.',10,6,'subacute'),
  ('Dorsalgie','Phase 3 — Renforcement (semaines 2-4)','Renforcement postural du haut du dos.',14,4,'recovery'),
  ('Dorsalgie','Phase 4 — Reprise (semaines 4+)','Renforcement fonctionnel global.',16,3,'return_to_sport'),

  ('Sténose spinale lombaire','Phase 1 — Soulagement (jours 0-7)','Positions de soulagement en flexion.',8,7,'acute'),
  ('Sténose spinale lombaire','Phase 2 — Mobilité (semaines 1-2)','Vélo doux et marche fractionnée.',12,6,'subacute'),
  ('Sténose spinale lombaire','Phase 3 — Renforcement (semaines 2-4)','Renforcement du tronc en position soulagée.',15,4,'recovery'),
  ('Sténose spinale lombaire','Phase 4 — Reprise (semaines 4+)','Endurance à la marche et activités quotidiennes.',18,3,'return_to_sport'),

  ('Conflit sous-acromial','Phase 1 — Soulagement (jours 0-7)','Mobilité pendulaire et amplitude protégée.',8,7,'acute'),
  ('Conflit sous-acromial','Phase 2 — Mobilité (semaines 1-2)','Renforcement léger de la coiffe.',10,6,'subacute'),
  ('Conflit sous-acromial','Phase 3 — Renforcement (semaines 2-4)','Renforcement de la coiffe et de l''omoplate.',15,4,'recovery'),
  ('Conflit sous-acromial','Phase 4 — Reprise (semaines 4+)','Renforcement fonctionnel et retour au sport.',18,3,'return_to_sport'),

  ('Instabilité de l''épaule','Phase 1 — Soulagement (jours 0-7)','Amplitude protégée et repos relatif.',8,7,'acute'),
  ('Instabilité de l''épaule','Phase 2 — Mobilité (semaines 1-2)','Renforcement isométrique multidirectionnel.',10,6,'subacute'),
  ('Instabilité de l''épaule','Phase 3 — Renforcement (semaines 2-4)','Renforcement de la coiffe et stabilité scapulaire.',15,4,'recovery'),
  ('Instabilité de l''épaule','Phase 4 — Reprise (semaines 4+)','Proprioception et retour au sport.',18,3,'return_to_sport'),

  ('Réparation de la coiffe des rotateurs','Phase 1 — Protection post-opératoire (semaines 0-2)','Mobilité passive protégée uniquement.',8,7,'acute'),
  ('Réparation de la coiffe des rotateurs','Phase 2 — Mobilité protégée (semaines 2-6)','Mobilité active-aidée progressive.',10,6,'subacute'),
  ('Réparation de la coiffe des rotateurs','Phase 3 — Renforcement (semaines 6-12)','Renforcement isométrique puis actif léger.',15,4,'recovery'),
  ('Réparation de la coiffe des rotateurs','Phase 4 — Reprise fonctionnelle (semaines 12+)','Renforcement fonctionnel complet.',18,3,'return_to_sport'),

  ('Prothèse totale d''épaule','Phase 1 — Protection post-opératoire (semaines 0-2)','Mobilité pendulaire et passive uniquement.',8,7,'acute'),
  ('Prothèse totale d''épaule','Phase 2 — Mobilité protégée (semaines 2-6)','Mobilité passive assistée progressive.',10,6,'subacute'),
  ('Prothèse totale d''épaule','Phase 3 — Renforcement (semaines 6-12)','Renforcement fonctionnel léger.',15,4,'recovery'),
  ('Prothèse totale d''épaule','Phase 4 — Reprise fonctionnelle (semaines 12+)','Renforcement fonctionnel complet.',18,3,'return_to_sport'),

  ('Bursite du coude','Phase 1 — Soulagement (jours 0-7)','Repos positionnel et mobilité douce.',6,7,'acute'),
  ('Bursite du coude','Phase 2 — Mobilité (semaines 1-2)','Mobilité active complète.',8,6,'subacute'),
  ('Bursite du coude','Phase 3 — Renforcement (semaines 2-4)','Renforcement léger du bras.',10,4,'recovery'),
  ('Bursite du coude','Phase 4 — Reprise (semaines 4+)','Reprise des activités habituelles.',12,3,'return_to_sport'),

  ('Tendinopathie de De Quervain','Phase 1 — Soulagement (jours 0-7)','Repositionnement et mobilité douce.',6,7,'acute'),
  ('Tendinopathie de De Quervain','Phase 2 — Mobilité (semaines 1-2)','Étirements progressifs du pouce.',8,6,'subacute'),
  ('Tendinopathie de De Quervain','Phase 3 — Renforcement (semaines 2-4)','Renforcement progressif du pouce.',10,4,'recovery'),
  ('Tendinopathie de De Quervain','Phase 4 — Reprise (semaines 4+)','Reprise du geste habituel.',12,3,'return_to_sport'),

  ('Entorse du poignet','Phase 1 — Protection (jours 0-7)','Mobilité douce sans douleur.',6,7,'acute'),
  ('Entorse du poignet','Phase 2 — Mobilité (semaines 1-2)','Renforcement léger de la préhension.',8,6,'subacute'),
  ('Entorse du poignet','Phase 3 — Renforcement (semaines 2-4)','Renforcement et appui progressif.',12,4,'recovery'),
  ('Entorse du poignet','Phase 4 — Reprise (semaines 4+)','Reprise des activités et du sport.',14,3,'return_to_sport'),

  ('Fracture du poignet','Phase 1 — Protection post-opératoire (semaines 0-2)','Mobilité des doigts et désœdématisation.',6,7,'acute'),
  ('Fracture du poignet','Phase 2 — Mobilité protégée (semaines 2-6)','Mobilité active protégée du poignet.',8,6,'subacute'),
  ('Fracture du poignet','Phase 3 — Renforcement (semaines 6-12)','Renforcement progressif de la préhension.',10,4,'recovery'),
  ('Fracture du poignet','Phase 4 — Reprise fonctionnelle (semaines 12+)','Reprise complète des activités.',12,3,'return_to_sport'),

  ('Rhizarthrose','Phase 1 — Soulagement (jours 0-7)','Mobilité douce et ergonomie.',6,7,'acute'),
  ('Rhizarthrose','Phase 2 — Mobilité (semaines 1-2)','Mobilité active du pouce.',6,6,'subacute'),
  ('Rhizarthrose','Phase 3 — Renforcement (semaines 2-4)','Renforcement léger de la pince.',8,4,'recovery'),
  ('Rhizarthrose','Phase 4 — Reprise (semaines 4+)','Maintien fonctionnel au quotidien.',8,3,'return_to_sport'),

  ('Conflit fémoro-acétabulaire','Phase 1 — Soulagement (jours 0-7)','Mobilité en amplitude confortable.',8,7,'acute'),
  ('Conflit fémoro-acétabulaire','Phase 2 — Mobilité (semaines 1-2)','Renforcement léger du moyen fessier.',10,6,'subacute'),
  ('Conflit fémoro-acétabulaire','Phase 3 — Renforcement (semaines 2-4)','Renforcement du tronc et de la hanche.',15,4,'recovery'),
  ('Conflit fémoro-acétabulaire','Phase 4 — Reprise (semaines 4+)','Renforcement fonctionnel et retour au sport.',18,3,'return_to_sport'),

  ('Prothèse totale de hanche','Phase 1 — Protection post-opératoire (semaines 0-2)','Circulation, isométriques et marche assistée.',8,7,'acute'),
  ('Prothèse totale de hanche','Phase 2 — Mobilité protégée (semaines 2-6)','Mise en charge progressive et abduction.',10,6,'subacute'),
  ('Prothèse totale de hanche','Phase 3 — Renforcement (semaines 6-12)','Renforcement fonctionnel de la hanche.',15,4,'recovery'),
  ('Prothèse totale de hanche','Phase 4 — Reprise fonctionnelle (semaines 12+)','Renforcement complet et endurance à la marche.',18,3,'return_to_sport'),

  ('Pubalgie','Phase 1 — Soulagement (jours 0-7)','Repos relatif et gainage doux.',8,7,'acute'),
  ('Pubalgie','Phase 2 — Mobilité (semaines 1-2)','Étirement et gainage progressif des adducteurs.',10,6,'subacute'),
  ('Pubalgie','Phase 3 — Renforcement (semaines 2-4)','Renforcement excentrique des adducteurs.',15,4,'recovery'),
  ('Pubalgie','Phase 4 — Reprise (semaines 4+)','Renforcement fonctionnel et retour au sport.',18,3,'return_to_sport'),

  ('Rupture du ligament croisé antérieur','Phase 1 — Protection post-opératoire (semaines 0-2)','Contrôle de l''œdème, isométriques et mobilité protégée.',10,7,'acute'),
  ('Rupture du ligament croisé antérieur','Phase 2 — Mobilité protégée (semaines 2-6)','Mobilité active et renforcement léger.',15,6,'subacute'),
  ('Rupture du ligament croisé antérieur','Phase 3 — Renforcement (semaines 6-12)','Renforcement du quadriceps et des ischio-jambiers, équilibre.',20,4,'recovery'),
  ('Rupture du ligament croisé antérieur','Phase 4 — Reprise fonctionnelle (semaines 12+)','Renforcement fonctionnel et préparation au retour au sport.',25,3,'return_to_sport'),

  ('Méniscopathie','Phase 1 — Soulagement (jours 0-7)','Mobilité sans charge et contrôle de la douleur.',8,7,'acute'),
  ('Méniscopathie','Phase 2 — Mobilité (semaines 1-2)','Renforcement léger du quadriceps.',10,6,'subacute'),
  ('Méniscopathie','Phase 3 — Renforcement (semaines 2-4)','Renforcement global du genou.',15,4,'recovery'),
  ('Méniscopathie','Phase 4 — Reprise (semaines 4+)','Renforcement fonctionnel et retour aux activités.',18,3,'return_to_sport'),

  ('Tendinopathie rotulienne','Phase 1 — Soulagement (jours 0-7)','Isométriques du quadriceps et repos relatif.',8,7,'acute'),
  ('Tendinopathie rotulienne','Phase 2 — Mobilité (semaines 1-2)','Étirements et renforcement léger.',10,6,'subacute'),
  ('Tendinopathie rotulienne','Phase 3 — Renforcement (semaines 2-4)','Renforcement excentrique progressif.',15,4,'recovery'),
  ('Tendinopathie rotulienne','Phase 4 — Reprise (semaines 4+)','Renforcement fonctionnel et retour au sport.',18,3,'return_to_sport'),

  ('Prothèse totale de genou','Phase 1 — Protection post-opératoire (semaines 0-2)','Mobilité passive et isométriques du quadriceps.',10,7,'acute'),
  ('Prothèse totale de genou','Phase 2 — Mobilité protégée (semaines 2-6)','Extension active et marche assistée.',12,6,'subacute'),
  ('Prothèse totale de genou','Phase 3 — Renforcement (semaines 6-12)','Renforcement fonctionnel du genou.',18,4,'recovery'),
  ('Prothèse totale de genou','Phase 4 — Reprise fonctionnelle (semaines 12+)','Renforcement complet et endurance à la marche.',20,3,'return_to_sport'),

  ('Entorse du ligament collatéral médial','Phase 1 — Protection (jours 0-7)','Mobilité douce et contrôle de la douleur.',8,7,'acute'),
  ('Entorse du ligament collatéral médial','Phase 2 — Mobilité (semaines 1-2)','Renforcement léger en chaîne fermée.',10,6,'subacute'),
  ('Entorse du ligament collatéral médial','Phase 3 — Renforcement (semaines 2-4)','Renforcement des adducteurs et du quadriceps.',15,4,'recovery'),
  ('Entorse du ligament collatéral médial','Phase 4 — Reprise (semaines 4+)','Renforcement fonctionnel et retour au sport.',18,3,'return_to_sport'),

  ('Rupture du tendon d''Achille','Phase 1 — Protection post-opératoire (semaines 0-2)','Mobilité protégée en amplitude limitée.',8,7,'acute'),
  ('Rupture du tendon d''Achille','Phase 2 — Mobilité protégée (semaines 2-6)','Mise en charge progressive.',10,6,'subacute'),
  ('Rupture du tendon d''Achille','Phase 3 — Renforcement (semaines 6-12)','Renforcement isométrique puis actif du mollet.',15,4,'recovery'),
  ('Rupture du tendon d''Achille','Phase 4 — Reprise fonctionnelle (semaines 12+)','Renforcement fonctionnel et retour progressif à la course.',18,3,'return_to_sport'),

  ('Fracture de la cheville','Phase 1 — Protection post-opératoire (semaines 0-2)','Mobilité protégée et contraction sans mouvement.',8,7,'acute'),
  ('Fracture de la cheville','Phase 2 — Mobilité protégée (semaines 2-6)','Mise en charge progressive selon autorisation.',10,6,'subacute'),
  ('Fracture de la cheville','Phase 3 — Renforcement (semaines 6-12)','Renforcement et proprioception.',15,4,'recovery'),
  ('Fracture de la cheville','Phase 4 — Reprise fonctionnelle (semaines 12+)','Renforcement fonctionnel complet.',18,3,'return_to_sport'),

  ('Instabilité chronique de cheville','Phase 1 — Soulagement (jours 0-7)','Mobilité douce et repos relatif.',8,7,'acute'),
  ('Instabilité chronique de cheville','Phase 2 — Mobilité (semaines 1-2)','Renforcement léger des péroniers.',10,6,'subacute'),
  ('Instabilité chronique de cheville','Phase 3 — Renforcement (semaines 2-4)','Proprioception et équilibre progressif.',15,4,'recovery'),
  ('Instabilité chronique de cheville','Phase 4 — Reprise (semaines 4+)','Sauts contrôlés et retour au sport.',18,3,'return_to_sport'),

  ('Élongation des ischio-jambiers','Phase 1 — Protection (jours 0-7)','Repos relatif et étirements très doux.',8,7,'acute'),
  ('Élongation des ischio-jambiers','Phase 2 — Mobilité (semaines 1-2)','Renforcement isométrique léger.',10,6,'subacute'),
  ('Élongation des ischio-jambiers','Phase 3 — Renforcement (semaines 2-4)','Renforcement progressif et pont unipodal.',15,4,'recovery'),
  ('Élongation des ischio-jambiers','Phase 4 — Reprise (semaines 4+)','Reprise progressive de la course et du sport.',18,3,'return_to_sport'),

  ('Élongation du mollet','Phase 1 — Protection (jours 0-7)','Repos relatif et mobilité douce.',6,7,'acute'),
  ('Élongation du mollet','Phase 2 — Mobilité (semaines 1-2)','Étirements progressifs du mollet.',8,6,'subacute'),
  ('Élongation du mollet','Phase 3 — Renforcement (semaines 2-4)','Renforcement isométrique puis actif.',12,4,'recovery'),
  ('Élongation du mollet','Phase 4 — Reprise (semaines 4+)','Reprise progressive de la course.',14,3,'return_to_sport'),

  ('Déchirure du quadriceps','Phase 1 — Protection (jours 0-7)','Repos relatif et contractions isométriques légères.',8,7,'acute'),
  ('Déchirure du quadriceps','Phase 2 — Mobilité (semaines 1-2)','Mobilité active sans résistance.',10,6,'subacute'),
  ('Déchirure du quadriceps','Phase 3 — Renforcement (semaines 2-4)','Renforcement progressif du quadriceps.',15,4,'recovery'),
  ('Déchirure du quadriceps','Phase 4 — Reprise (semaines 4+)','Reprise fonctionnelle et retour au sport.',18,3,'return_to_sport'),

  ('Syndrome du piriforme','Phase 1 — Soulagement (jours 0-7)','Étirement doux et auto-massage.',8,7,'acute'),
  ('Syndrome du piriforme','Phase 2 — Mobilité (semaines 1-2)','Étirements progressifs et renforcement léger.',10,6,'subacute'),
  ('Syndrome du piriforme','Phase 3 — Renforcement (semaines 2-4)','Renforcement du moyen fessier.',12,4,'recovery'),
  ('Syndrome du piriforme','Phase 4 — Reprise (semaines 4+)','Reprise des activités habituelles.',14,3,'return_to_sport'),

  ('Syndrome du défilé thoracique','Phase 1 — Soulagement (jours 0-7)','Ouverture thoracique et étirements doux.',8,7,'acute'),
  ('Syndrome du défilé thoracique','Phase 2 — Mobilité (semaines 1-2)','Mobilité neurale douce et posture.',10,6,'subacute'),
  ('Syndrome du défilé thoracique','Phase 3 — Renforcement (semaines 2-4)','Renforcement postural des trapèzes moyens.',12,4,'recovery'),
  ('Syndrome du défilé thoracique','Phase 4 — Reprise (semaines 4+)','Maintien postural au quotidien.',14,3,'return_to_sport'),

  ('Entorse acromio-claviculaire','Phase 1 — Protection (jours 0-7)','Mobilité protégée, sans élévation complète.',8,7,'acute'),
  ('Entorse acromio-claviculaire','Phase 2 — Mobilité (semaines 1-2)','Renforcement isométrique léger.',10,6,'subacute'),
  ('Entorse acromio-claviculaire','Phase 3 — Renforcement (semaines 2-4)','Renforcement de la coiffe et de l''omoplate.',15,4,'recovery'),
  ('Entorse acromio-claviculaire','Phase 4 — Reprise (semaines 4+)','Renforcement fonctionnel et retour au sport.',18,3,'return_to_sport'),

  ('Syndrome croisé supérieur','Phase 1 — Soulagement (jours 0-7)','Étirements doux et prise de conscience posturale.',8,7,'acute'),
  ('Syndrome croisé supérieur','Phase 2 — Mobilité (semaines 1-2)','Étirements et renforcement postural léger.',10,6,'subacute'),
  ('Syndrome croisé supérieur','Phase 3 — Renforcement (semaines 2-4)','Renforcement des trapèzes moyens et rhomboïdes.',12,4,'recovery'),
  ('Syndrome croisé supérieur','Phase 4 — Reprise (semaines 4+)','Maintien postural et habitudes au quotidien.',14,3,'return_to_sport'),

  ('Reconditionnement physique général','Phase 1 — Reprise douce (jours 0-7)','Marche courte et mobilité globale légère.',8,7,'acute'),
  ('Reconditionnement physique général','Phase 2 — Progression (semaines 1-2)','Marche progressive et lever de chaise assisté.',10,6,'subacute'),
  ('Reconditionnement physique général','Phase 3 — Renforcement (semaines 2-4)','Renforcement global léger et équilibre.',15,4,'recovery'),
  ('Reconditionnement physique général','Phase 4 — Autonomie (semaines 4+)','Renforcement fonctionnel et activités quotidiennes.',18,3,'return_to_sport'),

  ('Périostite tibiale','Phase 1 — Protection (jours 0-7)','Repos relatif et étirements doux.',8,7,'acute'),
  ('Périostite tibiale','Phase 2 — Mobilité (semaines 1-2)','Renforcement léger du tibial antérieur.',10,6,'subacute'),
  ('Périostite tibiale','Phase 3 — Renforcement (semaines 2-4)','Renforcement du mollet et du tibia.',12,4,'recovery'),
  ('Périostite tibiale','Phase 4 — Reprise (semaines 4+)','Reprise progressive de la course.',15,3,'return_to_sport')
) as v(cname, wname, descr, dur, tpw, stage)
  on v.cname = c.name and c.created_by is null
where not exists (
  select 1 from public.workouts w where w.condition_id = c.id and w.name = v.wname
);

-- ---------------------------------------------------------------------------
-- 4. Exercises inside each staged workout, 3 per phase (idempotent)
-- ---------------------------------------------------------------------------
insert into public.workout_exercises (workout_id, exercise_id, position)
select w.id, e.id, v.pos
from public.workouts w
join public.conditions c on c.id = w.condition_id and c.created_by is null
join (values
  -- Hernie discale lombaire
  ('Hernie discale lombaire','Phase 1 — Soulagement (jours 0-7)','Position antalgique en crochet',0),
  ('Hernie discale lombaire','Phase 1 — Soulagement (jours 0-7)','Respiration abdominale',1),
  ('Hernie discale lombaire','Phase 1 — Soulagement (jours 0-7)','Extension lombaire en décubitus (McKenzie doux)',2),
  ('Hernie discale lombaire','Phase 2 — Mobilité (semaines 1-2)','Marche courte fractionnée',0),
  ('Hernie discale lombaire','Phase 2 — Mobilité (semaines 1-2)','Bascule du bassin',1),
  ('Hernie discale lombaire','Phase 2 — Mobilité (semaines 1-2)','Gainage abdominal en douceur (hernie)',2),
  ('Hernie discale lombaire','Phase 3 — Renforcement (semaines 2-4)','Gainage en planche modifiée',0),
  ('Hernie discale lombaire','Phase 3 — Renforcement (semaines 2-4)','Renforcement des extenseurs du dos, léger',1),
  ('Hernie discale lombaire','Phase 3 — Renforcement (semaines 2-4)','Étirement du psoas à genoux',2),
  ('Hernie discale lombaire','Phase 4 — Reprise (semaines 4+)','Squat contre un mur',0),
  ('Hernie discale lombaire','Phase 4 — Reprise (semaines 4+)','Pont fessier',1),
  ('Hernie discale lombaire','Phase 4 — Reprise (semaines 4+)','Gainage abdominal (planche)',2),

  -- Entorse cervicale
  ('Entorse cervicale','Phase 1 — Soulagement (jours 0-7)','Mobilité cervicale en amplitude protégée',0),
  ('Entorse cervicale','Phase 1 — Soulagement (jours 0-7)','Relâchement des épaules',1),
  ('Entorse cervicale','Phase 1 — Soulagement (jours 0-7)','Auto-mobilisation des trapèzes supérieurs',2),
  ('Entorse cervicale','Phase 2 — Mobilité (semaines 1-2)','Rotation cervicale douce',0),
  ('Entorse cervicale','Phase 2 — Mobilité (semaines 1-2)','Inclinaison latérale du cou',1),
  ('Entorse cervicale','Phase 2 — Mobilité (semaines 1-2)','Étirement des trapèzes',2),
  ('Entorse cervicale','Phase 3 — Renforcement (semaines 2-4)','Isométrique cervical multidirectionnel léger',0),
  ('Entorse cervicale','Phase 3 — Renforcement (semaines 2-4)','Rétraction cervicale (double menton)',1),
  ('Entorse cervicale','Phase 3 — Renforcement (semaines 2-4)','Rétraction scapulaire',2),
  ('Entorse cervicale','Phase 4 — Reprise (semaines 4+)','Gainage postural',0),
  ('Entorse cervicale','Phase 4 — Reprise (semaines 4+)','Renforcement isométrique du cou',1),
  ('Entorse cervicale','Phase 4 — Reprise (semaines 4+)','Rétraction scapulaire',2),

  -- Dorsalgie
  ('Dorsalgie','Phase 1 — Soulagement (jours 0-7)','Chat-vache',0),
  ('Dorsalgie','Phase 1 — Soulagement (jours 0-7)','Extension thoracique sur chaise',1),
  ('Dorsalgie','Phase 1 — Soulagement (jours 0-7)','Respiration abdominale',2),
  ('Dorsalgie','Phase 2 — Mobilité (semaines 1-2)','Rotation du tronc assise',0),
  ('Dorsalgie','Phase 2 — Mobilité (semaines 1-2)','Étirement des pectoraux à la porte (dorsalgie)',1),
  ('Dorsalgie','Phase 2 — Mobilité (semaines 1-2)','Rotation du tronc',2),
  ('Dorsalgie','Phase 3 — Renforcement (semaines 2-4)','Renforcement des rhomboïdes',0),
  ('Dorsalgie','Phase 3 — Renforcement (semaines 2-4)','Rétraction scapulaire',1),
  ('Dorsalgie','Phase 3 — Renforcement (semaines 2-4)','Gainage postural',2),
  ('Dorsalgie','Phase 4 — Reprise (semaines 4+)','Quadrupède alterné',0),
  ('Dorsalgie','Phase 4 — Reprise (semaines 4+)','Planche latérale',1),
  ('Dorsalgie','Phase 4 — Reprise (semaines 4+)','Renforcement des rhomboïdes',2),

  -- Sténose spinale lombaire
  ('Sténose spinale lombaire','Phase 1 — Soulagement (jours 0-7)','Flexion lombaire assise, soulagement',0),
  ('Sténose spinale lombaire','Phase 1 — Soulagement (jours 0-7)','Bascule du bassin en position assise',1),
  ('Sténose spinale lombaire','Phase 1 — Soulagement (jours 0-7)','Respiration abdominale',2),
  ('Sténose spinale lombaire','Phase 2 — Mobilité (semaines 1-2)','Vélo stationnaire assis (sténose)',0),
  ('Sténose spinale lombaire','Phase 2 — Mobilité (semaines 1-2)','Marche en position penchée, courte durée',1),
  ('Sténose spinale lombaire','Phase 2 — Mobilité (semaines 1-2)','Bascule du bassin',2),
  ('Sténose spinale lombaire','Phase 3 — Renforcement (semaines 2-4)','Gainage abdominal en douceur (hernie)',0),
  ('Sténose spinale lombaire','Phase 3 — Renforcement (semaines 2-4)','Pont fessier',1),
  ('Sténose spinale lombaire','Phase 3 — Renforcement (semaines 2-4)','Vélo stationnaire assis (sténose)',2),
  ('Sténose spinale lombaire','Phase 4 — Reprise (semaines 4+)','Marche courte fractionnée',0),
  ('Sténose spinale lombaire','Phase 4 — Reprise (semaines 4+)','Squat contre un mur',1),
  ('Sténose spinale lombaire','Phase 4 — Reprise (semaines 4+)','Gainage abdominal (planche)',2),

  -- Conflit sous-acromial
  ('Conflit sous-acromial','Phase 1 — Soulagement (jours 0-7)','Mobilité pendulaire de l''épaule',0),
  ('Conflit sous-acromial','Phase 1 — Soulagement (jours 0-7)','Élévation active limitée',1),
  ('Conflit sous-acromial','Phase 1 — Soulagement (jours 0-7)','Rétraction scapulaire',2),
  ('Conflit sous-acromial','Phase 2 — Mobilité (semaines 1-2)','Rotation externe basse résistance',0),
  ('Conflit sous-acromial','Phase 2 — Mobilité (semaines 1-2)','Renforcement du serratus antérieur',1),
  ('Conflit sous-acromial','Phase 2 — Mobilité (semaines 1-2)','Élévation active limitée',2),
  ('Conflit sous-acromial','Phase 3 — Renforcement (semaines 2-4)','Rotation externe basse résistance',0),
  ('Conflit sous-acromial','Phase 3 — Renforcement (semaines 2-4)','Renforcement du serratus antérieur',1),
  ('Conflit sous-acromial','Phase 3 — Renforcement (semaines 2-4)','Rétraction scapulaire',2),
  ('Conflit sous-acromial','Phase 4 — Reprise (semaines 4+)','Renforcement du serratus antérieur',0),
  ('Conflit sous-acromial','Phase 4 — Reprise (semaines 4+)','Rotation externe basse résistance',1),
  ('Conflit sous-acromial','Phase 4 — Reprise (semaines 4+)','Élévation active limitée',2),

  -- Instabilité de l'épaule
  ('Instabilité de l''épaule','Phase 1 — Soulagement (jours 0-7)','Mobilité pendulaire de l''épaule',0),
  ('Instabilité de l''épaule','Phase 1 — Soulagement (jours 0-7)','Renforcement isométrique de l''épaule, multidirectionnel',1),
  ('Instabilité de l''épaule','Phase 1 — Soulagement (jours 0-7)','Rétraction scapulaire',2),
  ('Instabilité de l''épaule','Phase 2 — Mobilité (semaines 1-2)','Stabilité scapulaire en quadrupédie',0),
  ('Instabilité de l''épaule','Phase 2 — Mobilité (semaines 1-2)','Renforcement isométrique de l''épaule, multidirectionnel',1),
  ('Instabilité de l''épaule','Phase 2 — Mobilité (semaines 1-2)','Proprioception de l''épaule sur appui',2),
  ('Instabilité de l''épaule','Phase 3 — Renforcement (semaines 2-4)','Renforcement de la coiffe en rotation, élastique',0),
  ('Instabilité de l''épaule','Phase 3 — Renforcement (semaines 2-4)','Stabilité scapulaire en quadrupédie',1),
  ('Instabilité de l''épaule','Phase 3 — Renforcement (semaines 2-4)','Proprioception de l''épaule sur appui',2),
  ('Instabilité de l''épaule','Phase 4 — Reprise (semaines 4+)','Renforcement de la coiffe en rotation, élastique',0),
  ('Instabilité de l''épaule','Phase 4 — Reprise (semaines 4+)','Proprioception de l''épaule sur appui',1),
  ('Instabilité de l''épaule','Phase 4 — Reprise (semaines 4+)','Stabilité scapulaire en quadrupédie',2),

  -- Réparation de la coiffe des rotateurs
  ('Réparation de la coiffe des rotateurs','Phase 1 — Protection post-opératoire (semaines 0-2)','Pendulaire protégé post-opératoire',0),
  ('Réparation de la coiffe des rotateurs','Phase 1 — Protection post-opératoire (semaines 0-2)','Mobilité passive protégée (post-coiffe)',1),
  ('Réparation de la coiffe des rotateurs','Phase 2 — Mobilité protégée (semaines 2-6)','Mobilité active-aidée précoce (coiffe)',0),
  ('Réparation de la coiffe des rotateurs','Phase 2 — Mobilité protégée (semaines 2-6)','Mobilité passive protégée (post-coiffe)',1),
  ('Réparation de la coiffe des rotateurs','Phase 3 — Renforcement (semaines 6-12)','Renforcement isométrique doux (post-coiffe)',0),
  ('Réparation de la coiffe des rotateurs','Phase 3 — Renforcement (semaines 6-12)','Mobilité active-aidée précoce (coiffe)',1),
  ('Réparation de la coiffe des rotateurs','Phase 3 — Renforcement (semaines 6-12)','Rétraction scapulaire',2),
  ('Réparation de la coiffe des rotateurs','Phase 4 — Reprise fonctionnelle (semaines 12+)','Renforcement de la coiffe en rotation, élastique',0),
  ('Réparation de la coiffe des rotateurs','Phase 4 — Reprise fonctionnelle (semaines 12+)','Renforcement du serratus antérieur',1),
  ('Réparation de la coiffe des rotateurs','Phase 4 — Reprise fonctionnelle (semaines 12+)','Proprioception de l''épaule sur appui',2),

  -- Prothèse totale d'épaule
  ('Prothèse totale d''épaule','Phase 1 — Protection post-opératoire (semaines 0-2)','Mobilité pendulaire post-prothèse',0),
  ('Prothèse totale d''épaule','Phase 1 — Protection post-opératoire (semaines 0-2)','Mobilité passive assistée post-prothèse',1),
  ('Prothèse totale d''épaule','Phase 2 — Mobilité protégée (semaines 2-6)','Rotation externe passive au bâton',0),
  ('Prothèse totale d''épaule','Phase 2 — Mobilité protégée (semaines 2-6)','Mobilité passive assistée post-prothèse',1),
  ('Prothèse totale d''épaule','Phase 3 — Renforcement (semaines 6-12)','Renforcement fonctionnel léger (post-prothèse)',0),
  ('Prothèse totale d''épaule','Phase 3 — Renforcement (semaines 6-12)','Rotation externe passive au bâton',1),
  ('Prothèse totale d''épaule','Phase 3 — Renforcement (semaines 6-12)','Rétraction scapulaire',2),
  ('Prothèse totale d''épaule','Phase 4 — Reprise fonctionnelle (semaines 12+)','Renforcement fonctionnel léger (post-prothèse)',0),
  ('Prothèse totale d''épaule','Phase 4 — Reprise fonctionnelle (semaines 12+)','Renforcement du serratus antérieur',1),

  -- Bursite du coude
  ('Bursite du coude','Phase 1 — Soulagement (jours 0-7)','Repos positionnel du coude',0),
  ('Bursite du coude','Phase 1 — Soulagement (jours 0-7)','Mobilité active du coude, amplitude complète',1),
  ('Bursite du coude','Phase 2 — Mobilité (semaines 1-2)','Mobilité active du coude, amplitude complète',0),
  ('Bursite du coude','Phase 2 — Mobilité (semaines 1-2)','Renforcement léger du triceps',1),
  ('Bursite du coude','Phase 3 — Renforcement (semaines 2-4)','Renforcement léger du triceps',0),
  ('Bursite du coude','Phase 3 — Renforcement (semaines 2-4)','Mobilité active du coude, amplitude complète',1),
  ('Bursite du coude','Phase 4 — Reprise (semaines 4+)','Renforcement léger du triceps',0),

  -- Tendinopathie de De Quervain
  ('Tendinopathie de De Quervain','Phase 1 — Soulagement (jours 0-7)','Repositionnement neutre du pouce',0),
  ('Tendinopathie de De Quervain','Phase 1 — Soulagement (jours 0-7)','Mobilité active du pouce et du poignet',1),
  ('Tendinopathie de De Quervain','Phase 2 — Mobilité (semaines 1-2)','Étirement du pouce en flexion (De Quervain)',0),
  ('Tendinopathie de De Quervain','Phase 2 — Mobilité (semaines 1-2)','Mobilité active du pouce et du poignet',1),
  ('Tendinopathie de De Quervain','Phase 3 — Renforcement (semaines 2-4)','Renforcement progressif du pouce, élastique',0),
  ('Tendinopathie de De Quervain','Phase 3 — Renforcement (semaines 2-4)','Étirement du pouce en flexion (De Quervain)',1),
  ('Tendinopathie de De Quervain','Phase 4 — Reprise (semaines 4+)','Renforcement progressif du pouce, élastique',0),

  -- Entorse du poignet
  ('Entorse du poignet','Phase 1 — Protection (jours 0-7)','Mobilité active du poignet en douceur (entorse)',0),
  ('Entorse du poignet','Phase 1 — Protection (jours 0-7)','Renforcement de la préhension légère (poignet)',1),
  ('Entorse du poignet','Phase 2 — Mobilité (semaines 1-2)','Renforcement du poignet à l''élastique',0),
  ('Entorse du poignet','Phase 2 — Mobilité (semaines 1-2)','Mobilité active du poignet en douceur (entorse)',1),
  ('Entorse du poignet','Phase 3 — Renforcement (semaines 2-4)','Appui progressif sur la main',0),
  ('Entorse du poignet','Phase 3 — Renforcement (semaines 2-4)','Renforcement du poignet à l''élastique',1),
  ('Entorse du poignet','Phase 4 — Reprise (semaines 4+)','Appui progressif sur la main',0),
  ('Entorse du poignet','Phase 4 — Reprise (semaines 4+)','Renforcement du poignet à l''élastique',1),

  -- Fracture du poignet
  ('Fracture du poignet','Phase 1 — Protection post-opératoire (semaines 0-2)','Mobilité active des doigts (post-fracture poignet)',0),
  ('Fracture du poignet','Phase 1 — Protection post-opératoire (semaines 0-2)','Désœdématisation par élévation',1),
  ('Fracture du poignet','Phase 2 — Mobilité protégée (semaines 2-6)','Mobilité active protégée du poignet',0),
  ('Fracture du poignet','Phase 2 — Mobilité protégée (semaines 2-6)','Mobilité active des doigts (post-fracture poignet)',1),
  ('Fracture du poignet','Phase 3 — Renforcement (semaines 6-12)','Renforcement progressif post-immobilisation',0),
  ('Fracture du poignet','Phase 3 — Renforcement (semaines 6-12)','Mobilité active protégée du poignet',1),
  ('Fracture du poignet','Phase 4 — Reprise fonctionnelle (semaines 12+)','Renforcement progressif post-immobilisation',0),

  -- Rhizarthrose
  ('Rhizarthrose','Phase 1 — Soulagement (jours 0-7)','Mobilité douce de la base du pouce',0),
  ('Rhizarthrose','Phase 1 — Soulagement (jours 0-7)','Ergonomie de préhension',1),
  ('Rhizarthrose','Phase 2 — Mobilité (semaines 1-2)','Mobilité douce de la base du pouce',0),
  ('Rhizarthrose','Phase 2 — Mobilité (semaines 1-2)','Renforcement de la pince pouce-index',1),
  ('Rhizarthrose','Phase 3 — Renforcement (semaines 2-4)','Renforcement de la pince pouce-index',0),
  ('Rhizarthrose','Phase 3 — Renforcement (semaines 2-4)','Ergonomie de préhension',1),
  ('Rhizarthrose','Phase 4 — Reprise (semaines 4+)','Renforcement de la pince pouce-index',0),

  -- Conflit fémoro-acétabulaire
  ('Conflit fémoro-acétabulaire','Phase 1 — Soulagement (jours 0-7)','Mobilité de hanche en amplitude confortable',0),
  ('Conflit fémoro-acétabulaire','Phase 1 — Soulagement (jours 0-7)','Gainage du tronc en pont',1),
  ('Conflit fémoro-acétabulaire','Phase 2 — Mobilité (semaines 1-2)','Renforcement du moyen fessier, coquille',0),
  ('Conflit fémoro-acétabulaire','Phase 2 — Mobilité (semaines 1-2)','Mobilité de hanche en amplitude confortable',1),
  ('Conflit fémoro-acétabulaire','Phase 3 — Renforcement (semaines 2-4)','Squat en amplitude limitée (hanche)',0),
  ('Conflit fémoro-acétabulaire','Phase 3 — Renforcement (semaines 2-4)','Renforcement du moyen fessier, coquille',1),
  ('Conflit fémoro-acétabulaire','Phase 3 — Renforcement (semaines 2-4)','Gainage du tronc en pont',2),
  ('Conflit fémoro-acétabulaire','Phase 4 — Reprise (semaines 4+)','Squat en amplitude limitée (hanche)',0),
  ('Conflit fémoro-acétabulaire','Phase 4 — Reprise (semaines 4+)','Renforcement du moyen fessier, coquille',1),

  -- Prothèse totale de hanche
  ('Prothèse totale de hanche','Phase 1 — Protection post-opératoire (semaines 0-2)','Pompes de cheville (post-prothèse hanche)',0),
  ('Prothèse totale de hanche','Phase 1 — Protection post-opératoire (semaines 0-2)','Contraction du quadriceps, isométrique',1),
  ('Prothèse totale de hanche','Phase 1 — Protection post-opératoire (semaines 0-2)','Marche assistée progressive',2),
  ('Prothèse totale de hanche','Phase 2 — Mobilité protégée (semaines 2-6)','Abduction de hanche allongée (post-prothèse)',0),
  ('Prothèse totale de hanche','Phase 2 — Mobilité protégée (semaines 2-6)','Mise en charge progressive sur la jambe opérée',1),
  ('Prothèse totale de hanche','Phase 2 — Mobilité protégée (semaines 2-6)','Marche assistée progressive',2),
  ('Prothèse totale de hanche','Phase 3 — Renforcement (semaines 6-12)','Abduction de hanche allongée (post-prothèse)',0),
  ('Prothèse totale de hanche','Phase 3 — Renforcement (semaines 6-12)','Renforcement du moyen fessier, coquille',1),
  ('Prothèse totale de hanche','Phase 3 — Renforcement (semaines 6-12)','Mise en charge progressive sur la jambe opérée',2),
  ('Prothèse totale de hanche','Phase 4 — Reprise fonctionnelle (semaines 12+)','Marche assistée progressive',0),
  ('Prothèse totale de hanche','Phase 4 — Reprise fonctionnelle (semaines 12+)','Renforcement du moyen fessier, coquille',1),

  -- Pubalgie
  ('Pubalgie','Phase 1 — Soulagement (jours 0-7)','Gainage des adducteurs, ballon',0),
  ('Pubalgie','Phase 1 — Soulagement (jours 0-7)','Étirement des adducteurs assis',1),
  ('Pubalgie','Phase 2 — Mobilité (semaines 1-2)','Gainage abdominal anti-rotation',0),
  ('Pubalgie','Phase 2 — Mobilité (semaines 1-2)','Gainage des adducteurs, ballon',1),
  ('Pubalgie','Phase 3 — Renforcement (semaines 2-4)','Renforcement excentrique des adducteurs',0),
  ('Pubalgie','Phase 3 — Renforcement (semaines 2-4)','Gainage abdominal anti-rotation',1),
  ('Pubalgie','Phase 3 — Renforcement (semaines 2-4)','Étirement des adducteurs assis',2),
  ('Pubalgie','Phase 4 — Reprise (semaines 4+)','Renforcement excentrique des adducteurs',0),
  ('Pubalgie','Phase 4 — Reprise (semaines 4+)','Gainage abdominal anti-rotation',1),

  -- Rupture du ligament croisé antérieur
  ('Rupture du ligament croisé antérieur','Phase 1 — Protection post-opératoire (semaines 0-2)','Contraction du quadriceps, isométrique (LCA)',0),
  ('Rupture du ligament croisé antérieur','Phase 1 — Protection post-opératoire (semaines 0-2)','Mobilité active du genou, amplitude protégée',1),
  ('Rupture du ligament croisé antérieur','Phase 2 — Mobilité protégée (semaines 2-6)','Renforcement des ischio-jambiers, pont sur talons',0),
  ('Rupture du ligament croisé antérieur','Phase 2 — Mobilité protégée (semaines 2-6)','Mobilité active du genou, amplitude protégée',1),
  ('Rupture du ligament croisé antérieur','Phase 2 — Mobilité protégée (semaines 2-6)','Contraction du quadriceps, isométrique (LCA)',2),
  ('Rupture du ligament croisé antérieur','Phase 3 — Renforcement (semaines 6-12)','Équilibre bipodal puis unipodal progressif',0),
  ('Rupture du ligament croisé antérieur','Phase 3 — Renforcement (semaines 6-12)','Squat protégé sur amplitude réduite (LCA)',1),
  ('Rupture du ligament croisé antérieur','Phase 3 — Renforcement (semaines 6-12)','Renforcement des ischio-jambiers, pont sur talons',2),
  ('Rupture du ligament croisé antérieur','Phase 4 — Reprise fonctionnelle (semaines 12+)','Squat protégé sur amplitude réduite (LCA)',0),
  ('Rupture du ligament croisé antérieur','Phase 4 — Reprise fonctionnelle (semaines 12+)','Équilibre bipodal puis unipodal progressif',1),

  -- Méniscopathie
  ('Méniscopathie','Phase 1 — Soulagement (jours 0-7)','Mobilité active du genou sans charge',0),
  ('Méniscopathie','Phase 1 — Soulagement (jours 0-7)','Renforcement du quadriceps à faible amplitude',1),
  ('Méniscopathie','Phase 2 — Mobilité (semaines 1-2)','Vélo stationnaire, faible résistance (ménisque)',0),
  ('Méniscopathie','Phase 2 — Mobilité (semaines 1-2)','Renforcement du quadriceps à faible amplitude',1),
  ('Méniscopathie','Phase 3 — Renforcement (semaines 2-4)','Renforcement des fessiers, pont fessier (ménisque)',0),
  ('Méniscopathie','Phase 3 — Renforcement (semaines 2-4)','Vélo stationnaire, faible résistance (ménisque)',1),
  ('Méniscopathie','Phase 4 — Reprise (semaines 4+)','Renforcement des fessiers, pont fessier (ménisque)',0),
  ('Méniscopathie','Phase 4 — Reprise (semaines 4+)','Équilibre sur une jambe',1),

  -- Tendinopathie rotulienne
  ('Tendinopathie rotulienne','Phase 1 — Soulagement (jours 0-7)','Renforcement isométrique du quadriceps, chaise',0),
  ('Tendinopathie rotulienne','Phase 1 — Soulagement (jours 0-7)','Étirement du quadriceps debout',1),
  ('Tendinopathie rotulienne','Phase 2 — Mobilité (semaines 1-2)','Renforcement isométrique du quadriceps, chaise',0),
  ('Tendinopathie rotulienne','Phase 2 — Mobilité (semaines 1-2)','Étirement du quadriceps debout',1),
  ('Tendinopathie rotulienne','Phase 3 — Renforcement (semaines 2-4)','Renforcement excentrique du quadriceps, plan incliné',0),
  ('Tendinopathie rotulienne','Phase 3 — Renforcement (semaines 2-4)','Montée sur step contrôlée',1),
  ('Tendinopathie rotulienne','Phase 4 — Reprise (semaines 4+)','Renforcement excentrique du quadriceps, plan incliné',0),
  ('Tendinopathie rotulienne','Phase 4 — Reprise (semaines 4+)','Montée sur step contrôlée',1),

  -- Prothèse totale de genou
  ('Prothèse totale de genou','Phase 1 — Protection post-opératoire (semaines 0-2)','Mobilité passive du genou, glissé talon',0),
  ('Prothèse totale de genou','Phase 1 — Protection post-opératoire (semaines 0-2)','Contraction du quadriceps, isométrique (post-prothèse)',1),
  ('Prothèse totale de genou','Phase 2 — Mobilité protégée (semaines 2-6)','Extension active du genou, talon surélevé',0),
  ('Prothèse totale de genou','Phase 2 — Mobilité protégée (semaines 2-6)','Marche assistée progressive (post-prothèse genou)',1),
  ('Prothèse totale de genou','Phase 2 — Mobilité protégée (semaines 2-6)','Mobilité passive du genou, glissé talon',2),
  ('Prothèse totale de genou','Phase 3 — Renforcement (semaines 6-12)','Montée de marche assistée',0),
  ('Prothèse totale de genou','Phase 3 — Renforcement (semaines 6-12)','Extension active du genou, talon surélevé',1),
  ('Prothèse totale de genou','Phase 4 — Reprise fonctionnelle (semaines 12+)','Montée de marche assistée',0),
  ('Prothèse totale de genou','Phase 4 — Reprise fonctionnelle (semaines 12+)','Marche assistée progressive (post-prothèse genou)',1),

  -- Entorse du ligament collatéral médial
  ('Entorse du ligament collatéral médial','Phase 1 — Protection (jours 0-7)','Mobilité active du genou sans charge',0),
  ('Entorse du ligament collatéral médial','Phase 1 — Protection (jours 0-7)','Contraction du quadriceps, isométrique (LCA)',1),
  ('Entorse du ligament collatéral médial','Phase 2 — Mobilité (semaines 1-2)','Renforcement des adducteurs, léger (genou)',0),
  ('Entorse du ligament collatéral médial','Phase 2 — Mobilité (semaines 1-2)','Renforcement du quadriceps, chaîne fermée légère',1),
  ('Entorse du ligament collatéral médial','Phase 3 — Renforcement (semaines 2-4)','Équilibre unipodal progressif (genou)',0),
  ('Entorse du ligament collatéral médial','Phase 3 — Renforcement (semaines 2-4)','Renforcement du quadriceps, chaîne fermée légère',1),
  ('Entorse du ligament collatéral médial','Phase 4 — Reprise (semaines 4+)','Équilibre unipodal progressif (genou)',0),
  ('Entorse du ligament collatéral médial','Phase 4 — Reprise (semaines 4+)','Renforcement des adducteurs, léger (genou)',1),

  -- Rupture du tendon d'Achille
  ('Rupture du tendon d''Achille','Phase 1 — Protection post-opératoire (semaines 0-2)','Pompes de cheville en amplitude protégée',0),
  ('Rupture du tendon d''Achille','Phase 1 — Protection post-opératoire (semaines 0-2)','Renforcement isométrique du mollet, léger',1),
  ('Rupture du tendon d''Achille','Phase 2 — Mobilité protégée (semaines 2-6)','Mise en charge progressive du mollet',0),
  ('Rupture du tendon d''Achille','Phase 2 — Mobilité protégée (semaines 2-6)','Pompes de cheville en amplitude protégée',1),
  ('Rupture du tendon d''Achille','Phase 3 — Renforcement (semaines 6-12)','Montée sur pointes assistée (post-Achille)',0),
  ('Rupture du tendon d''Achille','Phase 3 — Renforcement (semaines 6-12)','Mise en charge progressive du mollet',1),
  ('Rupture du tendon d''Achille','Phase 4 — Reprise fonctionnelle (semaines 12+)','Montée sur pointes assistée (post-Achille)',0),
  ('Rupture du tendon d''Achille','Phase 4 — Reprise fonctionnelle (semaines 12+)','Renforcement isométrique du mollet, léger',1),

  -- Fracture de la cheville
  ('Fracture de la cheville','Phase 1 — Protection post-opératoire (semaines 0-2)','Mobilité active de la cheville, amplitude protégée',0),
  ('Fracture de la cheville','Phase 1 — Protection post-opératoire (semaines 0-2)','Contraction musculaire sans mouvement (cheville)',1),
  ('Fracture de la cheville','Phase 2 — Mobilité protégée (semaines 2-6)','Mise en charge progressive (post-fracture cheville)',0),
  ('Fracture de la cheville','Phase 2 — Mobilité protégée (semaines 2-6)','Mobilité active de la cheville, amplitude protégée',1),
  ('Fracture de la cheville','Phase 3 — Renforcement (semaines 6-12)','Renforcement proprioceptif assis (cheville)',0),
  ('Fracture de la cheville','Phase 3 — Renforcement (semaines 6-12)','Mise en charge progressive (post-fracture cheville)',1),
  ('Fracture de la cheville','Phase 4 — Reprise fonctionnelle (semaines 12+)','Renforcement proprioceptif assis (cheville)',0),
  ('Fracture de la cheville','Phase 4 — Reprise fonctionnelle (semaines 12+)','Équilibre sur surface instable',1),

  -- Instabilité chronique de cheville
  ('Instabilité chronique de cheville','Phase 1 — Soulagement (jours 0-7)','Renforcement des péroniers, élastique',0),
  ('Instabilité chronique de cheville','Phase 1 — Soulagement (jours 0-7)','Équilibre unipodal yeux ouverts puis fermés',1),
  ('Instabilité chronique de cheville','Phase 2 — Mobilité (semaines 1-2)','Renforcement proprioceptif sur coussin',0),
  ('Instabilité chronique de cheville','Phase 2 — Mobilité (semaines 1-2)','Renforcement des péroniers, élastique',1),
  ('Instabilité chronique de cheville','Phase 3 — Renforcement (semaines 2-4)','Renforcement proprioceptif sur coussin',0),
  ('Instabilité chronique de cheville','Phase 3 — Renforcement (semaines 2-4)','Équilibre unipodal yeux ouverts puis fermés',1),
  ('Instabilité chronique de cheville','Phase 4 — Reprise (semaines 4+)','Sauts contrôlés multidirectionnels (cheville)',0),
  ('Instabilité chronique de cheville','Phase 4 — Reprise (semaines 4+)','Renforcement proprioceptif sur coussin',1),

  -- Élongation des ischio-jambiers
  ('Élongation des ischio-jambiers','Phase 1 — Protection (jours 0-7)','Étirement doux des ischio-jambiers, position allongée',0),
  ('Élongation des ischio-jambiers','Phase 1 — Protection (jours 0-7)','Renforcement isométrique des ischio-jambiers',1),
  ('Élongation des ischio-jambiers','Phase 2 — Mobilité (semaines 1-2)','Pont fessier unipodal progressif',0),
  ('Élongation des ischio-jambiers','Phase 2 — Mobilité (semaines 1-2)','Étirement doux des ischio-jambiers, position allongée',1),
  ('Élongation des ischio-jambiers','Phase 3 — Renforcement (semaines 2-4)','Pont fessier unipodal progressif',0),
  ('Élongation des ischio-jambiers','Phase 3 — Renforcement (semaines 2-4)','Marche puis course progressive (ischio-jambiers)',1),
  ('Élongation des ischio-jambiers','Phase 4 — Reprise (semaines 4+)','Marche puis course progressive (ischio-jambiers)',0),
  ('Élongation des ischio-jambiers','Phase 4 — Reprise (semaines 4+)','Pont fessier unipodal progressif',1),

  -- Élongation du mollet
  ('Élongation du mollet','Phase 1 — Protection (jours 0-7)','Étirement doux du mollet, genou tendu',0),
  ('Élongation du mollet','Phase 1 — Protection (jours 0-7)','Étirement du mollet, genou plié',1),
  ('Élongation du mollet','Phase 2 — Mobilité (semaines 1-2)','Renforcement isométrique du mollet (élongation)',0),
  ('Élongation du mollet','Phase 2 — Mobilité (semaines 1-2)','Étirement doux du mollet, genou tendu',1),
  ('Élongation du mollet','Phase 3 — Renforcement (semaines 2-4)','Renforcement isométrique du mollet (élongation)',0),
  ('Élongation du mollet','Phase 3 — Renforcement (semaines 2-4)','Marche puis trottinement progressif (mollet)',1),
  ('Élongation du mollet','Phase 4 — Reprise (semaines 4+)','Marche puis trottinement progressif (mollet)',0),

  -- Déchirure du quadriceps
  ('Déchirure du quadriceps','Phase 1 — Protection (jours 0-7)','Contraction isométrique du quadriceps, léger',0),
  ('Déchirure du quadriceps','Phase 1 — Protection (jours 0-7)','Mobilité active du genou sans résistance',1),
  ('Déchirure du quadriceps','Phase 2 — Mobilité (semaines 1-2)','Mobilité active du genou sans résistance',0),
  ('Déchirure du quadriceps','Phase 2 — Mobilité (semaines 1-2)','Contraction isométrique du quadriceps, léger',1),
  ('Déchirure du quadriceps','Phase 3 — Renforcement (semaines 2-4)','Renforcement progressif du quadriceps, chaise',0),
  ('Déchirure du quadriceps','Phase 3 — Renforcement (semaines 2-4)','Squat protégé (quadriceps)',1),
  ('Déchirure du quadriceps','Phase 4 — Reprise (semaines 4+)','Squat protégé (quadriceps)',0),
  ('Déchirure du quadriceps','Phase 4 — Reprise (semaines 4+)','Renforcement progressif du quadriceps, chaise',1),

  -- Syndrome du piriforme
  ('Syndrome du piriforme','Phase 1 — Soulagement (jours 0-7)','Étirement du piriforme assis',0),
  ('Syndrome du piriforme','Phase 1 — Soulagement (jours 0-7)','Auto-massage de la fesse à la balle',1),
  ('Syndrome du piriforme','Phase 2 — Mobilité (semaines 1-2)','Étirement du piriforme assis',0),
  ('Syndrome du piriforme','Phase 2 — Mobilité (semaines 1-2)','Renforcement du moyen fessier, coquille (piriforme)',1),
  ('Syndrome du piriforme','Phase 3 — Renforcement (semaines 2-4)','Renforcement du moyen fessier, coquille (piriforme)',0),
  ('Syndrome du piriforme','Phase 3 — Renforcement (semaines 2-4)','Auto-massage de la fesse à la balle',1),
  ('Syndrome du piriforme','Phase 4 — Reprise (semaines 4+)','Renforcement du moyen fessier, coquille (piriforme)',0),

  -- Syndrome du défilé thoracique
  ('Syndrome du défilé thoracique','Phase 1 — Soulagement (jours 0-7)','Ouverture de la cage thoracique',0),
  ('Syndrome du défilé thoracique','Phase 1 — Soulagement (jours 0-7)','Étirement des scalènes',1),
  ('Syndrome du défilé thoracique','Phase 2 — Mobilité (semaines 1-2)','Mobilité neurale du membre supérieur, douce',0),
  ('Syndrome du défilé thoracique','Phase 2 — Mobilité (semaines 1-2)','Ouverture de la cage thoracique',1),
  ('Syndrome du défilé thoracique','Phase 3 — Renforcement (semaines 2-4)','Renforcement postural des trapèzes moyens',0),
  ('Syndrome du défilé thoracique','Phase 3 — Renforcement (semaines 2-4)','Mobilité neurale du membre supérieur, douce',1),
  ('Syndrome du défilé thoracique','Phase 4 — Reprise (semaines 4+)','Renforcement postural des trapèzes moyens',0),

  -- Entorse acromio-claviculaire
  ('Entorse acromio-claviculaire','Phase 1 — Protection (jours 0-7)','Mobilité active protégée de l''épaule (AC)',0),
  ('Entorse acromio-claviculaire','Phase 1 — Protection (jours 0-7)','Renforcement isométrique de l''épaule, léger (AC)',1),
  ('Entorse acromio-claviculaire','Phase 2 — Mobilité (semaines 1-2)','Rétraction scapulaire douce (AC)',0),
  ('Entorse acromio-claviculaire','Phase 2 — Mobilité (semaines 1-2)','Mobilité active protégée de l''épaule (AC)',1),
  ('Entorse acromio-claviculaire','Phase 3 — Renforcement (semaines 2-4)','Renforcement de la coiffe en rotation, élastique',0),
  ('Entorse acromio-claviculaire','Phase 3 — Renforcement (semaines 2-4)','Rétraction scapulaire douce (AC)',1),
  ('Entorse acromio-claviculaire','Phase 4 — Reprise (semaines 4+)','Renforcement de la coiffe en rotation, élastique',0),

  -- Syndrome croisé supérieur
  ('Syndrome croisé supérieur','Phase 1 — Soulagement (jours 0-7)','Étirement des pectoraux à la porte',0),
  ('Syndrome croisé supérieur','Phase 1 — Soulagement (jours 0-7)','Étirement des fléchisseurs du cou',1),
  ('Syndrome croisé supérieur','Phase 2 — Mobilité (semaines 1-2)','Correction posturale au mur',0),
  ('Syndrome croisé supérieur','Phase 2 — Mobilité (semaines 1-2)','Étirement des pectoraux à la porte',1),
  ('Syndrome croisé supérieur','Phase 3 — Renforcement (semaines 2-4)','Renforcement des trapèzes moyens et rhomboïdes',0),
  ('Syndrome croisé supérieur','Phase 3 — Renforcement (semaines 2-4)','Correction posturale au mur',1),
  ('Syndrome croisé supérieur','Phase 4 — Reprise (semaines 4+)','Renforcement des trapèzes moyens et rhomboïdes',0),
  ('Syndrome croisé supérieur','Phase 4 — Reprise (semaines 4+)','Correction posturale au mur',1),

  -- Reconditionnement physique général
  ('Reconditionnement physique général','Phase 1 — Reprise douce (jours 0-7)','Marche progressive quotidienne',0),
  ('Reconditionnement physique général','Phase 1 — Reprise douce (jours 0-7)','Lever de chaise assisté',1),
  ('Reconditionnement physique général','Phase 2 — Progression (semaines 1-2)','Équilibre debout assisté',0),
  ('Reconditionnement physique général','Phase 2 — Progression (semaines 1-2)','Marche progressive quotidienne',1),
  ('Reconditionnement physique général','Phase 3 — Renforcement (semaines 2-4)','Renforcement global léger, position assise',0),
  ('Reconditionnement physique général','Phase 3 — Renforcement (semaines 2-4)','Lever de chaise assisté',1),
  ('Reconditionnement physique général','Phase 3 — Renforcement (semaines 2-4)','Équilibre debout assisté',2),
  ('Reconditionnement physique général','Phase 4 — Autonomie (semaines 4+)','Marche progressive quotidienne',0),
  ('Reconditionnement physique général','Phase 4 — Autonomie (semaines 4+)','Renforcement global léger, position assise',1),

  -- Périostite tibiale
  ('Périostite tibiale','Phase 1 — Protection (jours 0-7)','Étirement du mollet et du tibial antérieur',0),
  ('Périostite tibiale','Phase 1 — Protection (jours 0-7)','Renforcement du tibial antérieur',1),
  ('Périostite tibiale','Phase 2 — Mobilité (semaines 1-2)','Renforcement des mollets, montées lentes',0),
  ('Périostite tibiale','Phase 2 — Mobilité (semaines 1-2)','Étirement du mollet et du tibial antérieur',1),
  ('Périostite tibiale','Phase 3 — Renforcement (semaines 2-4)','Renforcement des mollets, montées lentes',0),
  ('Périostite tibiale','Phase 3 — Renforcement (semaines 2-4)','Renforcement du tibial antérieur',1),
  ('Périostite tibiale','Phase 4 — Reprise (semaines 4+)','Marche avant course progressive (périostite)',0),
  ('Périostite tibiale','Phase 4 — Reprise (semaines 4+)','Renforcement des mollets, montées lentes',1)
) as v(cname, wname, ename, pos)
  on v.cname = c.name and v.wname = w.name
join public.exercises e on e.name = v.ename
where not exists (
  select 1 from public.workout_exercises we where we.workout_id = w.id and we.exercise_id = e.id
);
