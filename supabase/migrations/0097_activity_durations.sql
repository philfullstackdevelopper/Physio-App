-- =============================================================================
-- 0097 — Durée dans la consigne des activités (Philippe, 2026-11-17)
--
-- En clair : l'appli lit la durée d'une activité (« 15 minutes ») dans sa
-- consigne. Course, marche-course, escaliers et corde à sauter n'en avaient
-- pas : le patient aurait vu « 3 séries de 8 à 12 répétitions » pour une course.
-- Seules ces 4 consignes changent. Aucune règle d'accès ne change.
-- =============================================================================

alter table public.exercises no force row level security;

update public.exercises e
set instructions = v.instr
from (values
  ('Running', 'Courez 15 minutes à une allure régulière et confortable, foulée souple. Augmentez la durée progressivement d''une semaine à l''autre si tout va bien.'),
  ('Progressive Walk-to-Jog (Shin Splints, Soft Terrain)', 'Pendant 15 minutes, commencez par marcher, puis passez très progressivement à un petit trot, sur terrain souple ou sur tapis de course, en l''absence de douleur.'),
  ('Controlled Stair Climbing', 'Montez et descendez les escaliers pendant 5 minutes en contrôlant le mouvement, en vous tenant à la rampe si besoin.'),
  ('Jump Rope', 'Sautez à la corde par séries de 30 secondes, à un rythme régulier, petits sauts sur l''avant des pieds, coudes proches du corps.')
) as v(name, instr)
where e.name = v.name and e.created_by is null;

alter table public.exercises force row level security;
