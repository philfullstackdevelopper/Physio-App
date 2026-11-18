-- =============================================================================
-- 0101 — Pays d'exercice du kiné et numéro professionnel étranger (2026-11-18)
-- (lib/billing/countries.ts, lib/instructor/professionalId.ts,
--  docs/international-billing.md)
--
-- EN CLAIR, ce que ce fichier change :
--
--  1. Deux nouvelles colonnes sur la fiche kiné (instructors) :
--       - country : le pays où il exerce, code à deux lettres (FR, CH, BE…).
--         Toutes les fiches existantes reçoivent « FR » : rien ne change pour
--         elles. Ce pays décide du pays de son compte Stripe et de la monnaie
--         dans laquelle ses patients paient (euros, francs suisses…).
--       - professional_id : son numéro professionnel quand il n'exerce pas en
--         France (INAMI en Belgique, GLN en Suisse, HCPC au Royaume-Uni…). En
--         France on garde la colonne rpps_number, comme avant.
--
--  2. Ces deux valeurs sont FIGÉES une fois le compte validé : le kiné peut
--     les écrire à l'inscription (fiche « en attente »), plus ensuite. Sinon
--     un kiné déjà payé en euros pourrait passer en francs suisses, ou
--     remplacer son numéro vérifié par celui d'un autre. Seul EasyPhysio peut
--     les changer ensuite (laissez-passer serveur 'set_instructor_country').
--
-- RÈGLES D'ACCÈS (RLS) : AUCUNE règle ajoutée, retirée ou élargie.
--   - Le kiné lit et écrit sa propre fiche avec les règles existantes
--     (instructors_select_own, instructors_insert_self, mise à jour de sa
--     propre fiche) : les deux colonnes suivent les mêmes règles que le
--     reste de la fiche.
--   - Un patient lit la fiche de SON kiné comme avant (nom, statut, et
--     maintenant le pays, pour payer dans la bonne monnaie). Il ne lit
--     toujours aucune autre fiche kiné.
--   - Le verrou du point 2 est un déclencheur (trigger), pas une règle RLS :
--     il refuse le changement même quand la RLS autoriserait la mise à jour.
--
-- Rejouable sans risque. Pas de begin/commit (scripts/migrate.mjs ouvre déjà la
-- transaction). À appliquer AVANT de déployer le code qui lit ces colonnes.
-- =============================================================================

alter table public.instructors
  add column if not exists country text not null default 'FR',
  add column if not exists professional_id text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'instructors_country_format') then
    alter table public.instructors
      add constraint instructors_country_format check (country ~ '^[A-Z]{2}$');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'instructors_professional_id_length') then
    alter table public.instructors
      add constraint instructors_professional_id_length check (professional_id is null or char_length(professional_id) between 1 and 40);
  end if;
end;
$$;

comment on column public.instructors.country is
  'Pays d''exercice du kiné (ISO 3166-1 alpha-2). Décide du pays du compte Stripe Connect et de la monnaie des paiements de ses patients. Figé une fois le compte validé (migration 0101).';
comment on column public.instructors.professional_id is
  'Numéro professionnel hors France (INAMI, GLN, HCPC…). La France garde rpps_number. Figé une fois le compte validé (migration 0101).';

create or replace function internal.guard_instructor_country()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    return new;
  end if;
  if coalesce(current_setting('app.admin_bypass', true), '') = 'set_instructor_country' then
    return new;
  end if;
  if (new.country is distinct from old.country or new.professional_id is distinct from old.professional_id)
     and coalesce(old.status, 'approved') <> 'pending' then
    raise exception 'Le pays et le numéro professionnel d''un compte kiné validé ne peuvent être changés que par EasyPhysio.';
  end if;
  return new;
end;
$$;

drop trigger if exists instructors_guard_country on public.instructors;
create trigger instructors_guard_country
  before insert or update on public.instructors
  for each row execute function internal.guard_instructor_country();

-- Pour /admin : pays et numéro professionnel de chaque kiné (lecture
-- serveur seulement — le schéma internal n'est jamais exposé par PostgREST ;
-- même laissez-passer « admin_read » que internal.admin_list_instructors).
create or replace function internal.admin_instructor_countries()
returns table(id uuid, country text, professional_id text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform set_config('app.admin_bypass', 'admin_read', true);
  return query select i.id, i.country, i.professional_id from public.instructors i;
  perform set_config('app.admin_bypass', '', true);
end;
$$;
