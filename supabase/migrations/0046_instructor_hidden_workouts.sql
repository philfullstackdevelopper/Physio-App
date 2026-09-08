-- Physio-App / EasyPhysio — Migration 0046: per-instructor template-séance hiding
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run. Safe to re-run.
--
-- Mirrors 0037_instructor_hidden_exercises.sql: "Séances prévues" (the shared,
-- read-only platform templates) lets a kiné hide a template they don't want
-- cluttering their own list — a personal filter, not a deletion. Hiding is
-- per-instructor: kiné A hiding a template never affects kiné B, and the
-- template itself is untouched.

create table if not exists public.instructor_hidden_workouts (
  instructor_id uuid not null references public.instructors (id) on delete cascade,
  workout_id    uuid not null references public.workouts (id) on delete cascade,
  hidden_at     timestamptz not null default now(),
  primary key (instructor_id, workout_id)
);

alter table public.instructor_hidden_workouts enable row level security;

-- Uses public.current_app_user_id() (migration 0031), not auth.uid() — this
-- project has been on Clerk since 0031, and a policy written against
-- auth.uid() silently matches zero rows for every Clerk-issued login.
drop policy if exists hidden_wk_instructor_all on public.instructor_hidden_workouts;
create policy hidden_wk_instructor_all on public.instructor_hidden_workouts
  for all to authenticated
  using (instructor_id = public.current_app_user_id())
  with check (instructor_id = public.current_app_user_id());
