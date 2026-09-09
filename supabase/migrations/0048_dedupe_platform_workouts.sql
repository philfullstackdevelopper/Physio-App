-- Séances de la plateforme en double (constat du 2026-09-09 dans la modale
-- « Choisir une séance ») : 65 paires (condition, nom) où une des deux copies
-- a les accents cassés (« Ã‰tirements ») ou est strictement identique —
-- reliquat des migrations 0040-0042 qui ont dédoublonné les exercices mais pas
-- les séances. On garde, par paire, la copie sans accents cassés (puis la plus
-- ancienne), et on supprime l'autre. Garde-fou : une copie encore référencée
-- par une recommandation, un historique ou une copie personnelle n'est jamais
-- supprimée (au moment d'écrire, aucune ne l'est). Sans effet si relancée.
with ranked as (
  select id,
         row_number() over (
           partition by condition_id, name
           order by ((name || ' ' || coalesce(description, '')) ~ 'Ã')::int, created_at, id
         ) as rn
  from public.workouts
  where created_by is null and patient_id is null
),
losers as (
  select r.id from ranked r
  where r.rn > 1
    and not exists (select 1 from public.patient_recommended_workouts p where p.workout_id = r.id)
    and not exists (select 1 from public.workout_logs l where l.workout_id = r.id)
    and not exists (select 1 from public.workouts c where c.source_workout_id = r.id)
),
gone_exercises as (
  delete from public.workout_exercises we
  using losers where we.workout_id = losers.id
  returning we.workout_id
)
delete from public.workouts w using losers where w.id = losers.id;
