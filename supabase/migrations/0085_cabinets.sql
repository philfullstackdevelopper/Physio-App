-- =============================================================================
-- 0085 — Cabinets : les kinés d'un même cabinet se retrouvent et partagent
-- leurs exercices (Philippe, 2026-11-08).
--
-- En clair, pour Philippe (CLAUDE.md §3 : chaque règle expliquée avant d'être
-- appliquée) :
--
--  1. UN CABINET (table cabinets) : nom, adresse, ville. Le premier kiné qui
--     l'inscrit en devient le « fondateur ». Les autres kinés le retrouvent à
--     l'inscription (recherche par nom ou par ville) et demandent à le
--     rejoindre.
--       - Seuls les membres d'un cabinet voient sa fiche. La recherche à
--         l'inscription passe par le serveur et ne montre que nom, ville et
--         nombre de kinés — jamais qui ils sont.
--       - Personne n'écrit dans ces tables depuis le navigateur : seul le
--         serveur les modifie, après avoir vérifié qui est connecté.
--
--  2. LES MEMBRES (table cabinet_members) : un kiné appartient à UN seul
--     cabinet au plus. Une demande pour rejoindre reste « en attente » tant
--     qu'un membre du cabinet ne l'a pas acceptée : impossible d'entrer dans
--     un cabinet sans l'accord de quelqu'un qui y est déjà.
--       - Chaque kiné voit sa propre adhésion ; les membres actifs voient la
--         liste de leur cabinet (y compris les demandes en attente).
--       - Le fondateur peut retirer un membre ; chacun peut partir. Si le
--         fondateur part, le plus ancien membre le remplace ; le dernier qui
--         part supprime le cabinet.
--       - Ne donne accès à AUCUN patient d'un collègue : seuls les exercices
--         partagés circulent (point 3). Les patients restent ceux de leur kiné.
--
--  3. EXERCICES PARTAGÉS AVEC LE CABINET : un kiné qui crée un exercice choisit
--     « privé » (lui et ses patients, comme avant) ou « partagé avec mon
--     cabinet ». Un exercice partagé est visible par les kinés ACTIFS de son
--     cabinet, tant que son auteur en fait partie. Un exercice réservé à un
--     seul patient reste toujours privé.
--
--  4. UN PATIENT VOIT LES EXERCICES DE SES SÉANCES : en plus de la règle
--     existante (exercices de la plateforme, publiés, ou créés par son kiné),
--     un patient peut lire un exercice qui figure dans une séance qui lui est
--     attribuée. Ainsi, quand son kiné lui donne un exercice partagé par un
--     collègue, le patient le voit ; et sa séance ne casse pas si l'auteur
--     quitte le cabinet plus tard. Il ne voit rien d'autre.
--
-- L'ancienne table cabinet_memberships (0078, lien de facturation de l'ancien
-- modèle) n'est ni utilisée ni modifiée. Aucune autre règle d'accès ne change.
-- Rejouable sans risque. Sur Scalingo, appliquer CE fichier seul
-- (node scripts/migrate.mjs --only 0085_cabinets.sql).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Cabinets et membres
-- ---------------------------------------------------------------------------

create table if not exists public.cabinets (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(btrim(name)) between 2 and 120),
  address     text check (address is null or length(address) <= 300),
  city        text check (city is null or length(city) <= 120),
  postal_code text check (postal_code is null or postal_code ~ '^[0-9A-Za-z -]{3,10}$'),
  created_by  uuid references public.instructors (id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists cabinets_name_idx on public.cabinets (lower(name));

create table if not exists public.cabinet_members (
  instructor_id uuid primary key references public.instructors (id) on delete cascade,
  cabinet_id    uuid not null references public.cabinets (id) on delete cascade,
  role          text not null default 'member' check (role in ('owner', 'member')),
  status        text not null default 'pending' check (status in ('pending', 'active')),
  requested_at  timestamptz not null default now(),
  joined_at     timestamptz,
  decided_by    uuid references public.instructors (id) on delete set null
);
create index if not exists cabinet_members_cabinet_idx on public.cabinet_members (cabinet_id, status);

alter table public.cabinets enable row level security;
alter table public.cabinets force row level security;
alter table public.cabinet_members enable row level security;
alter table public.cabinet_members force row level security;

-- Index « kiné → cabinet actif », tenu à jour automatiquement à partir de
-- cabinet_members (déclencheur ci-dessous). Les règles d'accès lisent CET
-- index, jamais cabinet_members elle-même : sinon la règle de lecture de
-- cabinet_members s'appellerait elle-même en boucle.
create table if not exists public.cabinet_active_index (
  instructor_id uuid primary key references public.instructors (id) on delete cascade,
  cabinet_id    uuid not null references public.cabinets (id) on delete cascade
);
alter table public.cabinet_active_index enable row level security;
alter table public.cabinet_active_index force row level security;

drop policy if exists cabinet_active_index_lookup on public.cabinet_active_index;
create policy cabinet_active_index_lookup on public.cabinet_active_index
  for select
  using (current_setting('app.cabinet_lookup', true) = 'on'
         or current_setting('app.admin_bypass', true) in ('cabinet', 'admin_read'));

drop policy if exists cabinet_active_index_server on public.cabinet_active_index;
create policy cabinet_active_index_server on public.cabinet_active_index
  for all
  using (current_setting('app.admin_bypass', true) = 'cabinet')
  with check (current_setting('app.admin_bypass', true) = 'cabinet');

create or replace function public.cabinet_members_sync_index()
returns trigger
language plpgsql
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    delete from public.cabinet_active_index where instructor_id = old.instructor_id;
  end if;
  if tg_op in ('INSERT', 'UPDATE') and new.status = 'active' then
    insert into public.cabinet_active_index (instructor_id, cabinet_id)
    values (new.instructor_id, new.cabinet_id)
    on conflict (instructor_id) do update set cabinet_id = excluded.cabinet_id;
  end if;
  return null;
end;
$$;

drop trigger if exists cabinet_members_sync_index on public.cabinet_members;
create trigger cabinet_members_sync_index
  after insert or update or delete on public.cabinet_members
  for each row execute function public.cabinet_members_sync_index();

-- Recherche du cabinet actif d'un kiné, utilisée par les règles d'accès
-- ci-dessous. Elle lit l'index à travers un « passe » qui n'existe que le
-- temps de cette lecture (remis à sa valeur d'avant), et ne renvoie qu'un
-- identifiant de cabinet.
create or replace function public.cabinet_of(p_instructor uuid)
returns uuid
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_prev text := coalesce(current_setting('app.cabinet_lookup', true), '');
  v_id uuid;
begin
  if p_instructor is null then
    return null;
  end if;
  perform set_config('app.cabinet_lookup', 'on', true);
  select x.cabinet_id into v_id
  from public.cabinet_active_index x
  where x.instructor_id = p_instructor;
  perform set_config('app.cabinet_lookup', v_prev, true);
  return v_id;
end;
$$;

create or replace function public.my_cabinet_id()
returns uuid
language sql
volatile
security definer
set search_path = public, pg_temp
as $$
  select public.cabinet_of(public.current_app_user_id());
$$;

drop policy if exists cabinet_members_select on public.cabinet_members;
create policy cabinet_members_select on public.cabinet_members
  for select
  using (
    instructor_id = public.current_app_user_id()
    or cabinet_id = public.my_cabinet_id()
  );

drop policy if exists cabinets_select on public.cabinets;
create policy cabinets_select on public.cabinets
  for select
  using (
    id = public.my_cabinet_id()
    -- un kiné en attente voit le nom du cabinet qu'il a demandé à rejoindre
    or exists (select 1 from public.cabinet_members m
               where m.cabinet_id = cabinets.id and m.instructor_id = public.current_app_user_id())
  );

-- Écritures et lectures du serveur : un seul « passe » nommé par table.
drop policy if exists cabinets_server on public.cabinets;
create policy cabinets_server on public.cabinets
  for all
  using (current_setting('app.admin_bypass', true) in ('cabinet', 'admin_read'))
  with check (current_setting('app.admin_bypass', true) = 'cabinet');

drop policy if exists cabinet_members_server on public.cabinet_members;
create policy cabinet_members_server on public.cabinet_members
  for all
  using (current_setting('app.admin_bypass', true) in ('cabinet', 'admin_read'))
  with check (current_setting('app.admin_bypass', true) = 'cabinet');

-- ---------------------------------------------------------------------------
-- 2. Fonctions serveur (schéma internal, jamais exposé au navigateur)
-- ---------------------------------------------------------------------------

-- Recherche à l'inscription : nom, ville, nombre de kinés actifs. Rien d'autre.
create or replace function internal.cabinet_search(p_query text)
returns table (id uuid, name text, city text, postal_code text, address text, members int)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  q text := lower(btrim(coalesce(p_query, '')));
begin
  if length(q) < 2 then
    return;
  end if;
  perform set_config('app.admin_bypass', 'cabinet', true);
  return query
    select c.id, c.name, c.city, c.postal_code, c.address,
           (select count(*)::int from public.cabinet_members m where m.cabinet_id = c.id and m.status = 'active')
    from public.cabinets c
    where lower(c.name) like '%' || q || '%'
       or lower(coalesce(c.city, '')) like q || '%'
       or coalesce(c.postal_code, '') like q || '%'
    order by (lower(c.name) like q || '%') desc, c.name
    limit 8;
  perform set_config('app.admin_bypass', '', true);
end;
$$;

-- Créer un cabinet : le kiné en devient le fondateur (actif tout de suite).
create or replace function internal.cabinet_create(
  p_instructor uuid, p_name text, p_address text, p_city text, p_postal_code text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
begin
  perform set_config('app.admin_bypass', 'cabinet', true);
  if exists (select 1 from public.cabinet_members where instructor_id = p_instructor) then
    perform set_config('app.admin_bypass', '', true);
    raise exception 'ALREADY_IN_CABINET';
  end if;
  insert into public.cabinets (name, address, city, postal_code, created_by)
  values (btrim(p_name), nullif(btrim(coalesce(p_address, '')), ''), nullif(btrim(coalesce(p_city, '')), ''),
          nullif(btrim(coalesce(p_postal_code, '')), ''), p_instructor)
  returning id into v_id;
  insert into public.cabinet_members (instructor_id, cabinet_id, role, status, joined_at, decided_by)
  values (p_instructor, v_id, 'owner', 'active', now(), p_instructor);
  perform set_config('app.admin_bypass', '', true);
  return v_id;
end;
$$;

-- Demander à rejoindre : « en attente » jusqu'à l'accord d'un membre actif.
create or replace function internal.cabinet_request_join(p_instructor uuid, p_cabinet uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform set_config('app.admin_bypass', 'cabinet', true);
  if not exists (select 1 from public.cabinets where id = p_cabinet) then
    perform set_config('app.admin_bypass', '', true);
    raise exception 'CABINET_NOT_FOUND';
  end if;
  if exists (select 1 from public.cabinet_members where instructor_id = p_instructor) then
    perform set_config('app.admin_bypass', '', true);
    raise exception 'ALREADY_IN_CABINET';
  end if;
  insert into public.cabinet_members (instructor_id, cabinet_id, role, status)
  values (p_instructor, p_cabinet, 'member', 'pending');
  perform set_config('app.admin_bypass', '', true);
end;
$$;

-- Accepter ou refuser une demande : seulement par un membre ACTIF du même cabinet.
create or replace function internal.cabinet_decide(p_actor uuid, p_member uuid, p_accept boolean)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_cabinet uuid;
begin
  perform set_config('app.admin_bypass', 'cabinet', true);
  select cabinet_id into v_cabinet from public.cabinet_members
  where instructor_id = p_actor and status = 'active';
  if v_cabinet is null or not exists (
    select 1 from public.cabinet_members
    where instructor_id = p_member and cabinet_id = v_cabinet and status = 'pending'
  ) then
    perform set_config('app.admin_bypass', '', true);
    raise exception 'NOT_ALLOWED';
  end if;
  if p_accept then
    update public.cabinet_members
    set status = 'active', joined_at = now(), decided_by = p_actor
    where instructor_id = p_member;
  else
    delete from public.cabinet_members where instructor_id = p_member;
  end if;
  perform set_config('app.admin_bypass', '', true);
end;
$$;

-- Partir (ou annuler sa demande). Le fondateur qui part est remplacé par le
-- plus ancien membre actif ; le dernier membre actif qui part supprime le
-- cabinet (et les demandes en attente avec).
create or replace function internal.cabinet_leave(p_actor uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row public.cabinet_members%rowtype;
  v_next uuid;
begin
  perform set_config('app.admin_bypass', 'cabinet', true);
  select * into v_row from public.cabinet_members where instructor_id = p_actor;
  if not found then
    perform set_config('app.admin_bypass', '', true);
    return;
  end if;
  delete from public.cabinet_members where instructor_id = p_actor;
  if v_row.status = 'active' then
    select instructor_id into v_next from public.cabinet_members
    where cabinet_id = v_row.cabinet_id and status = 'active'
    order by joined_at nulls last, requested_at
    limit 1;
    if v_next is null then
      delete from public.cabinets where id = v_row.cabinet_id;
    elsif v_row.role = 'owner' then
      update public.cabinet_members set role = 'owner' where instructor_id = v_next;
    end if;
  end if;
  perform set_config('app.admin_bypass', '', true);
end;
$$;

-- Retirer un membre : réservé au fondateur.
create or replace function internal.cabinet_remove_member(p_actor uuid, p_member uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_cabinet uuid;
begin
  perform set_config('app.admin_bypass', 'cabinet', true);
  select cabinet_id into v_cabinet from public.cabinet_members
  where instructor_id = p_actor and status = 'active' and role = 'owner';
  if v_cabinet is null or p_member = p_actor or not exists (
    select 1 from public.cabinet_members where instructor_id = p_member and cabinet_id = v_cabinet
  ) then
    perform set_config('app.admin_bypass', '', true);
    raise exception 'NOT_ALLOWED';
  end if;
  delete from public.cabinet_members where instructor_id = p_member;
  perform set_config('app.admin_bypass', '', true);
end;
$$;

-- Vue « Mon cabinet » : le cabinet du kiné et ses membres (nom et e-mail
-- professionnels uniquement — aucune donnée patient).
create or replace function internal.cabinet_team_view(p_actor uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_me public.cabinet_members%rowtype;
  v_out jsonb;
begin
  perform set_config('app.admin_bypass', 'admin_read', true);
  select * into v_me from public.cabinet_members where instructor_id = p_actor;
  if not found then
    perform set_config('app.admin_bypass', '', true);
    return null;
  end if;
  select jsonb_build_object(
    'cabinet', jsonb_build_object('id', c.id, 'name', c.name, 'address', c.address, 'city', c.city, 'postal_code', c.postal_code),
    'me', jsonb_build_object('role', v_me.role, 'status', v_me.status),
    'members', case when v_me.status = 'active' then coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', m.instructor_id, 'name', i.full_name, 'email', i.email,
        'role', m.role, 'status', m.status, 'requested_at', m.requested_at, 'joined_at', m.joined_at
      ) order by m.status, m.joined_at nulls last, m.requested_at)
      from public.cabinet_members m join public.instructors i on i.id = m.instructor_id
      where m.cabinet_id = c.id
    ), '[]'::jsonb) else '[]'::jsonb end
  ) into v_out
  from public.cabinets c where c.id = v_me.cabinet_id;
  perform set_config('app.admin_bypass', '', true);
  return v_out;
end;
$$;

-- /admin : liste des cabinets (lecture seule).
create or replace function internal.admin_list_cabinets()
returns table (id uuid, name text, city text, members int, pending int, created_at timestamptz)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform set_config('app.admin_bypass', 'admin_read', true);
  return query
    select c.id, c.name, c.city,
      (select count(*)::int from public.cabinet_members m where m.cabinet_id = c.id and m.status = 'active'),
      (select count(*)::int from public.cabinet_members m where m.cabinet_id = c.id and m.status = 'pending'),
      c.created_at
    from public.cabinets c
    order by c.created_at desc;
  perform set_config('app.admin_bypass', '', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Exercices : privé ou partagé avec le cabinet
-- ---------------------------------------------------------------------------

alter table public.exercises add column if not exists visibility text not null default 'private';
alter table public.exercises drop constraint if exists exercises_visibility_check;
alter table public.exercises add constraint exercises_visibility_check
  check (visibility in ('private', 'cabinet') and (patient_id is null or visibility = 'private'));

drop policy if exists exercises_select_visible on public.exercises;
create policy exercises_select_visible on public.exercises
  for select
  using (
    public.current_app_user_id() is not null
    and (
      created_by is null
      or publication_status = 'published'
      or created_by = public.current_app_user_id()
      -- patient de l'auteur (règle existante)
      or exists (
        select 1 from public.patients p
        where p.id = public.current_app_user_id()
          and p.instructor_id = exercises.created_by
          and (exercises.patient_id is null or exercises.patient_id = p.id)
      )
      -- nouveau : kiné actif du même cabinet, exercice partagé
      or (
        exercises.visibility = 'cabinet'
        and exercises.patient_id is null
        and public.cabinet_of(exercises.created_by) is not null
        and public.cabinet_of(exercises.created_by) = public.my_cabinet_id()
      )
      -- nouveau : patient dont une séance attribuée contient l'exercice
      or exists (
        select 1
        from public.patient_recommended_workouts r
        join public.workout_exercises we on we.workout_id = r.workout_id
        where r.patient_id = public.current_app_user_id()
          and we.exercise_id = exercises.id
      )
      or exists (
        select 1
        from public.workouts w
        join public.workout_exercises we on we.workout_id = w.id
        where w.patient_id = public.current_app_user_id()
          and we.exercise_id = exercises.id
      )
    )
  );
