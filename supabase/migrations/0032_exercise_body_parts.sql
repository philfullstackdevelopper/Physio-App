-- Physio-App — Migration 0032: exercise library body-part categories
--
-- Adds a fixed-vocabulary, many-to-many way to tag exercises by body part,
-- for the new category grid on /dashboard/exercises. Reuses the same 9
-- categories already defined in lib/exercise/category.ts (the séance
-- editor's automatic grouping) so there's one shared vocabulary, not two —
-- that file is untouched and keeps working exactly as before.
--
-- Existing exercises are backfilled below using the same name-matching
-- heuristic as lib/exercise/category.ts, ported to SQL. That port is used
-- once, right here, to seed initial tags for exercises that predate this
-- feature. From now on, new exercises get their tags directly from the
-- instructor at creation time (multi-select on the "Nouvel exercice" form)
-- — tags are not editable after creation in this first version.

-- ---------------------------------------------------------------------------
-- 1. Fixed vocabulary
-- ---------------------------------------------------------------------------

create table if not exists public.body_parts (
  id       uuid primary key default gen_random_uuid(),
  slug     text not null unique,
  label    text not null,
  position integer not null
);

insert into public.body_parts (slug, label, position) values
  ('cheville-pied',       'Cheville & pied',              1),
  ('genou-jambe',         'Genou & jambe',                2),
  ('hanche-fessiers',     'Hanche & fessiers',            3),
  ('dos-lombaires',       'Dos & lombaires',              4),
  ('cervicales-cou',      'Cervicales & cou',             5),
  ('epaule',              'Épaule',                       6),
  ('poignet-main-coude',  'Poignet, main & coude',        7),
  ('tronc-gainage-abdos', 'Tronc, gainage & abdominaux',  8),
  ('equilibre-general',   'Équilibre & général',          9)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- 2. Join table (an exercise may carry several tags)
-- ---------------------------------------------------------------------------

create table if not exists public.exercise_body_parts (
  id           uuid primary key default gen_random_uuid(),
  exercise_id  uuid not null references public.exercises (id) on delete cascade,
  body_part_id uuid not null references public.body_parts (id) on delete cascade,
  created_at   timestamptz not null default now(),
  unique (exercise_id, body_part_id)
);

create index if not exists idx_ex_body_parts_exercise on public.exercise_body_parts (exercise_id);
create index if not exists idx_ex_body_parts_bp        on public.exercise_body_parts (body_part_id);

-- ---------------------------------------------------------------------------
-- 3. RLS
-- ---------------------------------------------------------------------------

alter table public.body_parts          enable row level security;
alter table public.exercise_body_parts enable row level security;

-- body_parts: fixed vocabulary, readable by every logged-in user. No
-- insert/update/delete policy at all — the 9 rows are managed only via
-- migration, same as any other lookup table; the API can never add,
-- rename, or remove a category.
drop policy if exists body_parts_select_all on public.body_parts;
create policy body_parts_select_all on public.body_parts
  for select to authenticated using (true);

-- exercise_body_parts: readable by everyone logged in (same as exercises
-- itself). An instructor may attach tags only to an exercise they
-- themselves created (created_by = their own id) — matches "locked at
-- creation, not editable later". No update/delete policy: once written,
-- rows are only removed by deleting the exercise itself, which cascades
-- here automatically via the foreign key above.
drop policy if exists ex_body_parts_select_all on public.exercise_body_parts;
create policy ex_body_parts_select_all on public.exercise_body_parts
  for select to authenticated using (true);

drop policy if exists ex_body_parts_insert_owner on public.exercise_body_parts;
create policy ex_body_parts_insert_owner on public.exercise_body_parts
  for insert to authenticated
  with check (
    exists (
      select 1 from public.exercises e
      where e.id = exercise_id and e.created_by = public.current_app_user_id()
    )
  );

-- ---------------------------------------------------------------------------
-- 4. One-time backfill for exercises that predate this feature
-- ---------------------------------------------------------------------------
-- Ports lib/exercise/category.ts's categoryFor() into SQL, first-match-wins,
-- same rule order. Used only in this loop, never called again afterward.

do $$
declare
  r   record;
  cat text;
begin
  for r in select id, lower(name) as n from public.exercises loop
    if r.n like '%sur place%' then
      cat := 'equilibre-general';
    elsif r.n like '%cervical%' or r.n like '%menton%' or r.n like '%nuque%'
       or r.n like '%trapèze%' or r.n like '%angulaire%' or r.n like '%inclinaison%'
       or r.n ~ '\mcou\M' then -- whole word "cou" only — avoids matching "coude"
      cat := 'cervicales-cou';
    elsif r.n like '%épaule%' or r.n like '%scapulaire%' or r.n like '%pendulaire%'
       or r.n like '%rétropulsion%' or r.n like '%doigts au mur%' or r.n like '%bras%'
       or r.n like '%élévation%' or r.n like '%rotation externe%' or r.n like '%rotation interne%' then
      cat := 'epaule';
    elsif r.n like '%poignet%' or r.n like '%serrage%' or r.n like '%doigts%'
       or r.n like '%coude%' or r.n like '%épicondyl%' or r.n like '%bouteille%' then
      cat := 'poignet-main-coude';
    elsif r.n like '%cheville%' or r.n like '%mollet%' or r.n like '%pointe%'
       or r.n like '%éversion%' or r.n like '%eversion%' or r.n like '%inversion%'
       or r.n like '%orteils%' or r.n like '%talons%' or r.n like '%alphabet%'
       or r.n like '%dorsale%' then
      cat := 'cheville-pied';
    elsif r.n like '%hanche%' or r.n like '%coquille%' or r.n like '%clam%'
       or r.n like '%marche latérale%' or r.n like '%fessier%' or r.n like '%piriforme%'
       or r.n like '%psoas%' then
      cat := 'hanche-fessiers';
    elsif r.n like '%gainage%' or r.n like '%planche%' or r.n like '%crunch%'
       or r.n like '%abdominal%' or r.n like '%respiration%' or r.n like '%tronc%'
       or r.n like '%postural%' then
      cat := 'tronc-gainage-abdos';
    elsif r.n like '%genou%' or r.n like '%quadriceps%' or r.n like '%assis-debout%'
       or r.n like '%mini-squat%' or r.n like '%montée de marche%' or r.n like '%squat%'
       or r.n like '%fente%' or r.n like '%ischio%' then
      cat := 'genou-jambe';
    elsif r.n like '%lombaire%' or r.n like '%bascule du bassin%' or r.n like '%chat-vache%'
       or r.n like '%quadrupède%' or r.n like '%cobra%' or r.n like '%boule%' or r.n like '%dos%' then
      cat := 'dos-lombaires';
    else
      cat := 'equilibre-general';
    end if;

    insert into public.exercise_body_parts (exercise_id, body_part_id)
    select r.id, bp.id from public.body_parts bp where bp.slug = cat
    on conflict (exercise_id, body_part_id) do nothing;
  end loop;
end $$;
