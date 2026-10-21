-- Physio-App — Migration 0070 : 56 nouveaux exercices de rééducation
-- Safe to re-run.
--
-- Philippe, 2026-10-21 : ajout à la bibliothèque de la plateforme des
-- exercices de docs/exercices-a-illustrer.md (P2/P3) et de ses ajouts (sauts,
-- fente marchée avec rotation, woodchop en fente, assis-debout sauté), avec
-- leurs animations (public/exercise-illustrations/<dessin>/, reliées par nom
-- dans lib/exercise/illustrationMap.ts). Généré par scripts/nouveaux-exercices.mjs.
--
-- Même méthode que 0068 : exercices de la PLATEFORME (created_by null),
-- visibles par tous les kinés et patients connectés, modifiables par
-- personne ; rangés dans leurs zones du corps (exercise_body_parts).
-- Ne modifie aucune règle d'accès (RLS), aucun patient, aucune séance, aucun
-- exercice existant. FORCE ROW LEVEL SECURITY est levé le temps des INSERT
-- puis remis, dans la transaction de scripts/migrate.mjs --only.
--
-- Contenu clinique (consignes, matériel, zones) rédigé par Claude — à faire
-- RELIRE par le kiné partenaire.

alter table public.exercises no force row level security;
alter table public.exercise_body_parts no force row level security;

insert into public.exercises (id, name, instructions, equipment, search_keywords)
select v.id, v.name, v.instructions, v.equipment, v.keywords
from (values
  ('b792cc51-3f62-5780-bd21-f4f3911724b6'::uuid, 'Ankle Circles',
   'Assis, la jambe allongée, le talon posé sur un petit support et le pied dans le vide. Dessinez lentement de grands cercles avec la pointe du pied, sans bouger la jambe, dans un sens puis dans l''autre.',
   array[]::text[], array['Cercles de cheville', 'Alphabet avec le pied', 'Mobilité de la cheville']),
  ('a5fa4492-ebc9-5244-a213-3fe319c30731'::uuid, 'Towel Toe Curl',
   'Assis, pied nu à plat sur une serviette posée au sol. En gardant le talon au sol, repliez les orteils pour attraper la serviette et la ramener vers vous, puis relâchez et recommencez.',
   array[]::text[], array['Serviette tirée avec les orteils', 'Muscles du pied', 'Voûte plantaire']),
  ('3818044b-e596-5b71-86d7-69cc8454948a'::uuid, 'Short Foot',
   'Assis ou debout, pied nu à plat. Sans replier les orteils, rapprochez l''avant du pied du talon pour creuser la voûte plantaire. Tenez quelques secondes, puis relâchez.',
   array[]::text[], array['Short foot', 'Voûte plantaire', 'Pied plat']),
  ('37379961-5e76-5d4d-957c-b68e62e6667f'::uuid, 'Seated Plantar Fascia Stretch',
   'Assis, la cheville posée sur le genou opposé. Avec la main, tirez doucement les orteils vers le tibia jusqu''à sentir l''étirement sous la plante du pied. Maintenez la position en respirant calmement.',
   array[]::text[], array['Étirement du fascia plantaire', 'Aponévrosite plantaire', 'Douleur sous le talon']),
  ('1c915681-49b6-5e93-b07e-7c862106181c'::uuid, 'Toe Pick-Up',
   'Assis, pied nu, quelques petits objets (billes, bouchons) posés au sol. Attrapez un objet avec les orteils, soulevez-le et déposez-le un peu plus loin, puis recommencez.',
   array[]::text[], array['Ramasser des objets avec les orteils', 'Muscles du pied', 'Billes']),
  ('c7a96dc5-ea6b-5f7f-962e-87d0ef9a95a0'::uuid, 'Patellar Self-Mobilization',
   'Assis, la jambe tendue et la cuisse complètement relâchée. Avec les pouces, faites glisser doucement la rotule vers le haut puis vers le bas, puis vers la droite et vers la gauche, sans douleur.',
   array[]::text[], array['Mobilisation de la rotule', 'Rotule', 'Post-opératoire genou']),
  ('16c4cded-1559-538b-bd27-497821f5e406'::uuid, 'Prone Quadriceps Stretch',
   'Allongé sur le ventre. Pliez un genou et attrapez la cheville avec la main du même côté, puis ramenez doucement le talon vers la fesse, sans cambrer le bas du dos. Maintenez la position.',
   array[]::text[], array['Étirement du quadriceps sur le ventre', 'Quadriceps', 'Souplesse du genou']),
  ('6899b93e-faa8-561e-8c55-b46f32a9d603'::uuid, 'Seated Knee Flexion (Heel Slide Under Chair)',
   'Assis sur une chaise, pied à plat. Faites glisser le pied vers l''arrière sous la chaise pour plier le genou le plus loin possible sans douleur forte, tenez un instant, puis revenez.',
   array['chaise'], array['Flexion du genou assis', 'Talon sous la chaise', 'Récupération de flexion']),
  ('671883da-a94a-520b-8222-a46872b2d351'::uuid, 'Standing Hamstring Curl',
   'Debout, les mains en appui sur un dossier de chaise. Pliez un genou pour amener le talon vers la fesse, les cuisses bien côte à côte, puis redescendez lentement.',
   array[]::text[], array['Flexion du genou debout', 'Talon-fesse', 'Ischio-jambiers']),
  ('c73b010e-701c-58c4-b44b-9266557ee276'::uuid, 'Sciatic Nerve Glide',
   'Assis au bord d''une chaise, dos droit. Tendez le genou en tirant la pointe du pied vers vous tout en levant la tête, puis pliez le genou en baissant la tête. Alternez lentement, sans forcer.',
   array['chaise'], array['Glissement neural sciatique', 'Sciatique', 'Mobilité nerveuse']),
  ('eeb7cde7-884a-519a-ba62-f942ad3b4255'::uuid, 'Spanish Squat (Single Leg)',
   'Debout sur une jambe, une sangle ou un gros élastique passé derrière le genou et fixé devant vous. Asseyez-vous vers l''arrière en pliant le genou, le tibia restant vertical, retenu par la sangle. Remontez lentement.',
   array['elastiques'], array['Squat espagnol', 'Tendinopathie rotulienne', 'Quadriceps']),
  ('3a93cfa6-1ff0-55d5-8d37-9c934c4ad0b7'::uuid, 'Lateral Jump (Two Feet)',
   'Debout, pieds joints, genoux légèrement fléchis. Sautez sur le côté en gardant les pieds ensemble, réceptionnez-vous genoux fléchis et stables, marquez une pause, puis sautez de l''autre côté.',
   array[]::text[], array['Saut latéral à deux pieds', 'Pliométrie', 'Retour au sport']),
  ('a20cb89c-49b6-5f6d-8e17-b318a54bd129'::uuid, 'Single-Leg Lateral Hop',
   'Debout sur une jambe. Sautez sur le côté sur la même jambe, réceptionnez-vous genou fléchi dans l''axe du pied et tenez la position, puis sautez de l''autre côté.',
   array[]::text[], array['Saut latéral à cloche-pied', 'Pliométrie unipodale', 'Retour au sport']),
  ('c611d220-4b1c-5365-a8cf-0e8f0bf3080c'::uuid, 'Single-Leg Forward Hop',
   'Debout sur une jambe. Pliez le genou, sautez vers l''avant et réceptionnez-vous sur la même jambe, genou fléchi dans l''axe du pied, en restant stable avant de recommencer.',
   array[]::text[], array['Saut vers l''avant à cloche-pied', 'Pliométrie unipodale', 'Retour au sport LCA']),
  ('9df5b500-3524-513f-b8eb-5df2bb6e485b'::uuid, 'Sit-to-Jump',
   'Assis au bord d''une chaise, pieds à plat. Penchez le buste en avant, levez-vous et poussez fort sur les jambes pour sauter vers le haut, puis réceptionnez-vous en douceur, genoux fléchis, devant la chaise.',
   array['chaise'], array['Assis-debout sauté', 'Puissance des jambes', 'Retour au sport']),
  ('3a0fffed-c52c-5523-aa3e-d394e6d38fd5'::uuid, 'Seated Figure-Four Stretch',
   'Assis sur une chaise, posez la cheville sur le genou opposé. En gardant le dos droit, penchez le buste vers l''avant jusqu''à sentir l''étirement dans la fesse. Maintenez la position.',
   array['chaise'], array['Étirement du piriforme', 'Figure 4', 'Fessiers', 'Sciatique']),
  ('5c75d4a5-18ff-5904-96ca-d7e267ca55b0'::uuid, 'Standing IT Band Stretch',
   'Debout, croisez une jambe derrière l''autre. Levez le bras du côté de la jambe arrière au-dessus de la tête et poussez la hanche sur le côté en penchant le buste de l''autre côté. Maintenez la position.',
   array[]::text[], array['Étirement du TFL', 'Bandelette ilio-tibiale', 'Syndrome de l''essuie-glace']),
  ('3bf4d283-1c7f-5fce-a649-82da6f3c8988'::uuid, 'Quadruped Hip Circles',
   'À quatre pattes, dos plat. Genou plié, décollez une jambe et dessinez lentement des cercles avec le genou, sans bouger le dos ni le bassin, dans un sens puis dans l''autre.',
   array[]::text[], array['Cercles de hanche à quatre pattes', 'Mobilité de hanche', 'Fessiers']),
  ('53d4dd29-afcd-5c50-9200-788db065f595'::uuid, 'Side-Lying Hip Adduction',
   'Allongé sur le côté, la jambe du dessus pliée et le pied posé devant le genou du dessous. Levez la jambe du dessous tendue de quelques centimètres, puis redescendez lentement.',
   array[]::text[], array['Adduction couché sur le côté', 'Adducteurs', 'Pubalgie']),
  ('45fde55d-25e9-57a9-a130-8f68b68d64c5'::uuid, 'Seated Hip Rotation',
   'Assis sur une chaise, genoux à 90°. Sans bouger la cuisse, faites pivoter la jambe pour amener le pied vers l''intérieur puis vers l''extérieur, lentement.',
   array['chaise'], array['Rotation de hanche assis', 'Mobilité de hanche', 'Rotateurs de hanche']),
  ('caa5155c-6524-59de-b3c9-d5f961050b98'::uuid, 'Dowel Hip Hinge',
   'Debout, un bâton tenu dans le dos, en contact avec la tête, le haut du dos et le bassin. Poussez les hanches vers l''arrière en penchant le buste, le dos droit et le bâton toujours en contact, puis revenez.',
   array['baton'], array['Hip hinge avec bâton', 'Charnière de hanche', 'Posture du dos']),
  ('b09f3cfb-9e21-56f2-9a77-14c5970afa4d'::uuid, 'Prone Straight-Leg Hip Extension',
   'Allongé sur le ventre, front posé sur les mains. Serrez les fessiers et levez une jambe tendue de quelques centimètres, sans cambrer le bas du dos, puis redescendez lentement.',
   array[]::text[], array['Extension de hanche sur le ventre', 'Fessiers', 'Lombalgie']),
  ('379a38b9-a4ec-529a-a3ea-741d93ee0612'::uuid, 'Walking Lunge with Trunk Rotation',
   'Debout, mains jointes devant la poitrine. Faites un grand pas en avant en fente, genoux pliés à 90°. En gardant la fente immobile et contrôlée, tournez lentement le buste vers la jambe avant, revenez, puis avancez l''autre jambe.',
   array[]::text[], array['Fente marchée avec rotation', 'Stabilité', 'Fessiers']),
  ('e7272996-ec1a-507b-878c-ba9b2941b475'::uuid, 'Thread the Needle',
   'À quatre pattes. Ouvrez un bras vers le plafond en tournant le buste, puis faites passer ce bras sous la poitrine de l''autre côté jusqu''à poser l''épaule au sol. Revenez lentement.',
   array[]::text[], array['Rotation thoracique à quatre pattes', 'Mobilité du dos', 'Thoracique']),
  ('a5460e84-e7ee-5e6d-9a67-4eb1cc15bb3a'::uuid, 'Standing Side Bend Stretch',
   'Debout, pieds écartés. Levez un bras au-dessus de la tête et penchez le buste du côté opposé, sans tourner le bassin, jusqu''à sentir l''étirement sur le côté. Maintenez la position.',
   array[]::text[], array['Inclinaison latérale debout', 'Carré des lombes', 'Étirement du flanc']),
  ('97ed9dd7-82d6-5886-8742-0f6718080ebf'::uuid, 'Thoracic Extension Over Chair',
   'Assis sur une chaise à dossier, mains derrière la tête. Penchez le haut du dos en arrière par-dessus le dossier, coudes vers le plafond, sans cambrer le bas du dos. Revenez lentement.',
   array['chaise'], array['Extension thoracique sur chaise', 'Dos voûté', 'Posture']),
  ('cd73d271-5aa0-5c38-a141-f605429386ea'::uuid, 'Active Cervical Rotation',
   'Assis bien droit. Tournez lentement la tête d''un côté le plus loin possible sans douleur, en gardant les épaules immobiles, revenez au centre, puis tournez de l''autre côté.',
   array[]::text[], array['Rotation du cou', 'Mobilité cervicale', 'Cervicalgie']),
  ('dcbdf383-e083-5aee-a73b-887e33aadcf8'::uuid, 'Active Cervical Side Bend',
   'Assis bien droit, épaules basses. Penchez lentement la tête pour amener l''oreille vers l''épaule, sans lever l''épaule, revenez au centre, puis penchez de l''autre côté.',
   array[]::text[], array['Inclinaison latérale du cou', 'Mobilité cervicale', 'Cervicalgie']),
  ('cd1824a8-780b-554d-ad77-fa6366858fcc'::uuid, 'Active Cervical Flexion-Extension',
   'Assis bien droit. Baissez lentement la tête pour amener le menton vers la poitrine, puis relevez-la doucement pour regarder vers le haut, sans forcer.',
   array[]::text[], array['Flexion-extension du cou', 'Mobilité cervicale', 'Cervicalgie']),
  ('838a5b0a-789b-5c25-99a9-8d39b32ce7bd'::uuid, 'Upper Trapezius Stretch',
   'Assis, une main tenant le bord de la chaise. Penchez la tête du côté opposé et posez l''autre main sur la tête pour accentuer doucement l''étirement. Maintenez la position.',
   array['chaise'], array['Étirement du trapèze supérieur', 'Tension dans la nuque', 'Cervicalgie']),
  ('f781b2c8-f45b-5c61-943b-0337a7d1764b'::uuid, 'Levator Scapulae Stretch',
   'Assis, une main tenant le bord de la chaise. Tournez la tête de 45° de l''autre côté et baissez-la comme pour regarder votre aisselle, l''autre main posée sur la tête aidant doucement. Maintenez la position.',
   array['chaise'], array['Étirement de l''élévateur de la scapula', 'Raideur du cou', 'Cervicalgie']),
  ('1178a2bd-ed98-5bc7-99da-122aa88f6084'::uuid, 'Scalene Stretch',
   'Assis bien droit, une main posée à plat sur la clavicule opposée. Penchez la tête du côté opposé et légèrement en arrière, jusqu''à sentir l''étirement sur le côté du cou. Maintenez la position.',
   array[]::text[], array['Étirement des scalènes', 'Côté du cou', 'Cervicalgie']),
  ('3a8f1de5-e746-5d2a-b1d4-7273852222a3'::uuid, 'Supine Chin Nod',
   'Allongé sur le dos, la tête posée. Faites un petit « oui » de la tête en rentrant doucement le menton vers la gorge, l''arrière de la tête restant au sol. Tenez quelques secondes, puis relâchez.',
   array[]::text[], array['Rentrer le menton allongé', 'Fléchisseurs profonds du cou', 'Cervicalgie']),
  ('510fea37-eaa7-5bd6-aa4a-01ccbb61ab56'::uuid, 'Cervical Retraction-Extension',
   'Assis bien droit. Rentrez d''abord le menton en reculant la tête (double menton), puis, depuis cette position, basculez doucement la tête en arrière pour regarder le plafond. Revenez lentement.',
   array[]::text[], array['Rétraction puis extension cervicale', 'McKenzie cou', 'Cervicalgie']),
  ('5c171ee7-0de8-555d-8fb0-c62eeae21be1'::uuid, 'External Rotation at 90° Abduction (Band)',
   'Debout, bras levé sur le côté à hauteur d''épaule, coude plié à 90°, élastique fixé devant vous. Faites pivoter l''avant-bras vers le haut jusqu''à la verticale, sans baisser le coude, puis revenez lentement.',
   array['elastiques'], array['Rotation externe à 90°', 'Coiffe des rotateurs', 'Sport de lancer']),
  ('c25a7004-4c77-5496-a197-f862f335a733'::uuid, 'Side-Lying External Rotation',
   'Allongé sur le côté, une serviette roulée sous le coude du dessus, coude plié à 90° et collé au corps, un haltère léger en main. Faites pivoter l''avant-bras vers le plafond sans décoller le coude, puis redescendez lentement.',
   array['halteres'], array['Rotation externe couché sur le côté', 'Coiffe des rotateurs', 'Infra-épineux']),
  ('aac3163b-aafb-5d3b-acca-bde9da439370'::uuid, 'Wall Slides',
   'Debout face à un mur, avant-bras posés contre le mur. Faites glisser les avant-bras vers le haut le plus loin possible sans douleur, en gardant les épaules basses, puis redescendez.',
   array[]::text[], array['Glissés au mur', 'Mobilité de l''épaule', 'Omoplates']),
  ('befdcbd8-d18e-5d71-aaf2-0a26db5e04e6'::uuid, 'Sleeper Stretch',
   'Allongé sur le côté, le bras du dessous devant vous, coude plié à 90°. Avec l''autre main, poussez doucement l''avant-bras vers le sol devant vous, sans forcer. Maintenez la position.',
   array[]::text[], array['Sleeper stretch', 'Rotation interne de l''épaule', 'Capsule postérieure']),
  ('c50d477c-f9d5-5da9-a159-95631a78aa13'::uuid, 'Shoulder Isometrics Against Wall',
   'Debout à côté d''un mur, coude plié à 90° contre le corps, une serviette pliée entre le poignet et le mur. Appuyez le poignet contre le mur sans bouger le bras. Tenez quelques secondes, puis relâchez. Changez de direction.',
   array[]::text[], array['Isométriques d''épaule', 'Renforcement sans mouvement', 'Épaule douloureuse']),
  ('c0e94257-2710-5ebc-9be8-b16ec71d5081'::uuid, 'Towel Internal Rotation Stretch',
   'Debout, une serviette tenue derrière le dos, une main en haut au-dessus de l''épaule et l''autre en bas. Tirez doucement la serviette vers le haut avec la main du haut pour faire remonter la main du bas dans le dos.',
   array[]::text[], array['Serviette dans le dos', 'Rotation interne de l''épaule', 'Raideur de l''épaule']),
  ('b8f5c23c-5c39-5dfe-8752-009fda3e1f73'::uuid, 'Shoulder Pulley',
   'Assis sous une poulie fixée en hauteur (porte), une poignée dans chaque main. Tirez vers le bas avec le bras sain pour faire monter doucement le bras opéré au-dessus de la tête, puis redescendez lentement.',
   array['chaise'], array['Auto-mobilisation à la poulie', 'Mobilité de l''épaule', 'Post-opératoire épaule']),
  ('8d09a394-a22e-5b67-a7cd-1e620922d061'::uuid, 'Pronation-Supination with Dumbbell',
   'Assis, l''avant-bras posé sur une table, la main dépassant du bord et tenant un haltère léger par le milieu. Tournez lentement la paume vers le haut puis vers le bas, sans bouger le coude.',
   array['halteres'], array['Pronation supination', 'Rotation de l''avant-bras', 'Coude']),
  ('7dd80273-46d3-5bb2-8ead-96518e18cabe'::uuid, 'Wrist Flexor and Extensor Stretch',
   'Debout, bras tendu devant vous. Avec l''autre main, tirez doucement les doigts vers vous, paume vers l''avant, puis faites de même paume vers le bas pour étirer le dessus de l''avant-bras. Maintenez chaque position.',
   array[]::text[], array['Étirement des fléchisseurs du poignet', 'Épicondylite', 'Avant-bras']),
  ('76f86bd5-e00d-5a21-8755-c6a6416e6fb3'::uuid, 'Finger Tendon Glides',
   'Main ouverte, doigts tendus. Enchaînez lentement : doigts pliés en crochet, poing fermé, doigts à plat pliés à la base, puis poing complet, et revenez main ouverte.',
   array[]::text[], array['Glissements tendineux des doigts', 'Mobilité des doigts', 'Canal carpien']),
  ('9f57a7f8-6e53-5171-84ff-c49fb3bebc0b'::uuid, 'Foam Ball Squeeze',
   'Une balle en mousse dans la main. Serrez la balle le plus fort possible sans douleur, tenez quelques secondes, puis relâchez doucement.',
   array['ballon'], array['Préhension balle mousse', 'Force de la main', 'Poignet']),
  ('ec2ce81a-6353-5fba-ba2b-208e78c90480'::uuid, 'Thumb Opposition',
   'Main ouverte. Touchez successivement le bout de chaque doigt avec le bout du pouce, de l''index jusqu''à l''auriculaire, en formant un rond, puis rouvrez la main.',
   array[]::text[], array['Opposition du pouce', 'Mobilité du pouce', 'Rhizarthrose']),
  ('2ae80762-61ca-537a-9297-469bcdc14a36'::uuid, 'Finger Extension with Band',
   'Un petit élastique passé autour des cinq doigts rassemblés. Écartez les doigts au maximum contre l''élastique, puis refermez lentement.',
   array['elastiques'], array['Ouverture des doigts avec élastique', 'Extenseurs des doigts', 'Épicondylite']),
  ('8ae688bf-c38d-58ad-b638-bb14901c6c2d'::uuid, 'Wrist Radial-Ulnar Deviation',
   'L''avant-bras posé sur une table, paume vers le bas, la main dépassant du bord et tenant un haltère léger. Inclinez la main vers le pouce puis vers l''auriculaire, sans bouger l''avant-bras.',
   array['halteres'], array['Inclinaison latérale du poignet', 'Déviation radiale et ulnaire', 'Poignet']),
  ('6843d758-f8a3-5f3f-9d46-3f9e4200b303'::uuid, 'Lunge Band Woodchop',
   'En fente fixe, genoux pliés, élastique fixé en hauteur sur le côté et tenu à deux mains. En gardant la fente immobile et le ventre gainé, tirez l''élastique en diagonale vers la hanche opposée en tournant le buste, puis revenez lentement.',
   array['elastiques'], array['Woodchop à l''élastique en fente', 'Rotation du tronc', 'Gainage']),
  ('ce6069a8-41ab-52ed-b711-af0d3d761348'::uuid, 'Tandem Walk',
   'Marchez en ligne droite en posant à chaque pas le talon juste devant les orteils de l''autre pied, bras écartés pour l''équilibre, regard droit devant.',
   array[]::text[], array['Marche tandem', 'Talon-pointe', 'Prévention des chutes']),
  ('97dcf98c-d0f5-597b-9f46-c12c06379880'::uuid, 'Heel and Toe Walk',
   'Marchez quelques pas sur les talons, pointes de pied relevées, puis quelques pas sur la pointe des pieds, talons décollés, en gardant le buste droit.',
   array[]::text[], array['Marche sur les talons', 'Marche sur les pointes', 'Équilibre']),
  ('3935f53c-c6f0-5505-9399-8edb18d152a1'::uuid, 'Lateral Weight Shift',
   'Debout, pieds écartés largeur du bassin, mains sur les hanches. Transférez lentement le poids du corps sur une jambe, puis sur l''autre, sans décoller les pieds.',
   array[]::text[], array['Transfert de poids latéral', 'Équilibre', 'Prévention des chutes']),
  ('0a5891e0-a478-5c95-ad46-3a0c2b4ae31d'::uuid, 'Obstacle Step-Over',
   'Debout devant un petit obstacle (marche basse, boîte). Levez le genou et enjambez l''obstacle en posant le pied de l''autre côté, puis ramenez l''autre jambe, sans vous précipiter.',
   array[]::text[], array['Franchissement d''obstacle', 'Prévention des chutes', 'Équilibre']),
  ('6ba2efe9-64d4-56a0-a646-023802867a9c'::uuid, 'Floor to Stand',
   'À genoux à côté d''une chaise stable, mains sur l''assise. Avancez un pied pour vous mettre en chevalier servant, puis poussez sur la jambe avant et sur la chaise pour vous relever.',
   array['chaise'], array['Se relever du sol', 'Relevé du sol', 'Prévention des chutes']),
  ('56a9f6ae-b7ee-5da7-82a3-ccfb3bf3a1f9'::uuid, 'Diaphragmatic Breathing',
   'Allongé sur le dos, genoux fléchis, une main sur la poitrine et l''autre sur le ventre. Inspirez lentement par le nez en gonflant le ventre, la main sur la poitrine restant immobile, puis expirez doucement.',
   array[]::text[], array['Respiration diaphragmatique', 'Respiration abdominale', 'Relaxation']),
  ('b9c47cf1-cdf7-57c9-86b8-0b8b6ff6d21e'::uuid, 'Pursed-Lip Breathing',
   'Assis, détendu. Inspirez par le nez sur deux temps, puis expirez lentement par la bouche, lèvres pincées comme pour souffler une bougie, sur quatre temps.',
   array[]::text[], array['Respiration à lèvres pincées', 'Essoufflement', 'Respiration'])
) as v(id, name, instructions, equipment, keywords)
where not exists (select 1 from public.exercises e where e.id = v.id or e.name = v.name);

insert into public.exercise_body_parts (exercise_id, body_part_id)
select v.id, bp.id
from (values
  ('b792cc51-3f62-5780-bd21-f4f3911724b6'::uuid, 'cheville-pied'), -- Ankle Circles
  ('a5fa4492-ebc9-5244-a213-3fe319c30731'::uuid, 'cheville-pied'), -- Towel Toe Curl
  ('3818044b-e596-5b71-86d7-69cc8454948a'::uuid, 'cheville-pied'), -- Short Foot
  ('37379961-5e76-5d4d-957c-b68e62e6667f'::uuid, 'cheville-pied'), -- Seated Plantar Fascia Stretch
  ('1c915681-49b6-5e93-b07e-7c862106181c'::uuid, 'cheville-pied'), -- Toe Pick-Up
  ('c7a96dc5-ea6b-5f7f-962e-87d0ef9a95a0'::uuid, 'genou-jambe'), -- Patellar Self-Mobilization
  ('16c4cded-1559-538b-bd27-497821f5e406'::uuid, 'genou-jambe'), -- Prone Quadriceps Stretch
  ('6899b93e-faa8-561e-8c55-b46f32a9d603'::uuid, 'genou-jambe'), -- Seated Knee Flexion (Heel Slide Under Chair)
  ('671883da-a94a-520b-8222-a46872b2d351'::uuid, 'genou-jambe'), -- Standing Hamstring Curl
  ('c73b010e-701c-58c4-b44b-9266557ee276'::uuid, 'genou-jambe'), -- Sciatic Nerve Glide
  ('c73b010e-701c-58c4-b44b-9266557ee276'::uuid, 'dos-lombaires'),
  ('eeb7cde7-884a-519a-ba62-f942ad3b4255'::uuid, 'genou-jambe'), -- Spanish Squat (Single Leg)
  ('3a93cfa6-1ff0-55d5-8d37-9c934c4ad0b7'::uuid, 'genou-jambe'), -- Lateral Jump (Two Feet)
  ('3a93cfa6-1ff0-55d5-8d37-9c934c4ad0b7'::uuid, 'equilibre-general'),
  ('a20cb89c-49b6-5f6d-8e17-b318a54bd129'::uuid, 'genou-jambe'), -- Single-Leg Lateral Hop
  ('a20cb89c-49b6-5f6d-8e17-b318a54bd129'::uuid, 'equilibre-general'),
  ('c611d220-4b1c-5365-a8cf-0e8f0bf3080c'::uuid, 'genou-jambe'), -- Single-Leg Forward Hop
  ('c611d220-4b1c-5365-a8cf-0e8f0bf3080c'::uuid, 'equilibre-general'),
  ('9df5b500-3524-513f-b8eb-5df2bb6e485b'::uuid, 'genou-jambe'), -- Sit-to-Jump
  ('9df5b500-3524-513f-b8eb-5df2bb6e485b'::uuid, 'hanche-fessiers'),
  ('3a0fffed-c52c-5523-aa3e-d394e6d38fd5'::uuid, 'hanche-fessiers'), -- Seated Figure-Four Stretch
  ('5c75d4a5-18ff-5904-96ca-d7e267ca55b0'::uuid, 'hanche-fessiers'), -- Standing IT Band Stretch
  ('3bf4d283-1c7f-5fce-a649-82da6f3c8988'::uuid, 'hanche-fessiers'), -- Quadruped Hip Circles
  ('53d4dd29-afcd-5c50-9200-788db065f595'::uuid, 'hanche-fessiers'), -- Side-Lying Hip Adduction
  ('45fde55d-25e9-57a9-a130-8f68b68d64c5'::uuid, 'hanche-fessiers'), -- Seated Hip Rotation
  ('caa5155c-6524-59de-b3c9-d5f961050b98'::uuid, 'hanche-fessiers'), -- Dowel Hip Hinge
  ('caa5155c-6524-59de-b3c9-d5f961050b98'::uuid, 'dos-lombaires'),
  ('b09f3cfb-9e21-56f2-9a77-14c5970afa4d'::uuid, 'hanche-fessiers'), -- Prone Straight-Leg Hip Extension
  ('379a38b9-a4ec-529a-a3ea-741d93ee0612'::uuid, 'hanche-fessiers'), -- Walking Lunge with Trunk Rotation
  ('379a38b9-a4ec-529a-a3ea-741d93ee0612'::uuid, 'tronc-gainage-abdos'),
  ('379a38b9-a4ec-529a-a3ea-741d93ee0612'::uuid, 'equilibre-general'),
  ('e7272996-ec1a-507b-878c-ba9b2941b475'::uuid, 'dos-lombaires'), -- Thread the Needle
  ('a5460e84-e7ee-5e6d-9a67-4eb1cc15bb3a'::uuid, 'dos-lombaires'), -- Standing Side Bend Stretch
  ('97ed9dd7-82d6-5886-8742-0f6718080ebf'::uuid, 'dos-lombaires'), -- Thoracic Extension Over Chair
  ('cd73d271-5aa0-5c38-a141-f605429386ea'::uuid, 'cervicales-cou'), -- Active Cervical Rotation
  ('dcbdf383-e083-5aee-a73b-887e33aadcf8'::uuid, 'cervicales-cou'), -- Active Cervical Side Bend
  ('cd1824a8-780b-554d-ad77-fa6366858fcc'::uuid, 'cervicales-cou'), -- Active Cervical Flexion-Extension
  ('838a5b0a-789b-5c25-99a9-8d39b32ce7bd'::uuid, 'cervicales-cou'), -- Upper Trapezius Stretch
  ('f781b2c8-f45b-5c61-943b-0337a7d1764b'::uuid, 'cervicales-cou'), -- Levator Scapulae Stretch
  ('1178a2bd-ed98-5bc7-99da-122aa88f6084'::uuid, 'cervicales-cou'), -- Scalene Stretch
  ('3a8f1de5-e746-5d2a-b1d4-7273852222a3'::uuid, 'cervicales-cou'), -- Supine Chin Nod
  ('510fea37-eaa7-5bd6-aa4a-01ccbb61ab56'::uuid, 'cervicales-cou'), -- Cervical Retraction-Extension
  ('5c171ee7-0de8-555d-8fb0-c62eeae21be1'::uuid, 'epaule'), -- External Rotation at 90° Abduction (Band)
  ('c25a7004-4c77-5496-a197-f862f335a733'::uuid, 'epaule'), -- Side-Lying External Rotation
  ('aac3163b-aafb-5d3b-acca-bde9da439370'::uuid, 'epaule'), -- Wall Slides
  ('befdcbd8-d18e-5d71-aaf2-0a26db5e04e6'::uuid, 'epaule'), -- Sleeper Stretch
  ('c50d477c-f9d5-5da9-a159-95631a78aa13'::uuid, 'epaule'), -- Shoulder Isometrics Against Wall
  ('c0e94257-2710-5ebc-9be8-b16ec71d5081'::uuid, 'epaule'), -- Towel Internal Rotation Stretch
  ('b8f5c23c-5c39-5dfe-8752-009fda3e1f73'::uuid, 'epaule'), -- Shoulder Pulley
  ('8d09a394-a22e-5b67-a7cd-1e620922d061'::uuid, 'poignet-main-coude'), -- Pronation-Supination with Dumbbell
  ('7dd80273-46d3-5bb2-8ead-96518e18cabe'::uuid, 'poignet-main-coude'), -- Wrist Flexor and Extensor Stretch
  ('76f86bd5-e00d-5a21-8755-c6a6416e6fb3'::uuid, 'poignet-main-coude'), -- Finger Tendon Glides
  ('9f57a7f8-6e53-5171-84ff-c49fb3bebc0b'::uuid, 'poignet-main-coude'), -- Foam Ball Squeeze
  ('ec2ce81a-6353-5fba-ba2b-208e78c90480'::uuid, 'poignet-main-coude'), -- Thumb Opposition
  ('2ae80762-61ca-537a-9297-469bcdc14a36'::uuid, 'poignet-main-coude'), -- Finger Extension with Band
  ('8ae688bf-c38d-58ad-b638-bb14901c6c2d'::uuid, 'poignet-main-coude'), -- Wrist Radial-Ulnar Deviation
  ('6843d758-f8a3-5f3f-9d46-3f9e4200b303'::uuid, 'tronc-gainage-abdos'), -- Lunge Band Woodchop
  ('6843d758-f8a3-5f3f-9d46-3f9e4200b303'::uuid, 'hanche-fessiers'),
  ('ce6069a8-41ab-52ed-b711-af0d3d761348'::uuid, 'equilibre-general'), -- Tandem Walk
  ('97dcf98c-d0f5-597b-9f46-c12c06379880'::uuid, 'equilibre-general'), -- Heel and Toe Walk
  ('97dcf98c-d0f5-597b-9f46-c12c06379880'::uuid, 'cheville-pied'),
  ('3935f53c-c6f0-5505-9399-8edb18d152a1'::uuid, 'equilibre-general'), -- Lateral Weight Shift
  ('0a5891e0-a478-5c95-ad46-3a0c2b4ae31d'::uuid, 'equilibre-general'), -- Obstacle Step-Over
  ('6ba2efe9-64d4-56a0-a646-023802867a9c'::uuid, 'equilibre-general'), -- Floor to Stand
  ('56a9f6ae-b7ee-5da7-82a3-ccfb3bf3a1f9'::uuid, 'equilibre-general'), -- Diaphragmatic Breathing
  ('b9c47cf1-cdf7-57c9-86b8-0b8b6ff6d21e'::uuid, 'equilibre-general') -- Pursed-Lip Breathing
) as v(id, slug)
join public.body_parts bp on bp.slug = v.slug
join public.exercises e on e.id = v.id
on conflict (exercise_id, body_part_id) do nothing;

alter table public.exercise_body_parts force row level security;
alter table public.exercises force row level security;
