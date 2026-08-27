-- Physio-App — Migration 0027: link feedback to a specific session
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run. Safe to re-run.
--
-- ADDITIVE — adds one nullable column to each table, touches nothing
-- existing, so the running app keeps working. Until now, patient_feedback
-- and exercise_feedback were only loosely tied to a session (patient_id +
-- workout_id + a roughly-matching timestamp) — not reliable enough to say
-- "here's exactly what the patient felt about THIS completed session" for
-- the new /patient/historique detail view. This links them explicitly.
-- Rows written before this migration keep workout_log_id = null; the
-- history page shows "no feedback recorded" for those rather than guessing.

alter table public.patient_feedback
  add column if not exists workout_log_id uuid references public.workout_logs (id) on delete set null;

alter table public.exercise_feedback
  add column if not exists workout_log_id uuid references public.workout_logs (id) on delete set null;

create index if not exists idx_feedback_log on public.patient_feedback (workout_log_id);
create index if not exists idx_exfeedback_log on public.exercise_feedback (workout_log_id);
