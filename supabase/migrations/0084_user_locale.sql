-- Physio-App — Migration 0084 (appliquée le 2026-11-07 sous le nom 0082_user_locale.sql) : langue de l'interface choisie par chaque personne
-- (Philippe, 2026-11-06 : « tout en anglais ou en français, au choix, dès
-- l'inscription, et modifiable ensuite »).
--
-- Ce que fait cette migration, en clair :
--
-- 1. Ajoute une colonne `locale` à app_users (la table qui relie un compte
--    Clerk à son identifiant interne — une ligne par personne : kiné, patient
--    ou admin). Valeurs permises : 'fr' ou 'en' (on en ajoutera d'autres plus
--    tard en élargissant la contrainte). Vide (null) = jamais choisi → français.
--
-- 2. AUCUNE nouvelle règle d'accès (RLS) :
--    - LIRE sa langue : déjà couvert par app_users_select_own (0061) — chacun
--      ne voit que SA ligne.
--    - ÉCRIRE sa langue : pas de règle ouverte à l'API. Le serveur appelle
--      internal.set_app_user_locale (schéma `internal`, jamais exposé par
--      PostgREST), après avoir vérifié avec Clerk qui est connecté. La
--      fonction ne touche QUE la colonne locale de la ligne de ce compte Clerk,
--      et refuse toute valeur autre que 'fr' / 'en'.
--    Pourquoi pas une règle d'écriture : app_users porte la liaison
--    Clerk ↔ identifiant interne ; l'ouvrir en écriture, même pour une
--    colonne, risquerait l'isolation entre comptes.

alter table public.app_users
  add column if not exists locale text;

alter table public.app_users
  drop constraint if exists app_users_locale_check;
alter table public.app_users
  add constraint app_users_locale_check check (locale is null or locale in ('fr', 'en'));

create or replace function internal.set_app_user_locale(p_clerk_id text, p_locale text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_locale not in ('fr', 'en') then
    raise exception 'langue non prise en charge : %', p_locale;
  end if;
  perform set_config('app.admin_bypass', 'app_users', true);
  update public.app_users set locale = p_locale where clerk_id = p_clerk_id;
end;
$$;

-- Langue d'une AUTRE personne, par son identifiant interne : sert au serveur
-- pour écrire un message automatique dans la langue du patient (ex. « Ajuster
-- la séance »). Ne renvoie que 'fr' / 'en' / null, rien d'autre ; appelée
-- uniquement après la vérification habituelle que le patient appartient bien
-- au kiné connecté.
create or replace function internal.get_app_user_locale_by_app_id(p_app_id uuid)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v text;
begin
  perform set_config('app.admin_bypass', 'app_users', true);
  select locale into v from public.app_users where app_id = p_app_id;
  return v;
end;
$$;

create or replace function internal.get_app_user_locale(p_clerk_id text)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v text;
begin
  perform set_config('app.admin_bypass', 'app_users', true);
  select locale into v from public.app_users where clerk_id = p_clerk_id;
  return v;
end;
$$;
