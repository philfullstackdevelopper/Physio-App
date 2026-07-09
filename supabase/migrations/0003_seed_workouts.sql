-- Physio-App — Migration 0003: seed the platform workouts
-- Migration 0002 introduced the workouts model but never seeded any workouts, so a
-- freshly-created database has conditions with ZERO workouts. That makes the
-- instructor "assign a condition" flow look broken: the assignment succeeds, but the
-- "Séances proposées" list underneath is empty and no program can be recommended.
--
-- This migration recreates the platform starter workouts (created_by = null) and the
-- exercises that make up each one, so an instructor can assign a working program on
-- day one (per CLAUDE.md §4).
--
-- SAFE / IDEMPOTENT: every insert is guarded by a "not exists" check, so running this
-- against a database that already has these workouts changes NOTHING (no duplicates).
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run.

-- ---------------------------------------------------------------------------
-- 1. Platform workouts (session alternatives) for each platform condition.
--    Only inserted for platform conditions (created_by is null), and only if a
--    workout of the same name does not already exist for that condition.
-- ---------------------------------------------------------------------------
insert into public.workouts (condition_id, name, description, duration_minutes, times_per_week, created_by)
select c.id, v.workout_name, v.description, v.duration_minutes, v.times_per_week, null
from public.conditions c
join (values
  ('Lombalgie chronique',    'Séance express',      'Une routine courte pour les jours chargés.',                        10, 5),
  ('Lombalgie chronique',    'Séance complète',     'Le programme équilibré recommandé pour la plupart des patients.',   25, 3),
  ('Lombalgie chronique',    'Séance intensive',    'Séance longue avec plus de répétitions pour renforcer davantage.',  40, 2),
  ('Entorse de la cheville', 'Séance mobilité',     'Réveil articulaire doux de la cheville.',                            8, 6),
  ('Entorse de la cheville', 'Séance renforcement', 'Renforcement et proprioception pour retrouver la stabilité.',       20, 4),
  ('Cervicalgie',            'Séance détente',      'Étirements doux pour relâcher les tensions du cou.',                 6, 7),
  ('Cervicalgie',            'Séance complète',     'Mobilité et renforcement léger des cervicales.',                    12, 4)
) as v(condition_name, workout_name, description, duration_minutes, times_per_week)
  on v.condition_name = c.name and c.created_by is null
where not exists (
  select 1 from public.workouts w
  where w.condition_id = c.id and w.name = v.workout_name
);

-- ---------------------------------------------------------------------------
-- 2. The exercises that make up each workout, in display order (position).
--    Matched by condition name + workout name + exercise name; only platform
--    exercises (created_by is null) are used, and each link is inserted only if
--    it does not already exist.
-- ---------------------------------------------------------------------------
insert into public.workout_exercises (workout_id, exercise_id, position)
select w.id, e.id, v.position
from public.workouts w
join public.conditions c
  on c.id = w.condition_id and c.created_by is null
join (values
  -- Lombalgie chronique — Séance express
  ('Lombalgie chronique',    'Séance express',      'Gainage abdominal (planche)',            0),
  ('Lombalgie chronique',    'Séance express',      'Pont fessier',                           1),
  ('Lombalgie chronique',    'Séance express',      'Rotation du tronc',                      2),
  -- Lombalgie chronique — Séance complète
  ('Lombalgie chronique',    'Séance complète',     'Gainage abdominal (planche)',            0),
  ('Lombalgie chronique',    'Séance complète',     'Pont fessier',                           1),
  ('Lombalgie chronique',    'Séance complète',     'Étirement des ischio-jambiers',          2),
  ('Lombalgie chronique',    'Séance complète',     'Étirement du piriforme',                 3),
  ('Lombalgie chronique',    'Séance complète',     'Rotation du tronc',                      4),
  -- Lombalgie chronique — Séance intensive
  ('Lombalgie chronique',    'Séance intensive',    'Gainage abdominal (planche)',            0),
  ('Lombalgie chronique',    'Séance intensive',    'Pont fessier',                           1),
  ('Lombalgie chronique',    'Séance intensive',    'Étirement des ischio-jambiers',          2),
  ('Lombalgie chronique',    'Séance intensive',    'Étirement du piriforme',                 3),
  ('Lombalgie chronique',    'Séance intensive',    'Rotation du tronc',                      4),
  -- Entorse de la cheville — Séance mobilité
  ('Entorse de la cheville', 'Séance mobilité',     'Flexion dorsale de la cheville',         0),
  ('Entorse de la cheville', 'Séance mobilité',     'Équilibre sur une jambe',                1),
  -- Entorse de la cheville — Séance renforcement
  ('Entorse de la cheville', 'Séance renforcement', 'Flexion dorsale de la cheville',         0),
  ('Entorse de la cheville', 'Séance renforcement', 'Renforcement des mollets',               1),
  ('Entorse de la cheville', 'Séance renforcement', 'Équilibre sur une jambe',                2),
  -- Cervicalgie — Séance détente
  ('Cervicalgie',            'Séance détente',      'Étirement des cervicales',               0),
  ('Cervicalgie',            'Séance détente',      'Rétraction cervicale (double menton)',   1),
  -- Cervicalgie — Séance complète
  ('Cervicalgie',            'Séance complète',     'Étirement des cervicales',               0),
  ('Cervicalgie',            'Séance complète',     'Rétraction cervicale (double menton)',   1)
) as v(condition_name, workout_name, exercise_name, position)
  on v.condition_name = c.name and v.workout_name = w.name
join public.exercises e
  on e.name = v.exercise_name and e.created_by is null
where not exists (
  select 1 from public.workout_exercises we
  where we.workout_id = w.id and we.exercise_id = e.id
);
