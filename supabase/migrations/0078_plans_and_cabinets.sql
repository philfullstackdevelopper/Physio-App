-- 0078 — Abonnement du kiné : durées payées d'avance et cabinets (Philippe, 2026-11-01).
--
-- En clair :
--
-- A. Durée choisie par le kiné (instructors.platform_plan_months) : 1, 3, 6 ou
--    12 mois, payés d'avance. Le kiné la change lui-même depuis « Suivi &
--    facturation » ; elle vaut pour sa prochaine échéance. Il ne peut écrire que
--    sa propre fiche (règle d'accès instructors_update_own, inchangée) et
--    seulement l'une de ces 4 valeurs (règle de contrôle).
--
-- B. Cabinets (table cabinet_memberships) : un kiné « payeur » règle
--    l'abonnement de collègues kinés, à tarif dégressif. Pas de nouveau rôle :
--    le payeur et ses collègues restent des kinés, chacun avec SES patients,
--    totalement séparés — le cabinet ne donne accès à AUCUNE donnée de
--    patient d'un collègue. Il ne sert qu'à la facture.
--    - Le payeur invite un collègue par son e-mail (un kiné validé sur
--      EasyPhysio) ; le collègue doit accepter : personne n'est rattaché sans
--      son accord.
--    - Un kiné ne peut être que dans un seul cabinet, et un payeur ne peut pas
--      lui-même être rattaché à un autre cabinet (un seul niveau).
--    - Le payeur ou le collègue peuvent défaire le lien à tout moment.
--    - Qui peut lire une ligne : seulement le payeur et le collègue concernés.
--      Personne ne peut l'écrire directement : tout passe par les fonctions
--      serveur ci-dessous, qui font les vérifications.
--
-- C. Lectures serveur pour la facturation : factures avec leur date de fin
--    (pour savoir si un mois est déjà payé d'avance), durées choisies, liens
--    de cabinet. Fonctions dans le schéma « internal », jamais exposé par
--    PostgREST.

-- ---------------------------------------------------------------------------
-- A. Durée de l'abonnement
-- ---------------------------------------------------------------------------
alter table public.instructors
  add column if not exists platform_plan_months integer not null default 1;
alter table public.instructors
  drop constraint if exists instructors_platform_plan_months;
alter table public.instructors
  add constraint instructors_platform_plan_months check (platform_plan_months in (1, 3, 6, 12));

-- ---------------------------------------------------------------------------
-- B. Cabinets
-- ---------------------------------------------------------------------------
create table if not exists public.cabinet_memberships (
  member_instructor_id uuid primary key references public.instructors (id) on delete cascade,
  payer_instructor_id  uuid not null references public.instructors (id) on delete cascade,
  status               text not null default 'pending' check (status in ('pending', 'active')),
  created_at           timestamptz not null default now(),
  accepted_at          timestamptz,
  check (member_instructor_id <> payer_instructor_id)
);
create index if not exists idx_cabinet_payer on public.cabinet_memberships (payer_instructor_id);

alter table public.cabinet_memberships enable row level security;
alter table public.cabinet_memberships force row level security;

drop policy if exists cabinet_memberships_read on public.cabinet_memberships;
create policy cabinet_memberships_read on public.cabinet_memberships
  for select to public
  using (
    member_instructor_id = public.current_app_user_id()
    or payer_instructor_id = public.current_app_user_id()
  );

drop policy if exists cabinet_memberships_admin_bypass on public.cabinet_memberships;
create policy cabinet_memberships_admin_bypass on public.cabinet_memberships
  for all to public
  using (current_setting('app.admin_bypass', true) in ('cabinet_write', 'admin_read'))
  with check (current_setting('app.admin_bypass', true) = 'cabinet_write');

-- Invitation par e-mail. Renvoie 'OK' ou un code d'erreur lisible côté serveur.
create or replace function internal.cabinet_invite(p_payer uuid, p_email text)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_member uuid;
  v_count integer;
begin
  -- Lecture des fiches kiné en mode lecture seule, écriture du lien ensuite.
  perform set_config('app.admin_bypass', 'admin_read', true);
  if not exists (select 1 from public.instructors where id = p_payer and status = 'approved') then
    perform set_config('app.admin_bypass', '', true);
    return 'PAYER_NOT_APPROVED';
  end if;
  select id into v_member from public.instructors
    where lower(email) = lower(trim(p_email)) and status = 'approved'
    limit 1;
  if v_member is null then
    perform set_config('app.admin_bypass', '', true);
    return 'NOT_FOUND';
  end if;
  if v_member = p_payer then
    perform set_config('app.admin_bypass', '', true);
    return 'SELF';
  end if;
  if exists (select 1 from public.cabinet_memberships where member_instructor_id = p_payer) then
    perform set_config('app.admin_bypass', '', true);
    return 'PAYER_IS_MEMBER';
  end if;
  if exists (select 1 from public.cabinet_memberships where member_instructor_id = v_member) then
    perform set_config('app.admin_bypass', '', true);
    return 'ALREADY_IN_CABINET';
  end if;
  if exists (select 1 from public.cabinet_memberships where payer_instructor_id = v_member) then
    perform set_config('app.admin_bypass', '', true);
    return 'MEMBER_IS_PAYER';
  end if;
  select count(*) into v_count from public.cabinet_memberships where payer_instructor_id = p_payer;
  if v_count >= 19 then
    perform set_config('app.admin_bypass', '', true);
    return 'FULL';
  end if;
  perform set_config('app.admin_bypass', 'cabinet_write', true);
  insert into public.cabinet_memberships (member_instructor_id, payer_instructor_id, status)
    values (v_member, p_payer, 'pending');
  perform set_config('app.admin_bypass', '', true);
  return 'OK';
end;
$$;

-- Le collègue accepte (le lien devient actif) ou refuse (le lien est supprimé).
create or replace function internal.cabinet_respond(p_member uuid, p_accept boolean)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform set_config('app.admin_bypass', 'cabinet_write', true);
  if p_accept then
    if exists (select 1 from public.cabinet_memberships where payer_instructor_id = p_member) then
      perform set_config('app.admin_bypass', '', true);
      return 'MEMBER_IS_PAYER';
    end if;
    update public.cabinet_memberships set status = 'active', accepted_at = now()
      where member_instructor_id = p_member and status = 'pending';
  else
    delete from public.cabinet_memberships where member_instructor_id = p_member and status = 'pending';
  end if;
  perform set_config('app.admin_bypass', '', true);
  return 'OK';
end;
$$;

-- Défaire un lien : par le payeur (pour un de ses collègues) ou par le collègue lui-même.
create or replace function internal.cabinet_remove(p_actor uuid, p_member uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform set_config('app.admin_bypass', 'cabinet_write', true);
  delete from public.cabinet_memberships
    where member_instructor_id = p_member
      and (payer_instructor_id = p_actor or member_instructor_id = p_actor);
  perform set_config('app.admin_bypass', '', true);
end;
$$;

-- Ce que voit un kiné de SON cabinet : les liens où il est payeur ou collègue,
-- avec le nom et l'e-mail des kinés concernés (jamais rien sur leurs patients).
create or replace function internal.cabinet_view(p_actor uuid)
returns table(
  member_id uuid, member_name text, member_email text,
  payer_id uuid, payer_name text, status text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform set_config('app.admin_bypass', 'admin_read', true);
  return query
    select m.member_instructor_id, mi.full_name, mi.email, m.payer_instructor_id, pi.full_name, m.status
    from public.cabinet_memberships m
    join public.instructors mi on mi.id = m.member_instructor_id
    join public.instructors pi on pi.id = m.payer_instructor_id
    where m.payer_instructor_id = p_actor or m.member_instructor_id = p_actor
    order by m.created_at;
  perform set_config('app.admin_bypass', '', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- C. Lectures serveur pour la facturation
-- ---------------------------------------------------------------------------
create or replace function internal.admin_platform_invoices_list_v2()
returns table(instructor_id uuid, period_start date, period_end date, status text, amount_cents integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform set_config('app.admin_bypass', 'admin_read', true);
  return query
    select i.instructor_id, i.period_start, i.period_end, i.status, i.amount_cents from public.platform_invoices i;
  perform set_config('app.admin_bypass', '', true);
end;
$$;

create or replace function internal.admin_platform_plans()
returns table(instructor_id uuid, plan_months integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform set_config('app.admin_bypass', 'admin_read', true);
  return query select i.id, i.platform_plan_months from public.instructors i;
  perform set_config('app.admin_bypass', '', true);
end;
$$;

create or replace function internal.admin_cabinet_list()
returns table(member_instructor_id uuid, payer_instructor_id uuid, status text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform set_config('app.admin_bypass', 'admin_read', true);
  return query select m.member_instructor_id, m.payer_instructor_id, m.status from public.cabinet_memberships m;
  perform set_config('app.admin_bypass', '', true);
end;
$$;
