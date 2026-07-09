-- Physio-App — Migration 0011: télésoin video calls
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run. Safe to re-run.
--
-- One row per télésoin video call between a kiné and one of THEIR patients.
-- The actual video runs in a swappable provider (Jitsi today, HDS-hosted later);
-- we only store who/when + the room name so both parties can join the same room.

create table if not exists public.video_calls (
  id         uuid primary key default gen_random_uuid(),
  kine_id    uuid not null references public.instructors (id) on delete cascade,
  patient_id uuid not null references public.patients (id) on delete cascade,
  room_name  text not null,
  status     text not null default 'active' check (status in ('active', 'ended')),
  created_at timestamptz not null default now(),
  ended_at   timestamptz
);

create index if not exists idx_video_calls_patient on public.video_calls (patient_id, created_at desc);
create index if not exists idx_video_calls_kine on public.video_calls (kine_id, created_at desc);

alter table public.video_calls enable row level security;

-- Kiné: create/read/update calls ONLY for their own patients (both the call's
-- kine_id must be them AND the patient must belong to them).
drop policy if exists video_calls_kine on public.video_calls;
create policy video_calls_kine on public.video_calls
  for all to authenticated
  using (
    kine_id = auth.uid()
    and exists (
      select 1 from public.patients p
      where p.id = video_calls.patient_id and p.instructor_id = auth.uid()
    )
  )
  with check (
    kine_id = auth.uid()
    and exists (
      select 1 from public.patients p
      where p.id = video_calls.patient_id and p.instructor_id = auth.uid()
    )
  );

-- Patient: read only their own calls (so they can join).
drop policy if exists video_calls_patient_read on public.video_calls;
create policy video_calls_patient_read on public.video_calls
  for select to authenticated
  using (patient_id = auth.uid());
