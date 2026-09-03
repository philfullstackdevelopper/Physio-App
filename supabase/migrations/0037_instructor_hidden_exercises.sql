-- Physio-App / EasyPhysio — Migration 0037: per-instructor exercise hiding
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run. Safe to re-run.
--
-- "Mes exercices" lets a kiné hide exercises they don't want cluttering their
-- own search — a personal filter on the SHARED library, not a deletion.
-- Hiding is per-instructor: kiné A hiding an exercise never affects what kiné
-- B sees, and the exercise itself, plus every workout that already includes
-- it, is untouched.

create table if not exists public.instructor_hidden_exercises (
  instructor_id uuid not null references public.instructors (id) on delete cascade,
  exercise_id   uuid not null references public.exercises (id) on delete cascade,
  hidden_at     timestamptz not null default now(),
  primary key (instructor_id, exercise_id)
);

alter table public.instructor_hidden_exercises enable row level security;

-- Uses public.current_app_user_id() (migration 0031), not auth.uid() — this
-- project has been on Clerk since 0031, and a policy written against
-- auth.uid() silently matches zero rows for every Clerk-issued login.
drop policy if exists hidden_ex_instructor_all on public.instructor_hidden_exercises;
create policy hidden_ex_instructor_all on public.instructor_hidden_exercises
  for all to authenticated
  using (instructor_id = public.current_app_user_id())
  with check (instructor_id = public.current_app_user_id());
