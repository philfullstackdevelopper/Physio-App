-- Physio-App — Migration 0012: record the patient's chosen intensity
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run. Safe to re-run.
--
-- ADDITIVE — one nullable column on an existing table. Nothing else is touched.
--
-- WHY: the in-session dial lets a patient run a set at up to +40% reps. That is
-- the only place in the app where load rises without the practitioner. Storing
-- the chosen level next to the difficulty rating is what stops it from being an
-- invisible decision: the instructor can see "this patient systematically works
-- 20% above what I prescribed", which is both clinically useful and the record
-- that protects them.
--
--   -2 = beaucoup plus doux  …  0 = prescription  …  +2 = beaucoup plus intense

alter table public.exercise_feedback
  add column if not exists intensity_level int check (intensity_level between -2 and 2);

comment on column public.exercise_feedback.intensity_level is
  'Session-local intensity the patient selected for this exercise (-2..+2). Never changes their prescription.';
