-- Physio-App — Migration 0068 : 24 exercices de rééducation « incontournables »
-- Safe to re-run.
--
-- Philippe, 2026-10-16 : ajout à la bibliothèque de la plateforme des 24
-- exercices P1 de docs/exercices-a-illustrer.md (quad set, glissé du talon,
-- rotations d'épaule à l'élastique, rétraction cervicale, assis-debout…),
-- avec leurs dessins (public/exercise-illustrations/<slug>/, reliés par nom
-- dans lib/exercise/illustrationMap.ts).
--
-- Ce que fait cette migration
--   1. Ajoute 24 exercices de la PLATEFORME (created_by null) : visibles par
--      tous les kinés et patients connectés (règle de lecture de 0067),
--      modifiables par personne via l'appli — comme les 361 existants.
--      Nom en anglais (convention de la banque, cf. 0042), consignes en
--      français, mots-clés de recherche en français (cf. 0043), matériel
--      indispensable (cf. 0065 ; « ballon » et « baton » sont deux nouveaux
--      identifiants de lib/exercise/equipment.ts).
--   2. Range chaque exercice dans sa ou ses zones du corps (exercise_body_parts,
--      0032) — dont les deux premiers exercices de la zone « Cervicales & cou ».
--
-- Ce qu'elle ne fait PAS : elle ne modifie aucune règle d'accès (RLS), aucun
-- patient, aucune séance, aucun exercice existant.
--
-- Pourquoi « no force row level security » : sur Scalingo toutes les tables
-- sont en FORCE ROW LEVEL SECURITY (0058), et la règle d'ajout d'un exercice
-- exige que son auteur soit le kiné connecté — un exercice de la plateforme
-- (sans auteur) ne peut donc être ajouté par personne. On lève FORCE sur ces
-- deux tables le temps des INSERT puis on le remet, dans la transaction du
-- script de migration (même méthode que 0060 et 0065) : ALTER TABLE verrouille
-- les tables jusqu'au commit, personne ne les voit sans protection, et en cas
-- d'erreur tout est annulé. À exécuter dans une transaction
-- (scripts/migrate.mjs --only le fait).
--
-- Contenu clinique (consignes, matériel, zones) rédigé par Claude — à faire
-- RELIRE par le kiné partenaire, comme le reste de la bibliothèque. Dessins
-- générés avec Gemini en reprenant le style des dessins existants.

alter table public.exercises no force row level security;
alter table public.exercise_body_parts no force row level security;

insert into public.exercises (id, name, instructions, equipment, search_keywords)
select v.id, v.name, v.instructions, v.equipment, v.keywords
from (values
  ('e1630e91-d57f-46c0-8219-6033c342c711'::uuid, 'Quad Set',
   'Allongé sur le dos, jambes tendues et posées au sol. Sans bouger la jambe, contractez fort le muscle de la cuisse en écrasant l''arrière du genou vers le sol et en tirant les orteils vers vous. Tenez la contraction quelques secondes, puis relâchez.',
   array[]::text[], array['Contraction isométrique du quadriceps', 'Quadriceps isométrique', 'Verrouillage du genou']),
  ('95fae702-af56-4320-82f1-5345e225ebbf'::uuid, 'Heel Slide',
   'Allongé sur le dos, jambes tendues. Faites glisser lentement le talon sur le sol vers les fesses en pliant le genou aussi loin que possible sans douleur forte, puis refaites glisser le talon pour tendre à nouveau la jambe.',
   array[]::text[], array['Glissé du talon', 'Flexion du genou allongé', 'Récupération de flexion']),
  ('67aa5f57-3edb-4467-95fb-c0e3b5e2150c'::uuid, 'Straight Leg Raise',
   'Allongé sur le dos, appuyé sur les avant-bras, l''autre jambe allongée au sol. Contractez la cuisse pour verrouiller le genou, puis levez la jambe tendue jusqu''à environ 45°, sans plier le genou. Redescendez lentement.',
   array[]::text[], array['Élévation jambe tendue', 'Lever de jambe tendue', 'SLR']),
  ('4654e8cc-e3fa-4d96-a84a-9a7eede18d36'::uuid, 'Terminal Knee Extension (Band)',
   'Debout, un pied devant l''autre, élastique passé derrière le genou avant et fixé devant vous à hauteur du genou. Partez genou légèrement plié, tiré vers l''avant par l''élastique, puis tendez complètement le genou en poussant vers l''arrière contre l''élastique. Revenez lentement.',
   array['elastiques'], array['Extension terminale du genou', 'TKE', 'Verrouillage du genou à l''élastique']),
  ('7cbbb240-8f48-4c73-a3cf-2ebe975c4b8e'::uuid, 'Passive Knee Extension (Heel Prop)',
   'Assis au sol, le talon de la jambe à travailler posé sur une serviette roulée, le genou dans le vide. Laissez le genou descendre vers le sol en relâchant la cuisse, puis appuyez doucement avec les mains juste au-dessus du genou pour gagner en extension. Maintenez la position.',
   array[]::text[], array['Extension passive du genou', 'Talon surélevé', 'Récupération de l''extension']),
  ('67614fc4-b710-4de1-ae63-d00bc50adb4f'::uuid, 'Ankle Dorsiflexion (Band)',
   'Assis au sol, jambes tendues, élastique passé sur le dessus du pied et fixé devant vous. Tirez la pointe du pied vers vous contre l''élastique, le plus loin possible, puis revenez lentement.',
   array['elastiques'], array['Flexion dorsale de cheville à l''élastique', 'Releveurs du pied', 'Entorse de cheville']),
  ('b09eb00c-13d1-468c-bb7e-e27ea0cca758'::uuid, 'Ankle Plantar Flexion (Band)',
   'Assis au sol, jambes tendues, élastique passé sous l''avant du pied et tenu des deux mains. Poussez la pointe du pied vers l''avant contre l''élastique, comme pour appuyer sur une pédale, puis revenez lentement.',
   array['elastiques'], array['Flexion plantaire à l''élastique', 'Mollet à l''élastique', 'Tendon d''Achille']),
  ('c412db52-fedc-4b91-9598-c962aa094e17'::uuid, 'Ankle Inversion (Band)',
   'Assis sur une chaise, talon au sol, élastique passé autour de l''avant du pied et fixé du côté extérieur. Tournez la plante du pied vers l''intérieur contre l''élastique, sans bouger le genou, puis revenez lentement.',
   array['elastiques'], array['Inversion de cheville à l''élastique', 'Entorse de cheville', 'Tibial postérieur']),
  ('1bd35d46-a33b-4bf4-8add-ad4c8c349148'::uuid, 'Ankle Eversion (Band)',
   'Assis sur une chaise, talon au sol, élastique passé autour de l''avant du pied et fixé du côté intérieur. Tournez la plante du pied vers l''extérieur contre l''élastique, sans bouger le genou, puis revenez lentement.',
   array['elastiques'], array['Éversion de cheville à l''élastique', 'Péroniers', 'Entorse latérale de cheville']),
  ('147e92d8-f7ff-40f4-a852-68ff193139d2'::uuid, 'Knee-to-Wall Ankle Mobilization',
   'Debout face à un mur, mains au mur, le pied avant à une main du mur. Avancez le genou jusqu''à toucher le mur sans décoller le talon. Si c''est facile, reculez un peu le pied. Revenez et recommencez.',
   array[]::text[], array['Genou au mur', 'Mobilisation de la cheville', 'Flexion dorsale en charge']),
  ('abb5dbad-95ae-44a1-9d01-db7d2d709375'::uuid, 'Single-Leg Stance',
   'Debout, mains sur les hanches. Levez un pied et tenez l''équilibre sur l''autre jambe, genou légèrement déverrouillé, bassin horizontal. Pour progresser : genou levé à hauteur de hanche, yeux fermés, ou debout sur un coussin.',
   array[]::text[], array['Appui unipodal', 'Équilibre sur une jambe', 'Proprioception']),
  ('7712b0fc-9b02-487b-8977-f48ee12a0c5e'::uuid, 'Y-Balance Reach',
   'En équilibre sur une jambe, mains sur les hanches. Pliez le genou d''appui et allez toucher le sol le plus loin possible devant vous avec la pointe de l''autre pied, sans vous y appuyer, puis revenez. Recommencez en arrière, en diagonale.',
   array[]::text[], array['Y-balance', 'Star excursion', 'Atteinte en équilibre unipodal', 'Retour au sport']),
  ('c7c64ead-58bb-4cd1-94bd-6942df9e8eb2'::uuid, 'Hop and Stick',
   'Debout sur une jambe, faites un petit saut vers l''avant et réceptionnez-vous sur la même jambe en tenant la position : genou fléchi dans l''axe du pied, hanches en arrière, buste légèrement penché. Restez stable avant de recommencer.',
   array[]::text[], array['Réception unipodale stabilisée', 'Saut et réception', 'Retour au sport LCA']),
  ('55714cf7-61af-48ed-9758-e638038de5e0'::uuid, 'Band Shoulder External Rotation',
   'Debout, élastique fixé à hauteur de taille du côté opposé au bras qui travaille, coude plié à 90° et collé au corps (une serviette roulée entre le coude et les côtes aide). Partez avant-bras devant le ventre, puis tournez l''avant-bras vers l''extérieur sans décoller le coude. Revenez lentement.',
   array['elastiques'], array['Rotation externe à l''élastique', 'Coiffe des rotateurs', 'Infra-épineux']),
  ('46082033-b66f-4086-9f32-d9b95d70b7fa'::uuid, 'Band Shoulder Internal Rotation',
   'Debout, élastique fixé à hauteur de taille du côté du bras qui travaille, coude plié à 90° et collé au corps (une serviette roulée entre le coude et les côtes aide). Partez avant-bras tourné vers l''extérieur, puis ramenez la main devant le ventre sans décoller le coude. Revenez lentement.',
   array['elastiques'], array['Rotation interne à l''élastique', 'Coiffe des rotateurs', 'Sous-scapulaire']),
  ('202321af-b592-46c2-83ce-35eb3ce6f911'::uuid, 'Codman Pendulum',
   'Penché en avant, une main en appui sur une table, l''autre bras pendant complètement relâché. Sans contracter l''épaule, faites de petits balancements d''avant en arrière puis de petits cercles en bougeant le corps, le bras suit comme un pendule.',
   array[]::text[], array['Pendulaire de Codman', 'Pendule', 'Épaule douloureuse', 'Post-opératoire épaule']),
  ('2cb436c0-639c-4662-8d31-ab34f674c31d'::uuid, 'Supine Stick Shoulder Flexion',
   'Allongé sur le dos, genoux fléchis, un bâton tenu à deux mains, écartement des épaules, coudes tendus. Montez lentement le bâton au-dessus de la poitrine puis au-dessus de la tête aussi loin que possible sans douleur forte, le bras sain aidant l''autre. Redescendez lentement.',
   array['baton'], array['Élévation antérieure allongé avec bâton', 'Flexion d''épaule assistée', 'Mobilité épaule post-op']),
  ('c5d3d449-9f40-48f0-87f7-4a59abf4df97'::uuid, 'Chin Tuck',
   'Assis bien droit, regard à l''horizontale. Rentrez le menton en reculant la tête tout droit vers l''arrière, comme pour faire un double menton, sans pencher la tête vers le bas. Tenez quelques secondes, puis relâchez.',
   array[]::text[], array['Rétraction cervicale', 'Double menton', 'Cervicalgie', 'Posture du cou']),
  ('1e303f7d-b334-4b96-bcfb-7bb7f1b39f03'::uuid, 'Cervical Isometrics',
   'Assis bien droit, tête immobile. Poussez doucement la tête contre votre main sans la laisser bouger : main sur le front, puis sur le côté de la tête, puis les deux mains derrière la tête. Tenez quelques secondes dans chaque direction, sans forcer.',
   array[]::text[], array['Isométriques cervicaux', 'Renforcement du cou', 'Cervicalgie']),
  ('8b7a27a2-e2de-4924-877f-10d5a6483092'::uuid, 'Prone Press-Up (McKenzie)',
   'Allongé sur le ventre, mains sous les épaules. Montez d''abord sur les avant-bras, puis tendez les bras pour soulever le buste, en gardant le bassin et les cuisses au sol et les fesses relâchées. Redescendez lentement.',
   array[]::text[], array['Extension lombaire McKenzie', 'Sphinx', 'Extension sur les coudes', 'Lombalgie']),
  ('fc932ff8-513c-4330-9dd2-0a167e18e27c'::uuid, 'Supine Pelvic Tilt',
   'Allongé sur le dos, genoux fléchis, pieds au sol. Basculez le bassin vers l''arrière en plaquant le bas du dos contre le sol, en contractant doucement le ventre, sans décoller les fesses. Tenez quelques secondes, puis relâchez.',
   array[]::text[], array['Bascule du bassin', 'Rétroversion du bassin', 'Lombalgie']),
  ('72bc48df-4268-47d2-b48b-aa162b18631f'::uuid, 'Knee-to-Chest Stretch',
   'Allongé sur le dos, genoux fléchis. Ramenez un genou vers la poitrine avec les deux mains sous le genou, puis les deux genoux ensemble en tenant les tibias. Maintenez la position en respirant calmement.',
   array[]::text[], array['Genoux-poitrine', 'Étirement lombaire', 'Lombalgie']),
  ('55aaf182-05a2-49af-bd2c-9f8375451558'::uuid, 'Sit-to-Stand',
   'Assis au bord d''une chaise, pieds à plat légèrement en arrière des genoux, bras croisés sur la poitrine. Penchez le buste en avant et levez-vous sans l''aide des mains jusqu''à être debout bien droit devant la chaise, puis rasseyez-vous lentement.',
   array[]::text[], array['Assis-debout', 'Lever de chaise', 'Personne âgée', 'Arthrose du genou']),
  ('a586e91a-6978-4ad2-bb4d-dbe2381d629b'::uuid, 'Ball Squeeze (Knees)',
   'Assis sur une chaise, pieds au sol, un petit ballon (ou un coussin) entre les genoux. Serrez le ballon en rapprochant les genoux, tenez quelques secondes, puis relâchez doucement.',
   array['ballon'], array['Ballon serré entre les genoux', 'Adducteurs', 'Pubalgie'])
) as v(id, name, instructions, equipment, keywords)
where not exists (select 1 from public.exercises e where e.id = v.id or e.name = v.name);

insert into public.exercise_body_parts (exercise_id, body_part_id)
select v.id, bp.id
from (values
  ('e1630e91-d57f-46c0-8219-6033c342c711'::uuid, 'genou-jambe'),       -- Quad Set
  ('95fae702-af56-4320-82f1-5345e225ebbf'::uuid, 'genou-jambe'),       -- Heel Slide
  ('67aa5f57-3edb-4467-95fb-c0e3b5e2150c'::uuid, 'genou-jambe'),       -- Straight Leg Raise
  ('67aa5f57-3edb-4467-95fb-c0e3b5e2150c'::uuid, 'hanche-fessiers'),
  ('4654e8cc-e3fa-4d96-a84a-9a7eede18d36'::uuid, 'genou-jambe'),       -- Terminal Knee Extension
  ('7cbbb240-8f48-4c73-a3cf-2ebe975c4b8e'::uuid, 'genou-jambe'),       -- Passive Knee Extension
  ('67614fc4-b710-4de1-ae63-d00bc50adb4f'::uuid, 'cheville-pied'),     -- Ankle Dorsiflexion
  ('b09eb00c-13d1-468c-bb7e-e27ea0cca758'::uuid, 'cheville-pied'),     -- Ankle Plantar Flexion
  ('c412db52-fedc-4b91-9598-c962aa094e17'::uuid, 'cheville-pied'),     -- Ankle Inversion
  ('1bd35d46-a33b-4bf4-8add-ad4c8c349148'::uuid, 'cheville-pied'),     -- Ankle Eversion
  ('147e92d8-f7ff-40f4-a852-68ff193139d2'::uuid, 'cheville-pied'),     -- Knee-to-Wall
  ('abb5dbad-95ae-44a1-9d01-db7d2d709375'::uuid, 'equilibre-general'), -- Single-Leg Stance
  ('abb5dbad-95ae-44a1-9d01-db7d2d709375'::uuid, 'cheville-pied'),
  ('7712b0fc-9b02-487b-8977-f48ee12a0c5e'::uuid, 'equilibre-general'), -- Y-Balance
  ('7712b0fc-9b02-487b-8977-f48ee12a0c5e'::uuid, 'genou-jambe'),
  ('c7c64ead-58bb-4cd1-94bd-6942df9e8eb2'::uuid, 'genou-jambe'),       -- Hop and Stick
  ('c7c64ead-58bb-4cd1-94bd-6942df9e8eb2'::uuid, 'equilibre-general'),
  ('55714cf7-61af-48ed-9758-e638038de5e0'::uuid, 'epaule'),            -- External Rotation
  ('46082033-b66f-4086-9f32-d9b95d70b7fa'::uuid, 'epaule'),            -- Internal Rotation
  ('202321af-b592-46c2-83ce-35eb3ce6f911'::uuid, 'epaule'),            -- Codman
  ('2cb436c0-639c-4662-8d31-ab34f674c31d'::uuid, 'epaule'),            -- Stick Flexion
  ('c5d3d449-9f40-48f0-87f7-4a59abf4df97'::uuid, 'cervicales-cou'),    -- Chin Tuck
  ('1e303f7d-b334-4b96-bcfb-7bb7f1b39f03'::uuid, 'cervicales-cou'),    -- Cervical Isometrics
  ('8b7a27a2-e2de-4924-877f-10d5a6483092'::uuid, 'dos-lombaires'),     -- Prone Press-Up
  ('fc932ff8-513c-4330-9dd2-0a167e18e27c'::uuid, 'dos-lombaires'),     -- Pelvic Tilt
  ('fc932ff8-513c-4330-9dd2-0a167e18e27c'::uuid, 'tronc-gainage-abdos'),
  ('72bc48df-4268-47d2-b48b-aa162b18631f'::uuid, 'dos-lombaires'),     -- Knee-to-Chest
  ('55aaf182-05a2-49af-bd2c-9f8375451558'::uuid, 'genou-jambe'),       -- Sit-to-Stand
  ('55aaf182-05a2-49af-bd2c-9f8375451558'::uuid, 'hanche-fessiers'),
  ('a586e91a-6978-4ad2-bb4d-dbe2381d629b'::uuid, 'hanche-fessiers'),   -- Ball Squeeze
  ('a586e91a-6978-4ad2-bb4d-dbe2381d629b'::uuid, 'genou-jambe')
) as v(id, slug)
join public.body_parts bp on bp.slug = v.slug
join public.exercises e on e.id = v.id
on conflict (exercise_id, body_part_id) do nothing;

alter table public.exercise_body_parts force row level security;
alter table public.exercises force row level security;
