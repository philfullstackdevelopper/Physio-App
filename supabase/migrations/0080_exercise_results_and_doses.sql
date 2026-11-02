-- =============================================================================
-- 0080 — Suivi par exercice, doses réglables, retours « non lus »
-- (Philippe, 2026-11-02, inspiré de l'audit Fullphysio)
--
-- Ce que ça ajoute, en clair :
--
-- 1. public.exercise_results — une ligne par exercice d'une séance faite :
--    « fait » ou « passé », et, si le patient l'a donné, sa douleur (0-10) et
--    la difficulté ressentie (0-10) pour CET exercice.
--    (Le suivi par exercice avait été retiré en mars, migration 0036 ; il
--    revient à la demande de Philippe, en plus simple : rien n'est obligatoire.)
--    Règles d'accès :
--      • le patient peut LIRE et AJOUTER ses propres lignes, et seulement pour
--        une séance qu'il a lui-même enregistrée ;
--      • son kiné peut LIRE les lignes de ses propres patients — rien d'autre ;
--      • personne ne peut modifier une ligne après coup (pas de règle UPDATE) ;
--        le patient peut supprimer les siennes (comme ses séances) ;
--      • un kiné suspendu ou non validé ne voit rien (même règle « restrictive »
--        que 0063 sur les autres données patient) ;
--      • l'administrateur peut lire, comme pour les séances (0071).
--    Si la séance ou le patient est supprimé, ses lignes partent avec.
--
-- 2. Doses par exercice d'une séance (public.workout_exercises) : séries,
--    répétitions, temps de maintien. Vide = la règle habituelle (3 séries de
--    8 à 12, ou ce que dit la consigne). Aucune règle d'accès ne change : seul
--    l'auteur de la séance peut déjà modifier ses lignes.
--
-- 3. public.patients.feedback_seen_at — jusqu'à quand le kiné a vu les
--    retours de ce patient (tout ce qui est plus récent est « non lu »). Le kiné
--    peut déjà modifier la fiche de ses patients (comme « suivi », 0045). Un
--    garde-fou empêche le PATIENT de toucher à cette date.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Résultats par exercice
-- ---------------------------------------------------------------------------
create table if not exists public.exercise_results (
  id             uuid primary key default gen_random_uuid(),
  patient_id     uuid not null references public.patients (id) on delete cascade,
  workout_log_id uuid not null references public.workout_logs (id) on delete cascade,
  exercise_id    uuid references public.exercises (id) on delete set null,
  exercise_name  text not null,
  position       int  not null default 0,
  status         text not null check (status in ('done', 'skipped')),
  pain           int  check (pain between 0 and 10),
  difficulty     int  check (difficulty between 0 and 10),
  created_at     timestamptz not null default now()
);

create index if not exists exercise_results_log_idx on public.exercise_results (workout_log_id);
create index if not exists exercise_results_patient_idx on public.exercise_results (patient_id, created_at desc);

alter table public.exercise_results enable row level security;
alter table public.exercise_results force row level security;

-- Le patient : ses lignes, rattachées à une de SES séances.
drop policy if exists exercise_results_patient_select on public.exercise_results;
create policy exercise_results_patient_select on public.exercise_results
  for select to public
  using (patient_id = public.current_app_user_id());

drop policy if exists exercise_results_patient_insert on public.exercise_results;
create policy exercise_results_patient_insert on public.exercise_results
  for insert to public
  with check (
    patient_id = public.current_app_user_id()
    and exists (
      select 1 from public.workout_logs l
      where l.id = exercise_results.workout_log_id
        and l.patient_id = public.current_app_user_id()
    )
  );

drop policy if exists exercise_results_patient_delete on public.exercise_results;
create policy exercise_results_patient_delete on public.exercise_results
  for delete to public
  using (patient_id = public.current_app_user_id());

-- Le kiné : lecture seule, ses patients uniquement.
drop policy if exists exercise_results_instructor_read on public.exercise_results;
create policy exercise_results_instructor_read on public.exercise_results
  for select to public
  using (
    exists (
      select 1 from public.patients p
      where p.id = exercise_results.patient_id
        and p.instructor_id = public.current_app_user_id()
    )
  );

-- Administrateur : lecture, comme workout_logs (0071).
drop policy if exists exercise_results_admin_read on public.exercise_results;
create policy exercise_results_admin_read on public.exercise_results
  for select to public
  using (current_setting('app.admin_bypass', true) = 'admin_read');

-- Kiné suspendu / non validé : rien (même règle que 0063).
drop policy if exists exercise_results_not_blocked_instructor on public.exercise_results;
create policy exercise_results_not_blocked_instructor on public.exercise_results
  as restrictive for all to public
  using (not public.current_user_is_blocked_instructor())
  with check (not public.current_user_is_blocked_instructor());

-- ---------------------------------------------------------------------------
-- 2. Doses par exercice d'une séance
-- ---------------------------------------------------------------------------
alter table public.workout_exercises
  add column if not exists sets         int check (sets between 1 and 10),
  add column if not exists reps         int check (reps between 1 and 100),
  add column if not exists hold_seconds int check (hold_seconds between 1 and 600);

-- ---------------------------------------------------------------------------
-- 3. Retours « vus » par le kiné
-- ---------------------------------------------------------------------------
alter table public.patients
  add column if not exists feedback_seen_at timestamptz;

create or replace function internal.guard_feedback_seen_by_instructor()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  -- Connexion serveur directe (lib/db/admin.ts) : current_app_user_id() vide.
  if new.feedback_seen_at is distinct from old.feedback_seen_at
     and public.current_app_user_id() is not null
     and old.instructor_id is distinct from public.current_app_user_id() then
    raise exception 'Seul le kiné du patient peut marquer ses retours comme vus.';
  end if;
  return new;
end;
$$;

drop trigger if exists patients_guard_feedback_seen on public.patients;
create trigger patients_guard_feedback_seen
  before update on public.patients
  for each row execute function internal.guard_feedback_seen_by_instructor();
