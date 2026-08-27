-- Physio-App — Migration 0028: patient can read their own instructor's name
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run. Safe to re-run.
--
-- ADDITIVE — adds one new SELECT policy on public.instructors, touches nothing
-- existing. Until now a patient's RLS-scoped Supabase client had no read
-- access to any instructors row (the only existing SELECT policy is
-- "id = auth.uid()", which never matches a patient). Needed so the patient
-- app can show "suivi par <kiné>" (PatientNav) without a service-role client.
--
-- Grants exactly: a patient may read the instructors row of the instructor
-- they are assigned to (patients.instructor_id), and nothing else — not any
-- other instructor, not to a patient who isn't theirs. Postgres OR's multiple
-- SELECT policies together, so this only adds access, it does not narrow the
-- existing instructors_select_own policy.

drop policy if exists instructors_select_own_patient on public.instructors;
create policy instructors_select_own_patient on public.instructors
  for select to authenticated
  using (
    exists (
      select 1 from public.patients p
      where p.instructor_id = instructors.id and p.id = auth.uid()
    )
  );
