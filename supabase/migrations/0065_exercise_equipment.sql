-- Physio-App — Migration 0065 : matériel nécessaire à chaque exercice
-- Safe to re-run.
--
-- Philippe, 2026-10-12 : « are we sure that the exercises that the physio can
-- assign depend on what things the patient can work with at home? ». Jusqu'ici
-- NON : le patient déclare son matériel à l'onboarding
-- (patient_profiles.equipment, migration 0050), mais les exercices ne
-- portaient aucune information de matériel — l'appli ne pouvait donc rien
-- comparer, et le kiné pouvait attribuer un exercice aux haltères à un patient
-- qui n'en a pas sans que rien ne le signale.
--
-- Ce que fait cette migration
--   1. Ajoute exercises.equipment : la liste du matériel INDISPENSABLE pour
--      faire l'exercice. Liste vide = aucun matériel (poids du corps, marche…).
--      Identifiants : lib/exercise/equipment.ts (ExerciseEquipmentId) —
--      elastiques, halteres, chaise, velo_rameur, barre_traction, swiss_ball
--      (ceux que le patient peut déclarer), plus salle, kettlebell,
--      corde_a_sauter, roue_abdominale, piscine (matériel qu'on n'a en
--      principe pas à la maison).
--   2. Renseigne ce matériel pour les 200 exercices de la plateforme qui en
--      demandent (sur 361 ; les 161 autres n'en demandent pas).
--
-- Ce que l'appli en fait : quand le kiné ajuste ou compose une séance pour un
-- patient, les exercices pour lesquels il manque du matériel au patient sont
-- SIGNALÉS (pastille « Matériel : … ») et un filtre « faisable avec son
-- matériel » est proposé. Rien n'est bloqué : le kiné reste seul juge (le
-- patient a pu s'équiper depuis, ou utiliser le matériel du cabinet).
--
-- Classement fait par Claude à la demande de Philippe, d'après le nom et les
-- consignes de chaque exercice — à faire RELIRE par le kiné partenaire avant
-- le lancement, comme le reste du contenu clinique. Chaque ligne ci-dessous
-- porte le nom de l'exercice en commentaire pour faciliter cette relecture ;
-- corriger une ligne puis relancer la migration suffit.
--
-- RLS : AUCUNE nouvelle politique, aucune politique modifiée. La colonne suit
-- les politiques existantes de la table exercises (lecture par tout
-- utilisateur connecté ; un kiné ne modifie que les exercices qu'il a créés ;
-- les exercices de la plateforme restent en lecture seule). Un kiné peut donc
-- renseigner le matériel de SES propres exercices, et de ceux-là seulement.
--
-- Comme pour la migration 0060 : sur Scalingo toutes les tables sont en FORCE
-- ROW LEVEL SECURITY (0058) et les exercices de la plateforme (created_by
-- null) ne sont modifiables par personne via RLS, pas même par le
-- propriétaire. On lève donc FORCE sur cette seule table le temps de
-- l'UPDATE puis on le remet, le tout dans la transaction du script de
-- migration : ALTER TABLE verrouille la table jusqu'au commit, personne ne la
-- voit jamais sans protection, et en cas d'erreur tout est annulé. À exécuter
-- dans une transaction (scripts/migrate.mjs --only le fait).
--
-- Purement additif : les anciennes versions du code ignorent la colonne.

alter table public.exercises
  add column if not exists equipment text[] not null default '{}';

comment on column public.exercises.equipment is
  'Matériel indispensable pour faire l''exercice (identifiants de lib/exercise/equipment.ts). Vide = aucun matériel.';

alter table public.exercises no force row level security;

update public.exercises as e set equipment = v.equipment
from (values
  -- barre_traction
  ('c87216c0-8313-4890-9ed5-3f36cc463005'::uuid, array['barre_traction']), -- Active Hang
  ('9cb20741-6d63-470f-ae91-d8d311c1185b'::uuid, array['barre_traction']), -- Captain's Chair Knee Raise
  ('7afaf05d-41dd-4627-8403-e09bd97a9ff5'::uuid, array['barre_traction']), -- Chin-up
  ('dec5b911-b66a-4623-be6b-ab4bb6cdcaa8'::uuid, array['barre_traction']), -- Commando Pull-up
  ('16ea3c4a-74b1-43a0-a782-51a59a7be6c1'::uuid, array['barre_traction']), -- Dead Hang
  ('9f37cdd6-ec63-4fb8-ba66-40bbf1851faa'::uuid, array['barre_traction']), -- Hanging Knee Raise
  ('9c704854-378b-4807-98b6-459eaac62ec7'::uuid, array['barre_traction']), -- Hanging Leg Raise
  ('4f45a15f-32b4-4f11-a689-a7d34f731387'::uuid, array['barre_traction']), -- L-Sit Pull-up
  ('762db505-2eae-4384-9958-519f66a68e3f'::uuid, array['barre_traction']), -- Negative Pull-up
  ('5b8036d7-eddf-4673-88f0-ae8e99a0fbd5'::uuid, array['barre_traction']), -- Neutral-Grip Pull-up
  ('e4e2383f-1d78-4674-be04-df7d6e15f63e'::uuid, array['barre_traction']), -- Pull-up
  ('0c94663e-9de5-4618-b484-693a68b7fe20'::uuid, array['barre_traction']), -- Scapular Pull-up
  ('1a1ad00d-8c44-48d5-b762-694b12f506b3'::uuid, array['barre_traction']), -- Towel Pull-up
  -- barre_traction + elastiques
  ('bfc1cbaa-7592-4a96-9500-dd76a54b91c5'::uuid, array['barre_traction', 'elastiques']), -- Assisted Chin-up
  ('91c7c84d-2da6-4baa-aa43-912596b13860'::uuid, array['barre_traction', 'elastiques']), -- Assisted Pull-up
  -- barre_traction + halteres
  ('4d26f9c8-2afa-40a2-962c-7815ffc49a1d'::uuid, array['barre_traction', 'halteres']), -- Weighted Chin-up
  ('ec642c92-8649-425d-b1b6-2eabfc0924f4'::uuid, array['barre_traction', 'halteres']), -- Weighted Pull-up
  -- chaise
  ('aee0379e-7b9f-4626-86a3-f31c886f6a92'::uuid, array['chaise']), -- Bench Dip
  ('81b73847-deb2-40ff-97a2-7a3ec1ca8c01'::uuid, array['chaise']), -- Bulgarian Split Squat
  ('19637837-023e-4fa0-bba3-7de1efd2e280'::uuid, array['chaise']), -- Chair Dip
  ('7a1d935a-feb8-43fc-be7b-461e18fcfbdf'::uuid, array['chaise']), -- Copenhagen Plank
  ('4d53d3b7-9f0e-411b-8fce-a28c0aa567bd'::uuid, array['chaise']), -- Decline Push-up
  ('cf94ec59-b654-42e7-997a-f28dac8c18e4'::uuid, array['chaise']), -- Dragon Flag
  ('8493a9d5-a5ab-400f-b537-f061e368cedf'::uuid, array['chaise']), -- Feet-Elevated Pike Push-up
  ('066ba8c4-1955-468f-b1f2-32ec05dec7ea'::uuid, array['chaise']), -- Incline Push-up
  ('60ffaea8-e747-48d0-8d69-aa88d102756d'::uuid, array['chaise']), -- Single-Leg Box Squat
  -- chaise + elastiques
  ('81fc454c-468d-47b1-919a-bc1fbe5a496a'::uuid, array['chaise', 'elastiques']), -- Banded Hip Thrust
  ('e42d3f76-6b43-453e-8535-1233636fd54e'::uuid, array['chaise', 'elastiques']), -- Banded Seated Hip Abduction
  -- chaise + halteres
  ('c58ec504-af16-481f-93b9-7ccfb10092a3'::uuid, array['chaise', 'halteres']), -- Dumbbell Bench Press
  ('17aae3e9-cb8e-4fc7-b0e5-5b4dac5a5f40'::uuid, array['chaise', 'halteres']), -- Dumbbell Fly
  ('e4b94b46-e82a-4db0-a044-3b2ed3be899e'::uuid, array['chaise', 'halteres']), -- Dumbbell Hip Thrust
  ('13ef348e-4024-44d1-ab21-26df38f147a5'::uuid, array['chaise', 'halteres']), -- Dumbbell Seated Shoulder Press
  ('f6bd0bd6-0753-47ea-9fd2-a91774a50f1d'::uuid, array['chaise', 'halteres']), -- Hip Thrust
  ('40323f87-ab58-497a-891f-e6f368213c11'::uuid, array['chaise', 'halteres']), -- One-Arm Dumbbell Row
  ('118a62fc-ea8c-4627-9d0b-d6aea60a5294'::uuid, array['chaise', 'halteres']), -- Single Dumbbell Skullcrusher
  ('959cb0db-dab9-473b-b9df-c5283f693dd2'::uuid, array['chaise', 'halteres']), -- Skull Crusher
  ('46aaa2cc-99a0-4fb0-bb96-9c55a4b7422c'::uuid, array['chaise', 'halteres']), -- Two Dumbbell Skullcrusher
  -- corde_a_sauter
  ('4b5d8a3d-6240-4cab-be9a-223d7e9c8505'::uuid, array['corde_a_sauter']), -- Jump Rope
  -- elastiques
  ('7e4c997a-d926-4b0c-9381-a9108eaf8222'::uuid, array['elastiques']), -- Anti-Rotation Hold (Band)
  ('a95011da-9360-4b75-b01c-0ace84fff614'::uuid, array['elastiques']), -- Band Pull-Apart
  ('fef1229f-5858-44b0-a36e-082e05c73aa3'::uuid, array['elastiques']), -- Banded Clamshell
  ('7d6b6f85-05fe-48de-92a7-81c47abc1101'::uuid, array['elastiques']), -- Banded Dead Bug
  ('d1eef68d-4107-4a71-bca0-27373ef4f31f'::uuid, array['elastiques']), -- Banded Donkey Kick
  ('d412b4a7-cd7a-4f50-af5b-c73fc85015bb'::uuid, array['elastiques']), -- Banded Face Pull
  ('f7185596-418d-4b26-a35b-4169bf169c7e'::uuid, array['elastiques']), -- Banded Fire Hydrant
  ('fbe68d7e-6bf0-4c97-b4c5-1a8a47a20165'::uuid, array['elastiques']), -- Banded Frog Pump
  ('340dac93-b077-4640-afa4-c2a730991ff7'::uuid, array['elastiques']), -- Banded Glute Bridge
  ('292c8cb2-1513-4592-ae5f-f8158ab7365d'::uuid, array['elastiques']), -- Banded Kickback
  ('b6b8f64d-913d-460f-8315-c7d791225ef2'::uuid, array['elastiques']), -- Banded Lat Pulldown
  ('a4185d4b-cf20-46e6-b3b4-2b7837999fa4'::uuid, array['elastiques']), -- Banded Lateral Walk
  ('6782e9a1-e8c5-4206-8402-3e6b4be1e0c5'::uuid, array['elastiques']), -- Banded Monster Walk
  ('78b7d15c-09fd-49ad-b4c4-264562a5143b'::uuid, array['elastiques']), -- Banded Pallof Press
  ('a939a9ca-af72-4a9a-8d12-d4b017a719bd'::uuid, array['elastiques']), -- Banded Row
  ('0c253bf0-3b89-49b2-b665-b51c58af4161'::uuid, array['elastiques']), -- Banded Squat
  ('82e85e8b-046e-4680-8f6e-e50da1481ad3'::uuid, array['elastiques']), -- Banded Standing Hip Abduction
  ('603eb836-0ce4-455f-8c4b-019cd7173b66'::uuid, array['elastiques']), -- Banded Woodchop
  ('83dd6b2e-1e6f-4912-9cac-87d29357b03a'::uuid, array['elastiques']), -- Clamshell (Band)
  ('d86b2bcd-3387-4f56-aaa9-cfa1b561b46f'::uuid, array['elastiques']), -- Half-Kneeling Pallof Press
  ('af9ebe20-6f81-4a43-bd67-0a2288754bc5'::uuid, array['elastiques']), -- Lateral Lunge (Band)
  ('a85d55e7-83bc-452a-adb2-277ab5701d46'::uuid, array['elastiques']), -- Pallof Press
  ('303aa7a6-651b-4d9c-9d4e-2d9506b2a696'::uuid, array['elastiques']), -- Side-Lying Hip Abduction (Band)
  ('8c9c44ba-36e3-4d24-9bb2-e9b91ba51de8'::uuid, array['elastiques']), -- Wrist Extension (Band)
  -- halteres
  ('e238de32-074d-4868-9e01-c44c2501ce7d'::uuid, array['halteres']), -- Arnold Press
  ('88e2ca24-2612-4108-8d1d-b761aa56ab67'::uuid, array['halteres']), -- Bent-Over Rear Delt Raise
  ('57c31f27-804a-48c5-9b7f-6ad770cbe3f5'::uuid, array['halteres']), -- Bicep Curl
  ('d1608793-5e5f-4cce-8041-852843872f38'::uuid, array['halteres']), -- Concentration Curl
  ('9786575b-5571-4da6-9c5a-4a2e1d4ef426'::uuid, array['halteres']), -- Dumbbell Bent Over Row
  ('a47b909e-4588-4d3a-9e3a-1130aac85dd2'::uuid, array['halteres']), -- Dumbbell Curtsy Lunge
  ('2b64c074-98db-4f76-8626-966f7bb1079d'::uuid, array['halteres']), -- Dumbbell Glute Bridge
  ('ef026e3f-881a-4e99-905e-0419daf5ed78'::uuid, array['halteres']), -- Dumbbell Lateral Lunge
  ('19280a6c-0c93-4e4c-8351-4a01603b2a45'::uuid, array['halteres']), -- Dumbbell Overhead Tricep Extension
  ('7cca1684-a86e-4892-ac49-576734d1842f'::uuid, array['halteres']), -- Dumbbell Romanian Deadlift
  ('07fd621a-b71d-4b68-ace2-190578bf0e20'::uuid, array['halteres']), -- Dumbbell Shrug
  ('965f966e-c38d-4b03-86f7-0aca46d0797f'::uuid, array['halteres']), -- Dumbbell Side Bend
  ('78e4664c-aefc-4e51-a1e9-6b1e644dee6b'::uuid, array['halteres']), -- Dumbbell Sumo Deadlift
  ('9ed7fd4f-e4e2-4dfd-8db7-79547dce23f4'::uuid, array['halteres']), -- Dumbbell Sumo Squat
  ('18b101b0-de7a-4a34-b807-75380f4f8d65'::uuid, array['halteres']), -- Farmer Carry
  ('0ed9ecce-3ebf-4e59-898d-39793b9e7aa5'::uuid, array['halteres']), -- Front Raise
  ('f03858a3-6277-4bda-9e0c-d11382b25c1f'::uuid, array['halteres']), -- Goblet Squat
  ('4a63142c-f67e-4700-ab20-7c9c7fde5ccc'::uuid, array['halteres']), -- Hammer Curl
  ('5a7203b2-1bd2-4cf2-a485-88867c64f964'::uuid, array['halteres']), -- Heel-Elevated Goblet Squat
  ('e614adb7-64ab-4a7d-ba44-d270d6c58553'::uuid, array['halteres']), -- Lateral Raise
  ('f8e64c23-e4b5-4fb3-b5e3-f1de8ca134d2'::uuid, array['halteres']), -- Overhead Press
  ('45589d8a-4b70-47c1-93d2-f2668fbd1539'::uuid, array['halteres']), -- Overhead Tricep Extension
  ('dadec409-6f17-4438-90e0-92f89c32d71c'::uuid, array['halteres']), -- Plate Front Raise
  ('41330774-8b52-42d6-81f8-5a6b1ba4e58e'::uuid, array['halteres']), -- Rear Delt Fly
  ('b845cfa5-f2a1-4b66-9cff-e34b84eaf579'::uuid, array['halteres']), -- Romanian Deadlift
  ('0d8518e8-4417-44bc-8fb5-cbbe47f267fb'::uuid, array['halteres']), -- Rope Hammer Curl
  ('56f8a54b-3592-433a-8e4c-68a5ffd45730'::uuid, array['halteres']), -- Single Arm Dumbbell Tricep Extension
  ('fd6a54dd-74c2-40f5-b7a2-0e809b7d4af7'::uuid, array['halteres']), -- Standing Dumbbell Press
  ('8777781e-2bcb-4f8f-8f94-f5e8ae8bbb79'::uuid, array['halteres']), -- Tricep Kickback
  ('5a20fb00-f477-4585-a282-3c3ecdd39e6c'::uuid, array['halteres']), -- Upright Row
  ('6eb686d5-d788-4d55-a309-90f3cf9b3b37'::uuid, array['halteres']), -- Weighted Crunch
  ('fad3b9a4-b74a-4949-a60b-264408dab97a'::uuid, array['halteres']), -- Weighted Push-up
  ('80055c3b-0095-4a3d-8beb-0aac1ec84110'::uuid, array['halteres']), -- Weighted Russian Twist
  ('c556bec3-7b0a-45ac-9834-fe4832e5b306'::uuid, array['halteres']), -- Weighted Single-Leg Glute Bridge
  ('70717aac-6227-4f89-a247-23898294cc90'::uuid, array['halteres']), -- Wrist Curl (Light Dumbbell)
  ('a256437f-6a6c-4385-95ed-179b587f8b82'::uuid, array['halteres']), -- Wrist Extension (Light Dumbbell)
  -- halteres + salle
  ('707e2215-43f4-4907-941d-5a5e27dab90c'::uuid, array['halteres', 'salle']), -- Decline Dumbbell Press
  ('8427308c-de05-4fc1-ac9f-74fd72f45799'::uuid, array['halteres', 'salle']), -- Incline Dumbbell Curl
  ('3b918060-fe55-431c-9b0c-a681bb0f2616'::uuid, array['halteres', 'salle']), -- Incline Dumbbell Press
  ('844e6d99-de6b-492f-80b9-25be2a0367e2'::uuid, array['halteres', 'salle']), -- Weighted Dip
  -- kettlebell
  ('cf81709c-c2e1-4d90-847a-34823a7ea16a'::uuid, array['kettlebell']), -- Kettlebell Romanian Deadlift
  ('911bc982-4237-4a23-a4ae-b2764d18af0a'::uuid, array['kettlebell']), -- Kettlebell Swing
  -- piscine
  ('c48231a0-e39c-492a-824a-83d5e322425a'::uuid, array['piscine']), -- Swimming
  -- roue_abdominale
  ('2c36d671-b4f0-475c-b169-f308e7207b01'::uuid, array['roue_abdominale']), -- Ab Wheel Rollout
  -- salle
  ('aaebf507-95ef-4ced-9c2a-2a80b64adc9b'::uuid, array['salle']), -- Assisted Dip
  ('b7395424-5abd-49be-a830-feb58e688c70'::uuid, array['salle']), -- Back Extension
  ('f1ee442f-fecb-4937-943a-c12208fe2dfd'::uuid, array['salle']), -- Barbell Glute Bridge
  ('a2f05029-b36a-4993-ad27-89d1d59c0846'::uuid, array['salle']), -- Barbell Row
  ('c7e7d34a-2580-44c5-9af8-365ff9ea8af3'::uuid, array['salle']), -- Barbell Shrug
  ('1b50d300-e521-45d6-99fa-6e7aa24812a3'::uuid, array['salle']), -- Battle Ropes
  ('3056f431-5e8b-4f6a-9d2e-9bcf0bcaccc3'::uuid, array['salle']), -- Belt Squat
  ('be67d976-60ec-4d1b-943c-3ee0de534ffc'::uuid, array['salle']), -- Bench Press
  ('860e72dd-8967-4c36-a45b-e86ed4d20c06'::uuid, array['salle']), -- Cable Crunch
  ('691bc92d-ea76-4ae6-aa29-38c441900857'::uuid, array['salle']), -- Cable Curl
  ('54e0024d-f021-4bff-a8f9-7dbccd8a45ad'::uuid, array['salle']), -- Cable Fly
  ('1c5647c3-6893-4563-9041-d2cd4748d1a5'::uuid, array['salle']), -- Cable Front Raise
  ('8de3d81b-7037-4461-a6f3-ac8fe6786fff'::uuid, array['salle']), -- Cable Kickback
  ('aa0ac4e9-58b2-4d75-89a5-d1ccd8934e94'::uuid, array['salle']), -- Cable Lateral Raise
  ('99c8e406-95ef-41d5-b8a4-9315c113ddba'::uuid, array['salle']), -- Cable Pallof Hold
  ('7ab85058-2e1e-4b77-b0f1-80d982dd47e4'::uuid, array['salle']), -- Cable Pull-Through
  ('f0c369c6-b700-4017-bea1-3bd6b7b5d56a'::uuid, array['salle']), -- Cable Rear Delt Fly
  ('9384a17f-88fa-48f6-b13f-87fc118347f2'::uuid, array['salle']), -- Cable Standing Hip Abduction
  ('a1fbeee1-7b79-4a3c-887e-f092e26f97b4'::uuid, array['salle']), -- Cable Standing Hip Adduction
  ('09feaf41-3fcb-4ce9-94bb-835ae8b75641'::uuid, array['salle']), -- Cable Woodchop
  ('5e54c0ad-5b47-402e-b4be-aebed3f5042d'::uuid, array['salle']), -- Chest Dip
  ('c2c289b8-7e88-4de0-8efc-84abfc69156c'::uuid, array['salle']), -- Chest Supported Row
  ('8c3cdab8-6519-4bc4-990c-0162ec0d8756'::uuid, array['salle']), -- Close-Grip Bench Press
  ('ebad889d-1036-440c-94b4-2dc3a989927a'::uuid, array['salle']), -- Close-Grip Lat Pulldown
  ('8ce5af7f-7e76-4028-96d2-08e60c46d3f3'::uuid, array['salle']), -- Deadlift
  ('a28951fa-bbc0-4981-82ea-284f685d44a0'::uuid, array['salle']), -- Decline Bench Press
  ('1a4ef6ae-71a1-4af0-817e-d934975c25a3'::uuid, array['salle']), -- Decline Sit-Up
  ('61e7a153-c430-4c5c-aec5-29901437845a'::uuid, array['salle']), -- Dip
  ('9896cae1-c40f-44f2-8519-9ad2f72687f8'::uuid, array['salle']), -- Drag Curl
  ('b9b6244d-1684-4234-86dd-5089429dfde4'::uuid, array['salle']), -- Elliptical
  ('c92ebe77-894d-4fa0-8815-82b3b4bf92ee'::uuid, array['salle']), -- EZ-Bar Curl
  ('8f50e843-0f04-4fb5-b7cc-93d3cf1f9d0a'::uuid, array['salle']), -- Face Pull
  ('5dc44244-014b-4918-9895-d4692a25cd38'::uuid, array['salle']), -- Front Squat
  ('b81ef2a6-354a-4161-8228-7ddb6dcd86e0'::uuid, array['salle']), -- Glute-Focused Back Extension
  ('2dbb1448-a299-4c8a-9a89-7f39eac27395'::uuid, array['salle']), -- Good Morning
  ('062386cf-3c8b-4f07-8d54-df9033f6bcb4'::uuid, array['salle']), -- Hack Squat
  ('bd97ded0-c1a6-490f-9969-065ecbd16007'::uuid, array['salle']), -- Hip Abduction Machine
  ('2142cebf-94c1-4e70-8db5-87fd36353789'::uuid, array['salle']), -- Hip Adduction Machine
  ('5365af8c-3c09-402b-9bac-0526f0a7daa5'::uuid, array['salle']), -- Incline Bench Press
  ('ae8190e5-2879-43fd-85cb-06a85330616e'::uuid, array['salle']), -- Incline Cable Fly
  ('8e5942bb-766f-4c46-b8c6-b0653e2f9382'::uuid, array['salle']), -- Inverted Row
  ('2cecd76d-a31d-45fa-9371-cb75026f6c9a'::uuid, array['salle']), -- Landmine Press
  ('4da488ae-635b-49aa-82c4-6355c160c179'::uuid, array['salle']), -- Landmine Romanian Deadlift
  ('f85c9ed5-ad46-4a96-87ff-66267620e32c'::uuid, array['salle']), -- Landmine Squat
  ('ebac36c3-90e8-44a1-813a-c3160e41552a'::uuid, array['salle']), -- Lat Pulldown
  ('bacfd5ad-41a3-4f80-9ded-361c7fbe0956'::uuid, array['salle']), -- Leg Curl
  ('8409c244-9437-443d-8fc0-4c31b8384d45'::uuid, array['salle']), -- Leg Extension
  ('1c5c6a92-410c-4f0b-8572-672c15505b8e'::uuid, array['salle']), -- Leg Press
  ('de8f2feb-f64e-4a94-9d89-e642834d2e3c'::uuid, array['salle']), -- Leg Press Calf Raise
  ('b04e7c4d-456c-4115-a948-19df317c6059'::uuid, array['salle']), -- Lying Leg Curl
  ('266978ef-4608-4193-92b3-13aa3a355aa6'::uuid, array['salle']), -- Machine Chest Press
  ('694b902b-e23c-461c-a415-a04ab67522f8'::uuid, array['salle']), -- Machine Glute Kickback
  ('32c34058-175b-400a-adb0-2feca669f797'::uuid, array['salle']), -- Machine Lateral Raise
  ('123a34e7-7be6-417b-bd6e-ae2f0a91298f'::uuid, array['salle']), -- Machine Row
  ('7950173c-7de2-4f6c-bd57-9e4e8f6d4636'::uuid, array['salle']), -- Machine Shoulder Press
  ('78de6d1c-03df-4126-8205-f66299732396'::uuid, array['salle']), -- Meadows Row
  ('2eebd453-1113-4099-8fa5-af5493599da8'::uuid, array['salle']), -- Pec Deck
  ('fac10475-f689-447a-9de0-6ac99b8b4586'::uuid, array['salle']), -- Pendlay Row
  ('8f768f7c-1c0a-4237-ad6e-b5584aa92236'::uuid, array['salle']), -- Preacher Curl
  ('0bf7b5b4-794b-43cf-bbd3-aa03be6f0a03'::uuid, array['salle']), -- Push Press
  ('bb0f6428-ae65-4371-97d3-300c05cc445e'::uuid, array['salle']), -- Rack Pull
  ('ce1d013d-0ff9-4af9-9b66-3811f6331dd5'::uuid, array['salle']), -- Reverse Curl
  ('4789b9e0-ac80-47b4-80a5-7a36288794fa'::uuid, array['salle']), -- Reverse Hyperextension
  ('9ad9a232-cc5b-42e7-b11b-67c5e39a63cf'::uuid, array['salle']), -- Reverse Pec Deck
  ('2e2136e8-615e-4d5f-86d5-b76b0a61df72'::uuid, array['salle']), -- Rope Tricep Pushdown
  ('65f4251f-b9e2-4fa4-a2a8-7185d5f4dfcb'::uuid, array['salle']), -- Seated Cable Row
  ('116cc641-67d6-4cea-a5a1-be5a4875f751'::uuid, array['salle']), -- Seated Calf Raise
  ('971235e0-020c-44df-8e65-b60ca2588b1b'::uuid, array['salle']), -- Seated Leg Curl
  ('67ae735c-15a3-42dc-8087-74e1f6b8d9ab'::uuid, array['salle']), -- Single-Arm Cable Row
  ('c875ecb9-8b66-41e1-bdd8-021add177b67'::uuid, array['salle']), -- SkiErg
  ('5fe234d8-4e54-4489-8cd0-f3f829e9c566'::uuid, array['salle']), -- Smith Machine Bench Press
  ('fe6b5df2-2466-4df7-8e82-acdda60d9e3a'::uuid, array['salle']), -- Smith Machine Bulgarian Split Squat
  ('773b86c8-bc12-444c-9c8a-c08576c042c7'::uuid, array['salle']), -- Smith Machine Hip Thrust
  ('b067b395-a02e-4a3f-9e4a-3f265e6b1720'::uuid, array['salle']), -- Smith Machine Reverse Lunge
  ('9132697a-36c8-4ad7-8378-20aaf7fa2f26'::uuid, array['salle']), -- Smith Machine Romanian Deadlift
  ('8aae7f12-4538-41cf-a9fd-aa2a5cf85541'::uuid, array['salle']), -- Smith Machine Split Squat
  ('adf6b0cb-a94b-42ad-9a57-174e781f17e5'::uuid, array['salle']), -- Smith Machine Squat
  ('0ead8035-20e7-49fe-bddd-b707cff96a4b'::uuid, array['salle']), -- Spider Curl
  ('73878f59-d02d-4dd6-9050-2d75b9f0f265'::uuid, array['salle']), -- Squat
  ('954a60e6-51c9-4232-9f56-cc9e2addb3f9'::uuid, array['salle']), -- Stair Climber
  ('8bba1f78-8b20-4172-b0f5-1ebfdbae36e4'::uuid, array['salle']), -- Straight-Arm Pulldown
  ('59bb3aa6-99fb-44a6-89bc-492c8b30b5c3'::uuid, array['salle']), -- Sumo Deadlift
  ('d45be57a-4f35-4e13-854b-543ebf613fd0'::uuid, array['salle']), -- T-Bar Row
  ('bf52032a-e810-4f82-87c9-39d0f981650f'::uuid, array['salle']), -- Trap Bar Deadlift
  ('87d5dbf1-a2cc-4867-8a5b-e04d53da19a3'::uuid, array['salle']), -- Treadmill Incline Walk
  ('149d7c4c-4b8e-4cba-b11d-fa0f1b3d5ac0'::uuid, array['salle']), -- Tricep Pushdown
  ('351bbbe7-2248-466c-8e8e-2b85a01e5f14'::uuid, array['salle']), -- Wide-Grip Lat Pulldown
  -- swiss_ball
  ('a98c038c-5b54-45f7-a80d-0d3ec1e99969'::uuid, array['swiss_ball']), -- Stability Ball Hamstring Curl
  -- velo_rameur
  ('9c47bd18-f0f4-49e7-9d91-2461004c4081'::uuid, array['velo_rameur']), -- Assault Bike
  ('15548226-3784-41ea-9b4d-9d95471a331b'::uuid, array['velo_rameur']), -- Cycling
  ('fece5d95-4f4a-4e97-8fc6-2db1e28d2ddb'::uuid, array['velo_rameur']), -- Rowing
  ('4eeb15e7-d7f2-49fd-af0a-9aa5ea486548'::uuid, array['velo_rameur']), -- Seated Stationary Cycling (Forward Lean)
  ('e8618c41-c82d-49c8-b6d0-d8be803c8a4d'::uuid, array['velo_rameur']), -- Stationary Cycling (Low Resistance, Meniscus)
  ('2aca580e-ef25-4295-a2b3-d215ff88b80c'::uuid, array['velo_rameur']) -- Stationary Cycling (No Resistance)
) as v(id, equipment)
where e.id = v.id and e.created_by is null;

alter table public.exercises force row level security;
