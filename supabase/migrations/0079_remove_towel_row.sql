-- =============================================================================
-- 0079 — Retire l'exercice « Towel Row » de la bibliothèque (Philippe,
-- 2026-11-01 : « inutile ») ET de toutes les séances où il était déjà
-- prescrit, y compris les copies « Ajuster la séance » propres à un patient.
--
-- Ce que ça fait, dans l'ordre :
--   1. enlève la ligne « Towel Row » de chaque séance qui le contient
--      (les autres exercices de ces séances ne bougent pas) ;
--   2. supprime l'exercice lui-même (ses zones du corps partent avec, par
--      cascade).
-- L'historique des séances déjà faites (workout_logs) n'est pas touché.
--
-- Les règles RLS ne changent pas. Comme 0068/0069, la migration lève le
-- « force row level security » le temps de ses propres écritures, puis le
-- remet.
-- =============================================================================

alter table public.exercises no force row level security;
alter table public.workout_exercises no force row level security;

delete from public.workout_exercises we
using public.exercises e
where we.exercise_id = e.id
  and e.name = 'Towel Row'
  and e.created_by is null;

delete from public.exercises e
where e.name = 'Towel Row'
  and e.created_by is null;

alter table public.workout_exercises force row level security;
alter table public.exercises force row level security;
