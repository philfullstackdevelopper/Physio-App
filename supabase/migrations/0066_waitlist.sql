-- Physio-App — Migration 0066 : liste d'attente du lancement
-- À appliquer avec : node scripts/migrate.mjs --only 0066_waitlist.sql
-- Rejouable sans risque (if not exists / create or replace / drop policy if exists).
--
-- BUT (Philippe, 2026-10-12) : sur la page d'accueil, un visiteur (surtout un
-- kiné) laisse son e-mail pour être prévenu du lancement.
--
-- CE QUE ÇA CHANGE POUR L'ISOLATION DES DONNÉES, EN CLAIR :
--   - Une nouvelle table `internal.waitlist` : e-mail, « kiné » ou « patient »,
--     date. Rien d'autre (pas de nom, pas d'adresse IP).
--   - Elle vit dans le schéma `internal`, que PostgREST n'expose jamais :
--     personne ne peut la lire ni l'écrire depuis son navigateur.
--   - Écriture : uniquement par le serveur, via internal.waitlist_add(), appelée
--     par le formulaire de la page d'accueil. Elle n'ajoute qu'UNE adresse à la
--     fois, ne renvoie jamais le contenu de la liste, et refuse au-delà de
--     200 inscriptions par heure (robots).
--   - Lecture et suppression : uniquement par l'administrateur, depuis /admin
--     (internal.admin_list_waitlist / admin_delete_waitlist).
--   Aucune règle existante n'est modifiée.

begin;

create table if not exists internal.waitlist (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique,
  role       text not null check (role in ('kine', 'patient')),
  created_at timestamptz not null default now()
);

alter table internal.waitlist enable row level security;
alter table internal.waitlist force row level security;

drop policy if exists waitlist_server_only on internal.waitlist;
create policy waitlist_server_only on internal.waitlist
  for all to public
  using (current_setting('app.admin_bypass', true) = 'waitlist')
  with check (current_setting('app.admin_bypass', true) = 'waitlist');

-- Inscription. Renvoie 'ok' (ajoutée OU déjà présente — on ne révèle pas si
-- une adresse est déjà inscrite), 'invalid' ou 'busy'.
create or replace function internal.waitlist_add(p_email text, p_role text)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_email text := lower(trim(p_email));
  v_recent integer;
begin
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(v_email) > 254
     or p_role not in ('kine', 'patient') then
    return 'invalid';
  end if;

  perform set_config('app.admin_bypass', 'waitlist', true);
  select count(*) into v_recent from internal.waitlist where created_at > now() - interval '1 hour';
  if v_recent >= 200 then
    perform set_config('app.admin_bypass', '', true);
    return 'busy';
  end if;

  insert into internal.waitlist (email, role) values (v_email, p_role)
  on conflict (email) do nothing;
  perform set_config('app.admin_bypass', '', true);
  return 'ok';
end;
$$;

create or replace function internal.admin_list_waitlist()
returns table(email text, role text, created_at timestamptz)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform set_config('app.admin_bypass', 'waitlist', true);
  return query
    select w.email, w.role, w.created_at from internal.waitlist w order by w.created_at desc;
  perform set_config('app.admin_bypass', '', true);
end;
$$;

-- Retrait d'une adresse (demande de la personne — RGPD — ou adresse bidon).
create or replace function internal.admin_delete_waitlist(p_email text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform set_config('app.admin_bypass', 'waitlist', true);
  delete from internal.waitlist w where w.email = lower(trim(p_email));
  perform set_config('app.admin_bypass', '', true);
end;
$$;

commit;
