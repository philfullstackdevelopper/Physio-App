-- =============================================================================
-- 0082 — Rejoindre son kiné par QR code ou lien (Philippe, 2026-11-04).
--
-- En clair, pour Philippe (CLAUDE.md §3 : chaque règle expliquée avant d'être
-- appliquée) :
--
-- Chaque kiné a un lien personnel (et son QR code) à faire scanner. Le
-- patient y donne son nom et son e-mail ; EasyPhysio lui envoie alors la même
-- invitation par e-mail qu'aujourd'hui (elle prouve que l'adresse est bien la
-- sienne), et la suite ne change pas : mot de passe, CGU, questionnaire,
-- formule.
--
-- Problème : la fiche patient est créée aujourd'hui avec la session du kiné
-- (règle « un kiné ne crée que SES patients »). Avec le QR code, aucun kiné
-- n'est connecté. Ce fichier ajoute donc, côté serveur uniquement :
--
--  1. internal.join_link_kine(kiné) : lit le nom, l'e-mail et le statut d'UN
--     kiné, pour afficher « Rejoindre le suivi de … » et vérifier qu'il est
--     validé. Rien d'autre n'est lisible.
--
--  2. internal.join_patient_by_link(kiné, identifiant, e-mail, nom) : crée la
--     fiche du patient chez CE kiné, et seulement si :
--       - le kiné existe et est validé (pas en attente, refusé ni suspendu) ;
--       - l'adresse n'est pas déjà celle d'un patient ou d'un kiné.
--     Elle renvoie 'OK' ou un code d'erreur.
--
--  3. Une règle d'accès de plus sur `patients` : une création de fiche est
--     permise PENDANT cette fonction seulement (laissez-passer 'join_link',
--     même principe que les comptes de test de 0064). Aucune autre règle ne
--     change : un kiné ne voit toujours que SES patients, un patient que SA
--     fiche.
--
-- Ces fonctions vivent dans le schéma `internal`, jamais exposé par PostgREST :
-- seul le serveur de l'appli les appelle, après avoir vérifié la signature du
-- lien (un lien ne peut pas être fabriqué pour un autre kiné).
--
-- Rejouable sans risque.
-- =============================================================================

create or replace function internal.join_link_kine(p_instructor_id uuid)
returns table(full_name text, email text, status text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform set_config('app.admin_bypass', 'admin_read', true);
  return query
    select i.full_name::text, i.email::text, i.status::text
    from public.instructors i
    where i.id = p_instructor_id;
end;
$$;

create or replace function internal.join_patient_by_link(
  p_instructor_id uuid,
  p_app_id uuid,
  p_email text,
  p_full_name text
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_status text;
begin
  perform set_config('app.admin_bypass', 'admin_read', true);
  select i.status into v_status from public.instructors i where i.id = p_instructor_id;
  if v_status is null or v_status <> 'approved' then
    return 'KINE_UNAVAILABLE';
  end if;
  if exists (select 1 from public.instructors i where i.id = p_app_id) then
    return 'IS_KINE';
  end if;
  if exists (select 1 from public.patients p where p.id = p_app_id or lower(p.email) = lower(p_email)) then
    return 'EMAIL_TAKEN';
  end if;

  perform set_config('app.admin_bypass', 'join_link', true);
  insert into public.patients (id, instructor_id, full_name, email)
  values (p_app_id, p_instructor_id, nullif(trim(p_full_name), ''), lower(trim(p_email)));
  perform set_config('app.admin_bypass', '', true);
  return 'OK';
end;
$$;

drop policy if exists patients_join_link_insert on public.patients;
create policy patients_join_link_insert on public.patients
  for insert to public
  with check (current_setting('app.admin_bypass', true) = 'join_link');
