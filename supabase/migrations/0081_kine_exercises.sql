-- =============================================================================
-- 0081 — Exercices créés par les kinés (idée de Jonathan Feltus, Philippe,
-- 2026-11-04) : pour un patient, pour sa banque, ou proposés à tous.
--
-- En clair, pour Philippe (CLAUDE.md §3 : chaque règle expliquée avant d'être
-- appliquée) :
--
--  1. QUI VOIT UN EXERCICE (la règle de lecture change).
--     Jusqu'ici, toute personne connectée lisait TOUS les exercices : un
--     exercice créé par un kiné apparaissait chez tous les autres kinés.
--     Désormais un exercice est visible :
--       - par tout le monde s'il vient de la plateforme (créé par EasyPhysio),
--         ou s'il a été proposé par un kiné ET publié par Philippe ;
--       - sinon, seulement par le kiné qui l'a créé, et par SES patients ;
--       - et s'il est réservé à un patient, seulement par ce patient-là (et
--         son kiné). Les autres patients du même kiné ne le voient pas.
--     Rien ne change pour les 306 exercices de la plateforme.
--
--  2. CE QU'UN KINÉ PEUT ÉCRIRE.
--     Il crée et modifie ses propres exercices, comme avant. En plus :
--       - il ne peut réserver un exercice qu'à un de SES patients ;
--       - il peut demander la publication (« en vérification »), mais lui seul
--         ne peut jamais se publier : seul Philippe, depuis /admin, publie ;
--       - une fois publié, l'exercice est figé (d'autres kinés l'utilisent
--         peut-être) : le kiné ne peut plus le modifier ni le supprimer ;
--       - les champs de vérification (date, message de Philippe, nom de
--         l'auteur affiché) ne sont écrits que par /admin.
--
--  3. RÉCOMPENSE. Une petite table « remises » (instructor_fee_waivers) note
--     jusqu'à quand EasyPhysio ne prend rien sur les paiements des patients
--     d'un kiné (5 exercices publiés). Chaque kiné ne lit que SA ligne ;
--     personne ne peut y écrire depuis le navigateur.
--
--  4. SUPPRESSION D'UN KINÉ. Ses exercices privés partent avec lui (avant, ils
--     seraient devenus des exercices « plateforme » visibles par tous). Ses
--     exercices publiés restent, au nom de la plateforme.
--
-- Rejouable sans risque. Sur Scalingo, le journal schema_migrations est
-- incomplet : appliquer CE fichier seul (node scripts/migrate.mjs --only).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Nouvelles colonnes
-- ---------------------------------------------------------------------------

alter table public.exercises
  add column if not exists patient_id uuid references public.patients (id) on delete cascade,
  add column if not exists publication_status text not null default 'private',
  add column if not exists submitted_at timestamptz,
  add column if not exists reviewed_at timestamptz,
  add column if not exists review_note text,
  add column if not exists author_label text,
  add column if not exists filming_consent_at timestamptz,
  add column if not exists source_exercise_id uuid references public.exercises (id) on delete set null,
  add column if not exists admin_seen_at timestamptz;

alter table public.exercises drop constraint if exists exercises_publication_status_check;
alter table public.exercises add constraint exercises_publication_status_check
  check (publication_status in ('private', 'pending', 'published', 'changes_requested', 'declined'));

-- Un exercice réservé à un patient ne peut pas être proposé à tous.
alter table public.exercises drop constraint if exists exercises_patient_not_public;
alter table public.exercises add constraint exercises_patient_not_public
  check (patient_id is null or publication_status in ('private', 'changes_requested', 'declined'));

-- Les exercices de la plateforme sont, par définition, publiés. (Sur
-- Scalingo, la table impose ses règles même au propriétaire : on les lève le
-- temps de cette mise à jour, comme les migrations 0068 à 0079.)
alter table public.exercises no force row level security;
update public.exercises set publication_status = 'published'
where created_by is null and publication_status <> 'published';
alter table public.exercises force row level security;

create index if not exists exercises_created_by_idx on public.exercises (created_by) where created_by is not null;
create index if not exists exercises_pending_idx on public.exercises (submitted_at) where publication_status = 'pending';

-- ---------------------------------------------------------------------------
-- 2. Lecture : qui voit quoi
-- ---------------------------------------------------------------------------

drop policy if exists exercises_select_signed_in on public.exercises;
drop policy if exists exercises_select_visible on public.exercises;
create policy exercises_select_visible on public.exercises
  for select
  using (
    public.current_app_user_id() is not null
    and (
      created_by is null
      or publication_status = 'published'
      or created_by = public.current_app_user_id()
      or exists (
        select 1 from public.patients p
        where p.id = public.current_app_user_id()
          and p.instructor_id = exercises.created_by
          and (exercises.patient_id is null or exercises.patient_id = p.id)
      )
    )
  );

-- Les fonctions de /admin (section 6) lisent et écrivent à travers ce seul
-- « passe » nommé, posé par elles-mêmes juste avant, et retiré juste après.
drop policy if exists exercises_admin_read on public.exercises;
create policy exercises_admin_read on public.exercises
  for select
  using (current_setting('app.admin_bypass', true) = 'admin_read');
drop policy if exists exercises_review_bypass on public.exercises;
create policy exercises_review_bypass on public.exercises
  for all
  using (current_setting('app.admin_bypass', true) = 'review_exercise')
  with check (current_setting('app.admin_bypass', true) = 'review_exercise');

-- ---------------------------------------------------------------------------
-- 3. Écriture : un kiné, ses exercices, ses patients
-- ---------------------------------------------------------------------------

drop policy if exists exercises_insert_instructor on public.exercises;
create policy exercises_insert_instructor on public.exercises
  for insert
  with check (
    created_by = public.current_app_user_id()
    and exists (select 1 from public.instructors i where i.id = public.current_app_user_id())
    and publication_status in ('private', 'pending')
    and (
      patient_id is null
      or exists (select 1 from public.patients p
                 where p.id = patient_id and p.instructor_id = public.current_app_user_id())
    )
  );

drop policy if exists exercises_update_own on public.exercises;
create policy exercises_update_own on public.exercises
  for update
  using (created_by = public.current_app_user_id())
  with check (
    created_by = public.current_app_user_id()
    and (
      patient_id is null
      or exists (select 1 from public.patients p
                 where p.id = patient_id and p.instructor_id = public.current_app_user_id())
    )
  );

-- Garde-fou : ce que la règle d'écriture ne peut pas exprimer seule.
create or replace function public.exercises_guard_kine_changes()
returns trigger
language plpgsql
as $$
declare
  v_bypass text := coalesce(current_setting('app.admin_bypass', true), '');
begin
  if v_bypass = 'review_exercise' then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  if tg_op = 'DELETE' then
    if old.created_by is not null and old.publication_status = 'published' then
      raise exception 'Un exercice publié ne peut plus être supprimé : d''autres kinés l''utilisent peut-être.';
    end if;
    return old;
  end if;

  if tg_op = 'INSERT' then
    -- Les exercices de la plateforme (created_by null) n'arrivent que par les
    -- migrations : on ne touche pas à leur statut.
    if new.created_by is null then
      return new;
    end if;
    if new.publication_status not in ('private', 'pending') then
      raise exception 'Seul EasyPhysio peut publier un exercice.';
    end if;
    new.submitted_at := case when new.publication_status = 'pending' then now() else null end;
    new.reviewed_at := null;
    new.review_note := null;
    new.author_label := null;
    new.admin_seen_at := null;
    return new;
  end if;

  -- UPDATE
  if old.created_by is null then
    -- Exercice plateforme : seul le chemin admin de la vidéo existe déjà
    -- (app.admin_bypass = 'set_exercise_media'), il ne change que la vidéo.
    return new;
  end if;

  if old.publication_status = 'published' then
    raise exception 'Un exercice publié ne peut plus être modifié. Écrivez à EasyPhysio pour le faire évoluer.';
  end if;

  if new.publication_status is distinct from old.publication_status
     and new.publication_status not in ('private', 'pending') then
    raise exception 'Seul EasyPhysio peut publier un exercice.';
  end if;

  -- Champs écrits seulement par /admin.
  new.reviewed_at := old.reviewed_at;
  new.review_note := old.review_note;
  new.author_label := old.author_label;
  new.admin_seen_at := old.admin_seen_at;
  new.created_by := old.created_by;

  if new.publication_status = 'pending' and old.publication_status is distinct from 'pending' then
    new.submitted_at := now();
  elsif new.publication_status <> 'pending' then
    new.submitted_at := null;
  else
    new.submitted_at := old.submitted_at;
  end if;

  return new;
end;
$$;

drop trigger if exists exercises_guard_kine_changes on public.exercises;
create trigger exercises_guard_kine_changes
  before insert or update or delete on public.exercises
  for each row execute function public.exercises_guard_kine_changes();

-- ---------------------------------------------------------------------------
-- 4. Récompense : 5 exercices publiés
-- ---------------------------------------------------------------------------

create table if not exists public.instructor_fee_waivers (
  instructor_id uuid primary key references public.instructors (id) on delete cascade,
  waived_until date not null,
  granted_at timestamptz not null default now()
);

alter table public.instructor_fee_waivers enable row level security;
-- Comme toutes les tables sur Scalingo (un seul rôle de base) : les règles
-- valent aussi pour le propriétaire.
alter table public.instructor_fee_waivers force row level security;

drop policy if exists instructor_fee_waivers_select_own on public.instructor_fee_waivers;
create policy instructor_fee_waivers_select_own on public.instructor_fee_waivers
  for select
  using (instructor_id = public.current_app_user_id());
-- Aucune règle d'écriture pour les kinés : seule la fonction de /admin
-- (internal.admin_review_exercise) écrit, à travers ce passe nommé.
drop policy if exists instructor_fee_waivers_review_bypass on public.instructor_fee_waivers;
create policy instructor_fee_waivers_review_bypass on public.instructor_fee_waivers
  for all
  using (current_setting('app.admin_bypass', true) = 'review_exercise')
  with check (current_setting('app.admin_bypass', true) = 'review_exercise');

-- ---------------------------------------------------------------------------
-- 5. Suppression d'un kiné : ses exercices privés partent avec lui
-- ---------------------------------------------------------------------------

create or replace function public.instructors_drop_private_exercises()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_previous text := coalesce(current_setting('app.admin_bypass', true), '');
begin
  perform set_config('app.admin_bypass', 'review_exercise', true);
  delete from public.exercises
  where created_by = old.id and publication_status <> 'published';
  perform set_config('app.admin_bypass', v_previous, true);
  return old;
end;
$$;

drop trigger if exists instructors_drop_private_exercises on public.instructors;
create trigger instructors_drop_private_exercises
  before delete on public.instructors
  for each row execute function public.instructors_drop_private_exercises();

-- ---------------------------------------------------------------------------
-- 6. Fonctions serveur pour /admin (schéma internal, jamais exposé)
-- ---------------------------------------------------------------------------

create or replace function internal.admin_list_kine_exercises()
returns table (
  id uuid,
  name text,
  instructions text,
  equipment text[],
  media_url text,
  created_at timestamptz,
  publication_status text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  review_note text,
  for_one_patient boolean,
  filming_consent_at timestamptz,
  admin_seen_at timestamptz,
  source_name text,
  body_parts text,
  author_id uuid,
  author_name text,
  author_cabinet text,
  author_email text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- admin_read : la lecture « admin » déjà utilisée pour les kinés (0057).
  perform set_config('app.admin_bypass', 'admin_read', true);
  return query
  select e.id, e.name, e.instructions, e.equipment, e.media_url, e.created_at,
         e.publication_status, e.submitted_at, e.reviewed_at, e.review_note,
         e.patient_id is not null, e.filming_consent_at, e.admin_seen_at,
         src.name,
         (select string_agg(bp.label, ', ' order by bp.position)
            from public.exercise_body_parts ebp
            join public.body_parts bp on bp.id = ebp.body_part_id
           where ebp.exercise_id = e.id),
         i.id, i.full_name, i.cabinet_name, i.email
  from public.exercises e
  join public.instructors i on i.id = e.created_by
  left join public.exercises src on src.id = e.source_exercise_id
  order by e.created_at desc
  limit 300;
  perform set_config('app.admin_bypass', '', true);
end;
$$;

-- p_decision : 'publish' | 'changes' | 'decline'. Renvoie le nombre
-- d'exercices publiés de l'auteur et la date de remise (si elle vient d'être
-- accordée ou existait déjà).
create or replace function internal.admin_review_exercise(
  p_exercise_id uuid,
  p_decision text,
  p_note text,
  p_reward_threshold integer,
  p_reward_months integer
)
returns table (published_count integer, waived_until date)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_author uuid;
  v_label text;
  v_count integer;
  v_until date;
begin
  if p_decision not in ('publish', 'changes', 'decline') then
    raise exception 'décision inconnue';
  end if;
  if p_decision <> 'publish' and coalesce(btrim(p_note), '') = '' then
    raise exception 'Un message au kiné est nécessaire pour demander une modification ou garder l''exercice privé.';
  end if;

  perform set_config('app.admin_bypass', 'review_exercise', true);

  select e.created_by into v_author from public.exercises e
  where e.id = p_exercise_id and e.created_by is not null and e.patient_id is null;
  if v_author is null then
    raise exception 'exercice introuvable';
  end if;

  perform set_config('app.admin_bypass', 'admin_read', true);
  select nullif(btrim(concat_ws(' · ', nullif(btrim(i.full_name), ''), nullif(btrim(i.cabinet_name), ''))), '')
    into v_label
  from public.instructors i where i.id = v_author;
  perform set_config('app.admin_bypass', 'review_exercise', true);

  update public.exercises
  set publication_status = case p_decision when 'publish' then 'published'
                                           when 'changes' then 'changes_requested'
                                           else 'declined' end,
      reviewed_at = now(),
      review_note = nullif(btrim(p_note), ''),
      author_label = case when p_decision = 'publish' then v_label else author_label end,
      admin_seen_at = coalesce(admin_seen_at, now())
  where id = p_exercise_id;

  select count(*)::integer into v_count from public.exercises
  where created_by = v_author and publication_status = 'published';

  if p_decision = 'publish' and v_count >= p_reward_threshold then
    insert into public.instructor_fee_waivers (instructor_id, waived_until)
    values (v_author, (current_date + make_interval(months => p_reward_months))::date)
    on conflict (instructor_id) do nothing;
  end if;

  select w.waived_until into v_until from public.instructor_fee_waivers w where w.instructor_id = v_author;
  perform set_config('app.admin_bypass', '', true);
  return query select v_count, v_until;
end;
$$;

create or replace function internal.admin_mark_exercise_seen(p_exercise_id uuid, p_seen boolean)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform set_config('app.admin_bypass', 'review_exercise', true);
  update public.exercises
  set admin_seen_at = case when p_seen then now() else null end
  where id = p_exercise_id and created_by is not null;
  perform set_config('app.admin_bypass', '', true);
end;
$$;
