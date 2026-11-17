-- =============================================================================
-- 0100 — Matériel exigé par les exercices, corrigé (Philippe, 2026-11-17)
--
-- En clair : la colonne « matériel indispensable » de 7 exercices est remise
-- d'accord avec leur consigne (charge devenue facultative le 17/11 ; petite
-- bouteille d'eau au lieu d'un haltère ; plus de chaise pour l'étirement du
-- trapèze). 3 consignes précisent l'objet de remplacement. Sert au
-- remplacement automatique des exercices quand le patient n'a pas le matériel
-- (lib/exercise/equipmentSwaps.ts). Aucune règle d'accès ne change.
-- =============================================================================

alter table public.exercises no force row level security;

update public.exercises set equipment = '{}'::text[] where name = 'Upper Trapezius Stretch' and created_by is null;
update public.exercises set equipment = '{}'::text[] where name = 'Lateral Raise' and created_by is null;
update public.exercises set equipment = '{}'::text[] where name = 'Romanian Deadlift' and created_by is null;
update public.exercises set equipment = array['chaise']::text[] where name = 'Hip Thrust' and created_by is null;
update public.exercises set equipment = '{}'::text[] where name = 'Seated External Rotation (Elbow on Knee)' and created_by is null;
update public.exercises set equipment = '{}'::text[] where name = 'Side-Lying External Rotation' and created_by is null;
update public.exercises set equipment = '{}'::text[] where name = 'Wrist Radial-Ulnar Deviation' and created_by is null;

update public.exercises e
set instructions = v.instr
from (values
  ('Side-Lying External Rotation', 'Allongé sur le côté, coude du dessus plié à 90° et collé au corps (une serviette roulée sous le coude si besoin), un haltère léger (ou une petite bouteille d''eau) en main. Faites pivoter l''avant-bras vers le plafond sans décoller le coude, puis redescendez lentement.'),
  ('Wrist Radial-Ulnar Deviation', 'Assis, le coude contre le corps, l''avant-bras à l''horizontale devant vous, pouce vers le haut, un haltère léger (ou une petite bouteille d''eau) en main. Inclinez la main vers le haut (côté pouce) puis vers le bas (côté auriculaire), sans bouger l''avant-bras.'),
  ('Foam Ball Squeeze', 'Une balle en mousse dans la main (ou une chaussette roulée en boule). Serrez le plus fort possible sans douleur, tenez quelques secondes, puis relâchez doucement.')
) as v(name, instr)
where e.name = v.name and e.created_by is null;

alter table public.exercises force row level security;
