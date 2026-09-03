-- Fix: every per-user RLS policy in this schema still compares against
-- auth.uid(), unchanged since the original Supabase-Auth design (0001).
-- auth.uid() is:
--
--   select coalesce(
--     nullif(current_setting('request.jwt.claim.sub', true), ''),
--     (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
--   )::uuid
--
-- It casts the JWT's "sub" claim straight to uuid. Since the Clerk migration,
-- "sub" is a Clerk user id ("user_2abc..."), not a uuid, so that cast throws
-- "invalid input syntax for type uuid" for EVERY request — verified directly:
--
--   set local role authenticated;
--   set local request.jwt.claims = '{"sub":"user_2abcfake","role":"authenticated"}';
--   select auth.uid();  -- ERROR: invalid input syntax for type uuid
--
-- Every page that reads through the RLS-scoped client (lib/supabase/server.ts)
-- destructures `{ data }` from these queries without checking `error`, so the
-- Postgres error doesn't surface as a 500 — it just silently returns no rows.
-- That's why the dashboard, patient pages, onboarding, messaging etc. render
-- with empty/broken data instead of crashing: this is the deep root cause
-- behind "signup", "login", and "onboarding" all misbehaving at once.
--
-- Fix: add public.current_app_user_id(), a SECURITY DEFINER helper that reads
-- the Clerk id from the same JWT settings auth.uid() reads, then maps it to
-- the actual uuid via public.app_users (RLS-bypassing, since app_users itself
-- has zero policies and would otherwise deny this lookup to `authenticated`).
-- Every policy below is unchanged except substituting auth.uid() with this.

create or replace function public.current_app_user_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select app_id
  from public.app_users
  where clerk_id = coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )
$$;

revoke all on function public.current_app_user_id() from public;
grant execute on function public.current_app_user_id() to authenticated, anon;

-- instructors
drop policy if exists instructors_insert_self on public.instructors;
create policy instructors_insert_self on public.instructors
  for insert to authenticated
  with check (id = public.current_app_user_id());

drop policy if exists instructors_select_own on public.instructors;
create policy instructors_select_own on public.instructors
  for select to authenticated
  using (id = public.current_app_user_id());

drop policy if exists instructors_select_own_patient on public.instructors;
create policy instructors_select_own_patient on public.instructors
  for select to authenticated
  using (
    exists (
      select 1 from patients p
      where p.instructor_id = instructors.id and p.id = public.current_app_user_id()
    )
  );

drop policy if exists instructors_update_own on public.instructors;
create policy instructors_update_own on public.instructors
  for update to authenticated
  using (id = public.current_app_user_id())
  with check (id = public.current_app_user_id());

-- patients
drop policy if exists patients_delete_by_instructor on public.patients;
create policy patients_delete_by_instructor on public.patients
  for delete to authenticated
  using (instructor_id = public.current_app_user_id());

drop policy if exists patients_insert_by_instructor on public.patients;
create policy patients_insert_by_instructor on public.patients
  for insert to authenticated
  with check (instructor_id = public.current_app_user_id());

drop policy if exists patients_select on public.patients;
create policy patients_select on public.patients
  for select to authenticated
  using (instructor_id = public.current_app_user_id() or id = public.current_app_user_id());

drop policy if exists patients_update_by_instructor on public.patients;
create policy patients_update_by_instructor on public.patients
  for update to authenticated
  using (instructor_id = public.current_app_user_id())
  with check (instructor_id = public.current_app_user_id());

-- conditions (owner-only write policies; conditions_select_all is untouched)
drop policy if exists conditions_delete_own on public.conditions;
create policy conditions_delete_own on public.conditions
  for delete to authenticated
  using (created_by = public.current_app_user_id());

drop policy if exists conditions_insert_instructor on public.conditions;
create policy conditions_insert_instructor on public.conditions
  for insert to authenticated
  with check (
    created_by = public.current_app_user_id()
    and exists (select 1 from instructors i where i.id = public.current_app_user_id())
  );

drop policy if exists conditions_update_own on public.conditions;
create policy conditions_update_own on public.conditions
  for update to authenticated
  using (created_by = public.current_app_user_id())
  with check (created_by = public.current_app_user_id());

-- exercises (exercises_select_all is untouched)
drop policy if exists exercises_delete_own on public.exercises;
create policy exercises_delete_own on public.exercises
  for delete to authenticated
  using (created_by = public.current_app_user_id());

drop policy if exists exercises_insert_instructor on public.exercises;
create policy exercises_insert_instructor on public.exercises
  for insert to authenticated
  with check (
    created_by = public.current_app_user_id()
    and exists (select 1 from instructors i where i.id = public.current_app_user_id())
  );

drop policy if exists exercises_update_own on public.exercises;
create policy exercises_update_own on public.exercises
  for update to authenticated
  using (created_by = public.current_app_user_id())
  with check (created_by = public.current_app_user_id());

-- workouts (workouts_select_all is untouched)
drop policy if exists workouts_delete_owner on public.workouts;
create policy workouts_delete_owner on public.workouts
  for delete to authenticated
  using (created_by = public.current_app_user_id());

drop policy if exists workouts_insert_owner on public.workouts;
create policy workouts_insert_owner on public.workouts
  for insert to authenticated
  with check (
    created_by = public.current_app_user_id()
    and exists (select 1 from instructors i where i.id = public.current_app_user_id())
  );

drop policy if exists workouts_update_owner on public.workouts;
create policy workouts_update_owner on public.workouts
  for update to authenticated
  using (created_by = public.current_app_user_id())
  with check (created_by = public.current_app_user_id());

-- workout_exercises (workout_ex_select_all is untouched)
drop policy if exists workout_ex_write_owner on public.workout_exercises;
create policy workout_ex_write_owner on public.workout_exercises
  for all to authenticated
  using (
    exists (
      select 1 from workouts w
      where w.id = workout_exercises.workout_id and w.created_by = public.current_app_user_id()
    )
  )
  with check (
    exists (
      select 1 from workouts w
      where w.id = workout_exercises.workout_id and w.created_by = public.current_app_user_id()
    )
  );

-- patient_profiles
drop policy if exists patient_profiles_by_instructor on public.patient_profiles;
create policy patient_profiles_by_instructor on public.patient_profiles
  for all to authenticated
  using (
    exists (
      select 1 from patients p
      where p.id = patient_profiles.id and p.instructor_id = public.current_app_user_id()
    )
  )
  with check (
    exists (
      select 1 from patients p
      where p.id = patient_profiles.id and p.instructor_id = public.current_app_user_id()
    )
  );

drop policy if exists patient_profiles_self on public.patient_profiles;
create policy patient_profiles_self on public.patient_profiles
  for all to authenticated
  using (id = public.current_app_user_id())
  with check (id = public.current_app_user_id());

-- patient_messages
drop policy if exists patient_messages_instructor_read on public.patient_messages;
create policy patient_messages_instructor_read on public.patient_messages
  for select to authenticated
  using (instructor_id = public.current_app_user_id());

drop policy if exists patient_messages_instructor_write on public.patient_messages;
create policy patient_messages_instructor_write on public.patient_messages
  for insert to authenticated
  with check (
    instructor_id = public.current_app_user_id()
    and exists (
      select 1 from patients p
      where p.id = patient_messages.patient_id and p.instructor_id = public.current_app_user_id()
    )
  );

drop policy if exists patient_messages_patient_mark_read on public.patient_messages;
create policy patient_messages_patient_mark_read on public.patient_messages
  for update to authenticated
  using (patient_id = public.current_app_user_id())
  with check (patient_id = public.current_app_user_id());

drop policy if exists patient_messages_patient_read on public.patient_messages;
create policy patient_messages_patient_read on public.patient_messages
  for select to authenticated
  using (patient_id = public.current_app_user_id());

-- patient_feedback
drop policy if exists feedback_instructor_read on public.patient_feedback;
create policy feedback_instructor_read on public.patient_feedback
  for select to authenticated
  using (
    exists (
      select 1 from patients p
      where p.id = patient_feedback.patient_id and p.instructor_id = public.current_app_user_id()
    )
  );

drop policy if exists feedback_self on public.patient_feedback;
create policy feedback_self on public.patient_feedback
  for all to authenticated
  using (patient_id = public.current_app_user_id())
  with check (patient_id = public.current_app_user_id());

-- exercise_feedback
drop policy if exists exfeedback_instructor_read on public.exercise_feedback;
create policy exfeedback_instructor_read on public.exercise_feedback
  for select to authenticated
  using (
    exists (
      select 1 from patients p
      where p.id = exercise_feedback.patient_id and p.instructor_id = public.current_app_user_id()
    )
  );

drop policy if exists exfeedback_self on public.exercise_feedback;
create policy exfeedback_self on public.exercise_feedback
  for all to authenticated
  using (patient_id = public.current_app_user_id())
  with check (patient_id = public.current_app_user_id());

-- exercise_overrides
drop policy if exists exoverrides_instructor_write on public.exercise_overrides;
create policy exoverrides_instructor_write on public.exercise_overrides
  for all to authenticated
  using (
    exists (
      select 1 from patients p
      where p.id = exercise_overrides.patient_id and p.instructor_id = public.current_app_user_id()
    )
  )
  with check (
    exists (
      select 1 from patients p
      where p.id = exercise_overrides.patient_id and p.instructor_id = public.current_app_user_id()
    )
  );

drop policy if exists exoverrides_patient_read on public.exercise_overrides;
create policy exoverrides_patient_read on public.exercise_overrides
  for select to authenticated
  using (patient_id = public.current_app_user_id());

-- patient_documents
drop policy if exists patient_documents_instructor_read on public.patient_documents;
create policy patient_documents_instructor_read on public.patient_documents
  for select to authenticated
  using (
    exists (
      select 1 from patients p
      where p.id = patient_documents.patient_id and p.instructor_id = public.current_app_user_id()
    )
  );

drop policy if exists patient_documents_self on public.patient_documents;
create policy patient_documents_self on public.patient_documents
  for all to authenticated
  using (patient_id = public.current_app_user_id())
  with check (patient_id = public.current_app_user_id());

-- workout_logs
drop policy if exists workout_logs_delete_patient on public.workout_logs;
create policy workout_logs_delete_patient on public.workout_logs
  for delete to authenticated
  using (patient_id = public.current_app_user_id());

drop policy if exists workout_logs_insert_patient on public.workout_logs;
create policy workout_logs_insert_patient on public.workout_logs
  for insert to authenticated
  with check (patient_id = public.current_app_user_id());

drop policy if exists workout_logs_select on public.workout_logs;
create policy workout_logs_select on public.workout_logs
  for select to authenticated
  using (
    patient_id = public.current_app_user_id()
    or exists (
      select 1 from patients p
      where p.id = workout_logs.patient_id and p.instructor_id = public.current_app_user_id()
    )
  );

-- subscriptions
drop policy if exists subscriptions_self_read on public.subscriptions;
create policy subscriptions_self_read on public.subscriptions
  for select to authenticated
  using (user_id = public.current_app_user_id());
