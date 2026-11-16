-- =============================================================================
-- 0091 — Cabinets : lien d'invitation, doublons, fusion (Philippe, 2026-11-16)
--
-- EN CLAIR, ce que ce fichier change :
--
--  1. LIEN D'INVITATION D'UN CABINET. Chaque cabinet reçoit un code secret
--     (32 caractères tirés au hasard), qui forme l'adresse
--     easyphysio.fr/cabinet/<code>. Un membre actif du cabinet le copie et
--     l'envoie à ses collègues. Le collègue qui s'inscrit (ou se connecte) par
--     ce lien entre DIRECTEMENT dans le cabinet, sans demande à valider :
--     l'envoi du lien vaut accord.
--       - Ce que le collègue obtient en entrant : la liste des kinés du cabinet
--         (nom, e-mail pro) et les exercices partagés avec le cabinet. JAMAIS
--         les patients d'un collègue (règle inchangée de 0085).
--       - Le fondateur peut changer le code (« nouveau lien ») : l'ancien lien
--         ne marche plus. Il peut toujours retirer un membre.
--       - Le code n'est lisible que par les membres actifs du cabinet, par le
--         serveur ; la page publique /cabinet/<code> ne montre que le nom, la
--         ville et le nombre de kinés du cabinet.
--
--  2. DOUBLONS. internal.cabinet_find_similar(code postal) renvoie les
--     cabinets du même code postal (nom, ville, nombre de kinés — rien d'autre),
--     pour que l'inscription demande « Ce cabinet existe peut-être déjà :
--     le rejoindre ? » avant d'en créer un second.
--
--  3. FUSION PAR L'ADMINISTRATEUR. internal.admin_merge_cabinets(doublon, cible) :
--     tous les membres du doublon (actifs ou en attente) passent dans le cabinet
--     cible, le fondateur du doublon y devient simple membre, puis le doublon est
--     supprimé. Les exercices partagés suivent leur auteur automatiquement.
--     Appelée seulement depuis /admin, après vérification que c'est Philippe.
--
-- CE QU'ELLE NE CHANGE PAS : aucune règle de lecture des patients, des séances
-- ou des exercices n'est élargie. Personne n'écrit dans ces tables depuis le
-- navigateur : seul le serveur, par ces fonctions internal.*.
--
-- Rejouable sans risque. Pas de begin/commit (la transaction est ouverte par
-- celui qui applique le fichier).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Code d'invitation
-- ---------------------------------------------------------------------------
alter table public.cabinets add column if not exists invite_token text;
create unique index if not exists cabinets_invite_token_idx on public.cabinets (invite_token) where invite_token is not null;

-- Code d'invitation du cabinet de p_actor (membre ACTIF), créé s'il n'existe pas.
-- p_renew = vrai : nouveau code (réservé au fondateur), l'ancien lien ne marche plus.
-- Renvoie null si p_actor n'est membre actif d'aucun cabinet.
create or replace function internal.cabinet_invite_token(p_actor uuid, p_renew boolean)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_cabinet uuid;
  v_role text;
  v_token text;
begin
  perform set_config('app.admin_bypass', 'cabinet', true);
  select m.cabinet_id, m.role into v_cabinet, v_role
  from public.cabinet_members m
  where m.instructor_id = p_actor and m.status = 'active';
  if v_cabinet is null then
    perform set_config('app.admin_bypass', '', true);
    return null;
  end if;
  if p_renew and v_role <> 'owner' then
    perform set_config('app.admin_bypass', '', true);
    raise exception 'NOT_ALLOWED';
  end if;
  select c.invite_token into v_token from public.cabinets c where c.id = v_cabinet;
  if v_token is null or p_renew then
    v_token := replace(gen_random_uuid()::text, '-', '');
    update public.cabinets set invite_token = v_token where id = v_cabinet;
  end if;
  perform set_config('app.admin_bypass', '', true);
  return v_token;
end;
$$;

-- Page publique /cabinet/<code> : nom, ville, nombre de kinés actifs. Rien d'autre.
create or replace function internal.cabinet_by_invite(p_token text)
returns table (id uuid, name text, city text, members int)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_token is null or p_token !~ '^[0-9a-f]{32}$' then
    return;
  end if;
  perform set_config('app.admin_bypass', 'cabinet', true);
  return query
    select c.id, c.name, c.city,
      (select count(*)::int from public.cabinet_members m where m.cabinet_id = c.id and m.status = 'active')
    from public.cabinets c
    where c.invite_token = p_token;
  perform set_config('app.admin_bypass', '', true);
end;
$$;

-- Entrer dans un cabinet par son lien d'invitation : membre ACTIF tout de suite.
--  - code inconnu ou changé            → CABINET_NOT_FOUND
--  - déjà membre actif d'un AUTRE cabinet → ALREADY_IN_CABINET (le quitter d'abord)
--  - déjà membre actif de CE cabinet    → rien à faire
--  - demande en attente (ici ou ailleurs) → remplacée par l'adhésion active
create or replace function internal.cabinet_join_by_invite(p_instructor uuid, p_token text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_cabinet uuid;
  v_row public.cabinet_members%rowtype;
begin
  perform set_config('app.admin_bypass', 'cabinet', true);
  if p_token is not null and p_token ~ '^[0-9a-f]{32}$' then
    select c.id into v_cabinet from public.cabinets c where c.invite_token = p_token;
  end if;
  if v_cabinet is null then
    perform set_config('app.admin_bypass', '', true);
    raise exception 'CABINET_NOT_FOUND';
  end if;
  select * into v_row from public.cabinet_members where instructor_id = p_instructor;
  if found and v_row.status = 'active' then
    perform set_config('app.admin_bypass', '', true);
    if v_row.cabinet_id = v_cabinet then
      return v_cabinet;
    end if;
    raise exception 'ALREADY_IN_CABINET';
  end if;
  if found then
    delete from public.cabinet_members where instructor_id = p_instructor;
  end if;
  insert into public.cabinet_members (instructor_id, cabinet_id, role, status, joined_at, decided_by)
  values (p_instructor, v_cabinet, 'member', 'active', now(), null);
  perform set_config('app.admin_bypass', '', true);
  return v_cabinet;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Cabinets du même code postal (alerte « doublon » à l'inscription)
-- ---------------------------------------------------------------------------
create or replace function internal.cabinet_find_similar(p_postal_code text)
returns table (id uuid, name text, city text, postal_code text, address text, members int)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_postal_code is null or p_postal_code !~ '^[0-9]{5}$' then
    return;
  end if;
  perform set_config('app.admin_bypass', 'cabinet', true);
  return query
    select c.id, c.name, c.city, c.postal_code, c.address,
      (select count(*)::int from public.cabinet_members m where m.cabinet_id = c.id and m.status = 'active')
    from public.cabinets c
    where c.postal_code = p_postal_code
    order by c.created_at
    limit 30;
  perform set_config('app.admin_bypass', '', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Fusion de deux cabinets (administrateur seulement, depuis /admin)
-- ---------------------------------------------------------------------------
create or replace function internal.admin_merge_cabinets(p_source uuid, p_target uuid)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_moved integer;
begin
  if p_source is null or p_target is null or p_source = p_target then
    raise exception 'NOT_ALLOWED';
  end if;
  perform set_config('app.admin_bypass', 'cabinet', true);
  if not exists (select 1 from public.cabinets where id = p_source)
     or not exists (select 1 from public.cabinets where id = p_target) then
    perform set_config('app.admin_bypass', '', true);
    raise exception 'CABINET_NOT_FOUND';
  end if;
  update public.cabinet_members
  set cabinet_id = p_target, role = 'member'
  where cabinet_id = p_source;
  get diagnostics v_moved = row_count;
  delete from public.cabinets where id = p_source;
  perform set_config('app.admin_bypass', '', true);
  return v_moved;
end;
$$;

-- Liste /admin : on y ajoute code postal et adresse pour repérer les doublons.
drop function if exists internal.admin_list_cabinets();
create or replace function internal.admin_list_cabinets()
returns table (id uuid, name text, city text, postal_code text, address text, members int, pending int, created_at timestamptz)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform set_config('app.admin_bypass', 'admin_read', true);
  return query
    select c.id, c.name, c.city, c.postal_code, c.address,
      (select count(*)::int from public.cabinet_members m where m.cabinet_id = c.id and m.status = 'active'),
      (select count(*)::int from public.cabinet_members m where m.cabinet_id = c.id and m.status = 'pending'),
      c.created_at
    from public.cabinets c
    order by c.created_at desc;
  perform set_config('app.admin_bypass', '', true);
end;
$$;
