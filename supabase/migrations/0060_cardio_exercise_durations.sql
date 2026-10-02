-- Physio-App — Migration 0060: durée dans les consignes des exercices d'endurance
-- Safe to re-run.
--
-- Philippe, 2026-10-01 : 3 × 12 est la règle pour tous les exercices, sauf
-- l'endurance (vélo, marche) où l'on fixe simplement un nombre de minutes —
-- « tu peux mettre dans les consignes la durée que tu juges nécessaire ».
-- La durée est donc écrite dans la consigne elle-même ; l'écran de séance
-- (lib/exercise/prescription.ts, goalTextFor) la repère (« N minutes ») et
-- l'affiche comme objectif à la place de « 3 séries × 12 répétitions ».
--
-- Durées prudentes, choisies par Claude à la demande de Philippe — à faire
-- valider par le kiné partenaire avant le lancement, comme le reste du
-- contenu clinique. « Bicycle Crunch » et « Walking Lunge » ne sont pas de
-- l'endurance (ils se comptent en répétitions) et ne sont pas touchés.
--
-- Données seulement (exercices de la plateforme, created_by null). Sur
-- Scalingo toutes les tables sont en FORCE ROW LEVEL SECURITY (voir 0058) et
-- les exercices de la plateforme ne sont modifiables par personne via RLS —
-- même pas par le propriétaire. On lève donc FORCE sur cette seule table le
-- temps de l'UPDATE puis on le remet, le tout dans la transaction du
-- script de migration : ALTER TABLE verrouille la table jusqu'au commit,
-- personne ne la voit jamais sans protection, et en cas d'erreur tout est
-- annulé. (Sur Supabase, appliqué en superutilisateur, ces deux lignes sont
-- sans effet.) À exécuter dans une transaction (begin … commit).

alter table public.exercises no force row level security;

update public.exercises as e set instructions = v.instructions
from (values
  ('15548226-3784-41ea-9b4d-9d95471a331b'::uuid, 'Pédalez 10 minutes à une cadence régulière sur vélo stationnaire ou classique, en ajustant la résistance selon la tolérance.'),
  ('2aca580e-ef25-4295-a2b3-d215ff88b80c'::uuid, 'Pédalez 10 minutes sur un vélo d''appartement sans résistance, à rythme confortable.'),
  ('e8618c41-c82d-49c8-b6d0-d8be803c8a4d'::uuid, 'Pédalez 10 minutes à faible résistance, sans douleur, pour entretenir la mobilité du genou.'),
  ('4eeb15e7-d7f2-49fd-af0a-9aa5ea486548'::uuid, 'Pédalez 10 minutes à allure douce sur un vélo d''appartement, buste légèrement penché en avant si cela soulage.'),
  ('9c47bd18-f0f4-49e7-9d91-2461004c4081'::uuid, 'Pendant 5 minutes, sur le vélo à bras, pédalez en poussant et tirant simultanément les bras, à une cadence régulière.'),
  ('b474f557-b996-4736-aab5-177334b50878'::uuid, 'Marchez 15 minutes à une allure régulière, dos droit.'),
  ('8bbe6bf6-88fc-4895-bea7-dba5f321349e'::uuid, 'Marchez 15 minutes à un rythme légèrement soutenu.'),
  ('c571fcdb-f8fc-4058-96aa-34494f8f2d10'::uuid, 'Marchez 10 minutes sur différentes surfaces (herbe, sable si possible), à allure modérée.'),
  ('6b1544f1-36ce-4714-b432-937911d301e3'::uuid, 'Marchez 15 minutes à allure confortable sans aide à la marche, si votre tolérance le permet.'),
  ('2f659211-e099-4eab-9a80-3add5d2430fb'::uuid, 'Marchez 5 minutes avec l''aide technique prescrite (déambulateur, cannes), sans forcer.'),
  ('db81e0fd-706c-4f04-929f-80931182a101'::uuid, 'Marchez 5 minutes avec l''aide technique prescrite, en mettant en charge selon la consigne de votre kiné.'),
  ('7757cc23-047a-4f2c-9764-eac76a39b36b'::uuid, 'Marchez 5 minutes à allure lente, plusieurs fois par jour, en évitant la position assise prolongée.')
) as v(id, instructions)
where e.id = v.id and e.created_by is null;

alter table public.exercises force row level security;
