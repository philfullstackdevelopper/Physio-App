-- Physio-App — Migration 0013: scheduled télésoin sessions ("Séances prévues")
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run. Safe to re-run.
--
-- Adds a planned date/time to video_calls and a 'scheduled' status, so a kiné can
-- schedule a session in advance and the patient sees it under "Séances prévues".

alter table public.video_calls
  add column if not exists scheduled_at timestamptz;

-- Allow the new 'scheduled' status alongside the existing ones.
alter table public.video_calls
  drop constraint if exists video_calls_status_check;
alter table public.video_calls
  add constraint video_calls_status_check
  check (status in ('scheduled', 'active', 'ended'));

create index if not exists idx_video_calls_scheduled
  on public.video_calls (patient_id, scheduled_at);
