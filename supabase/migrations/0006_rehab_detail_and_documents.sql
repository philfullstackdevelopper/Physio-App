-- Physio-App — Migration 0006: rehab detail + private medical documents
-- Run once in Supabase (SQL Editor -> New query -> paste -> Run). Safe to re-run.
--
-- Adds richer intake so exercises can be adapted:
--   • rehab_progress + history text on the patient's own profile
--   • a PRIVATE storage bucket + metadata table for medical documents (scans,
--     MRI, reports). Access is per-patient via RLS; the owning instructor can
--     read. NOTE: for real French patient data, medical documents must live on
--     HDS-certified hosting — this sets up the access model, not the hosting.

-- ---------------------------------------------------------------------------
-- 1. Rehab detail on the patient-owned profile
-- ---------------------------------------------------------------------------
alter table public.patient_profiles
  add column if not exists rehab_progress text; -- how far along recovery is
alter table public.patient_profiles
  add column if not exists history text;        -- free-text: what happened

-- ---------------------------------------------------------------------------
-- 2. Document metadata table (one row per uploaded file)
-- ---------------------------------------------------------------------------
create table if not exists public.patient_documents (
  id          uuid primary key default gen_random_uuid(),
  patient_id  uuid not null references public.patients (id) on delete cascade,
  storage_path text not null,   -- path inside the private bucket
  file_name   text not null,    -- original file name (display)
  uploaded_at timestamptz not null default now()
);

create index if not exists idx_patient_documents_patient on public.patient_documents (patient_id);

alter table public.patient_documents enable row level security;

-- Patient manages only their own document rows.
drop policy if exists patient_documents_self on public.patient_documents;
create policy patient_documents_self on public.patient_documents
  for all to authenticated
  using (patient_id = auth.uid())
  with check (patient_id = auth.uid());

-- Owning instructor may read their patients' document rows.
drop policy if exists patient_documents_instructor_read on public.patient_documents;
create policy patient_documents_instructor_read on public.patient_documents
  for select to authenticated
  using (
    exists (select 1 from public.patients p
            where p.id = patient_documents.patient_id and p.instructor_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- 3. Private storage bucket + object-level RLS
--    Files are stored at path  "<patient_id>/<filename>"  so the first folder
--    segment identifies the owner.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('patient-documents', 'patient-documents', false)
on conflict (id) do nothing;

-- Patient can upload/read/delete files under their own folder.
drop policy if exists patient_docs_owner_all on storage.objects;
create policy patient_docs_owner_all on storage.objects
  for all to authenticated
  using (
    bucket_id = 'patient-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'patient-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Owning instructor can read files belonging to their patients.
drop policy if exists patient_docs_instructor_read on storage.objects;
create policy patient_docs_instructor_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'patient-documents'
    and exists (
      select 1 from public.patients p
      where p.id::text = (storage.foldername(name))[1]
        and p.instructor_id = auth.uid()
    )
  );
