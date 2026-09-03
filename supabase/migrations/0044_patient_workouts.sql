-- EasyPhysio — Migration 0044 : séances rattachées à un patient
-- À appliquer par Philippe (SQL Editor → New query → coller → Run). Rejouable.
--
-- EN CLAIR : quand un kiné clique « Ajuster la séance » pour un patient, l'app
-- crée une COPIE de la séance rattachée à ce patient (patient_id) et modifie
-- cette copie. Aujourd'hui, tout utilisateur connecté peut lire toutes les
-- séances. Après cette migration :
--   * une séance sans patient_id (plateforme ou cabinet) reste lisible par
--     tous les utilisateurs connectés, comme avant ;
--   * une séance rattachée à un patient n'est lisible QUE par ce patient et
--     par son kiné ;
--   * un kiné ne peut rattacher une séance qu'à l'un de SES patients ;
--   * les exercices d'une séance (workout_exercises) suivent la même règle.
-- Les règles de modification / suppression (créateur uniquement) ne changent
-- pas. Le trigger de la migration 0038 ne concerne que created_by is null,
-- donc jamais une copie (created_by = le kiné).

alter table public.workouts
  add column if not exists patient_id uuid references public.patients (id) on delete cascade,
  add column if not exists source_workout_id uuid references public.workouts (id) on delete set null;

create index if not exists idx_workouts_patient
  on public.workouts (patient_id) where patient_id is not null;

-- Lecture des séances.
drop policy if exists workouts_select_all on public.workouts;
drop policy if exists workouts_select_visible on public.workouts;
create policy workouts_select_visible on public.workouts
  for select to authenticated
  using (
    patient_id is null
    or patient_id = public.current_app_user_id()
    or exists (select 1 from public.patients p
               where p.id = workouts.patient_id
                 and p.instructor_id = public.current_app_user_id())
  );

-- Insertion : créateur = moi, je suis kiné, et si patient_id est renseigné
-- c'est un de mes patients.
drop policy if exists workouts_insert_owner on public.workouts;
create policy workouts_insert_owner on public.workouts
  for insert to authenticated
  with check (
    created_by = public.current_app_user_id()
    and exists (select 1 from public.instructors i where i.id = public.current_app_user_id())
    and (
      patient_id is null
      or exists (select 1 from public.patients p
                 where p.id = patient_id
                   and p.instructor_id = public.current_app_user_id())
    )
  );

-- Lecture des exercices d'une séance : même visibilité que la séance.
drop policy if exists workout_ex_select_all on public.workout_exercises;
drop policy if exists workout_ex_select_visible on public.workout_exercises;
create policy workout_ex_select_visible on public.workout_exercises
  for select to authenticated
  using (exists (
    select 1 from public.workouts w
    where w.id = workout_exercises.workout_id
      and (
        w.patient_id is null
        or w.patient_id = public.current_app_user_id()
        or exists (select 1 from public.patients p
                   where p.id = w.patient_id
                     and p.instructor_id = public.current_app_user_id())
      )
  ));
