-- Physio-App — Migration 0074 : 2 nouveaux exercices de step filmés avec Jules
-- Safe to re-run.
--
-- Philippe, 2026-10-31 : ajout à la bibliothèque de la plateforme des
-- exercices filmés avec Jules (kiné) le 2026-10-30, avec leurs animations
-- validées (public/exercise-illustrations/<dessin>/, reliées par nom dans
-- lib/exercise/illustrationMap.ts). Généré par scripts/exercices-jules.mjs.
--
-- Même méthode que 0068 et 0070 : exercices de la PLATEFORME (created_by
-- null), visibles par tous les kinés et patients connectés, modifiables par
-- personne ; rangés dans leurs zones du corps (exercise_body_parts).
-- Ne modifie aucune règle d'accès (RLS), aucun patient, aucune séance, aucun
-- exercice existant. FORCE ROW LEVEL SECURITY est levé le temps des INSERT
-- puis remis, dans la transaction de scripts/migrate.mjs --only.
--
-- Consignes rédigées par Claude d'après les vidéos de Jules — à faire RELIRE
-- par Jules.

alter table public.exercises no force row level security;
alter table public.exercise_body_parts no force row level security;

insert into public.exercises (id, name, instructions, equipment, search_keywords)
select v.id, v.name, v.instructions, v.equipment, v.keywords
from (values
  ('0e8d281a-39b6-5bb7-97dc-1895d1cb877f'::uuid, 'Lunge to Step-Up with Knee Drive',
   'Partez en fente au sol devant un step (ou une marche) : la jambe droite devant, pied bien à plat, la jambe gauche derrière. Remontez en gardant le pied droit planté au sol, ramenez la jambe gauche vers l''avant en penchant légèrement le buste, posez le pied gauche sur le step et poussez dessus pour monter, en levant le genou droit devant vous. Redescendez en contrôlant, puis changez de côté.',
   array[]::text[], array['Fente puis montée sur step', 'Fente enchaînée step-up', 'Montée de genou', 'Retour au sport']),
  ('447fc8b1-411f-5d86-9035-4b0acba32882'::uuid, 'Rotational Step-Up',
   'Debout à côté d''un step (ou d''une marche), parallèle à lui. Faites pivoter la jambe gauche vers le step et posez le pied gauche dessus, comme si vous étiez face au step. Poussez sur la jambe gauche en tournant le buste pour monter, et restez sur la jambe gauche sans poser le pied droit, genou droit levé. Redescendez par le même mouvement, puis changez de côté.',
   array[]::text[], array['Montée sur step avec rotation', 'Step-up en rotation', 'Équilibre sur une jambe', 'Retour au sport'])
) as v(id, name, instructions, equipment, keywords)
where not exists (select 1 from public.exercises e where e.id = v.id or e.name = v.name);

insert into public.exercise_body_parts (exercise_id, body_part_id)
select v.id, bp.id
from (values
  ('0e8d281a-39b6-5bb7-97dc-1895d1cb877f'::uuid, 'genou-jambe'), -- Lunge to Step-Up with Knee Drive
  ('0e8d281a-39b6-5bb7-97dc-1895d1cb877f'::uuid, 'hanche-fessiers'),
  ('447fc8b1-411f-5d86-9035-4b0acba32882'::uuid, 'genou-jambe'), -- Rotational Step-Up
  ('447fc8b1-411f-5d86-9035-4b0acba32882'::uuid, 'hanche-fessiers'),
  ('447fc8b1-411f-5d86-9035-4b0acba32882'::uuid, 'equilibre-general')
) as v(id, slug)
join public.body_parts bp on bp.slug = v.slug
join public.exercises e on e.id = v.id
on conflict (exercise_id, body_part_id) do nothing;

alter table public.exercise_body_parts force row level security;
alter table public.exercises force row level security;
