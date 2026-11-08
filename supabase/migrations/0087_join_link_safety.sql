-- =============================================================================
-- 0087 — Lien / QR code « Rejoindre mon kiné » : garde-fous (audit du
-- 2026-11-08). Complète 0082.
--
-- En clair, pour Philippe (CLAUDE.md §3 : chaque règle expliquée avant d'être
-- appliquée) :
--
--  1. Nouvelle colonne patients.joined_via_link_at : la date à laquelle la
--     fiche a été créée par le QR code / lien du kiné (vide pour un patient
--     invité par le kiné lui-même). Sert à compter les inscriptions par QR code.
--
--  2. internal.join_patient_by_link (remplace la version de 0082, même nom,
--     mêmes paramètres) fait la même chose qu'avant, plus :
--       - si l'adresse est déjà celle d'un patient DE CE KINÉ qui n'a jamais
--         accepté les CGU (il a rescanné le QR code sans avoir fini), elle
--         répond 'PENDING_SAME_KINE' au lieu de « adresse déjà prise » : le
--         serveur lui renvoie alors son invitation par e-mail. Rien n'est créé.
--       - au plus 20 nouvelles fiches par kiné et par 24 h par ce chemin
--         ('RATE_LIMITED' au-delà) : une personne mal intentionnée qui
--         trouverait le QR code ne peut pas remplir la liste du kiné de faux
--         patients. Les invitations envoyées par le kiné lui-même ne comptent pas.
--       - elle note joined_via_link_at sur la fiche créée.
--
--  3. internal.join_link_pending_patient_name(kiné, e-mail) : renvoie le nom
--     enregistré d'un patient de CE kiné qui n'a pas encore accepté les CGU
--     (pour renvoyer l'invitation à son nom), sinon rien. Ne lit rien d'autre.
--
--  4. internal.join_link_undo(kiné, patient) : si l'e-mail d'invitation n'a
--     pas pu partir, efface la fiche qu'on vient de créer — et SEULEMENT une
--     fiche de ce kiné, créée par le QR code il y a moins d'une heure, et dont
--     le patient n'a jamais accepté les CGU. Une règle d'accès de plus sur
--     `patients` (patients_join_link_undo) permet cette suppression PENDANT
--     cette fonction seulement (laissez-passer 'join_link_undo'). Aucune autre
--     règle ne change : un kiné ne voit toujours que SES patients, un patient
--     que SA fiche.
--
-- Ces fonctions vivent dans le schéma `internal`, jamais exposé par PostgREST :
-- seul le serveur de l'appli les appelle, après avoir vérifié la signature du
-- lien.
--
-- Rejouable sans risque.
-- =============================================================================

alter table public.patients
  add column if not exists joined_via_link_at timestamptz;

create index if not exists idx_patients_joined_via_link
  on public.patients (instructor_id, joined_via_link_at)
  where joined_via_link_at is not null;

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
  v_existing record;
  v_recent integer;
begin
  perform set_config('app.admin_bypass', 'admin_read', true);
  select i.status into v_status from public.instructors i where i.id = p_instructor_id;
  if v_status is null or v_status <> 'approved' then
    return 'KINE_UNAVAILABLE';
  end if;
  if exists (select 1 from public.instructors i where i.id = p_app_id) then
    return 'IS_KINE';
  end if;

  select p.instructor_id, p.terms_accepted_at into v_existing
  from public.patients p
  where p.id = p_app_id or lower(p.email) = lower(trim(p_email))
  limit 1;
  if found then
    if v_existing.instructor_id = p_instructor_id and v_existing.terms_accepted_at is null then
      return 'PENDING_SAME_KINE';
    end if;
    return 'EMAIL_TAKEN';
  end if;

  select count(*) into v_recent
  from public.patients p
  where p.instructor_id = p_instructor_id
    and p.joined_via_link_at > now() - interval '24 hours';
  if v_recent >= 20 then
    return 'RATE_LIMITED';
  end if;

  perform set_config('app.admin_bypass', 'join_link', true);
  insert into public.patients (id, instructor_id, full_name, email, joined_via_link_at)
  values (p_app_id, p_instructor_id, nullif(trim(p_full_name), ''), lower(trim(p_email)), now());
  perform set_config('app.admin_bypass', '', true);
  return 'OK';
end;
$$;

create or replace function internal.join_link_pending_patient_name(p_instructor_id uuid, p_email text)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_name text;
begin
  perform set_config('app.admin_bypass', 'admin_read', true);
  select p.full_name::text into v_name
  from public.patients p
  where p.instructor_id = p_instructor_id
    and lower(p.email) = lower(trim(p_email))
    and p.terms_accepted_at is null
  limit 1;
  perform set_config('app.admin_bypass', '', true);
  return v_name;
end;
$$;

create or replace function internal.join_link_undo(p_instructor_id uuid, p_app_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform set_config('app.admin_bypass', 'join_link_undo', true);
  delete from public.patients p
  where p.id = p_app_id
    and p.instructor_id = p_instructor_id
    and p.terms_accepted_at is null
    and p.joined_via_link_at > now() - interval '1 hour';
  perform set_config('app.admin_bypass', '', true);
end;
$$;

drop policy if exists patients_join_link_undo on public.patients;
create policy patients_join_link_undo on public.patients
  for delete to public
  using (current_setting('app.admin_bypass', true) = 'join_link_undo');

-- La suppression ci-dessus doit d'abord pouvoir LIRE la ligne : le
-- laissez-passer 'join_link_undo' ouvre aussi la lecture, pendant la fonction
-- seulement.
drop policy if exists patients_join_link_undo_read on public.patients;
create policy patients_join_link_undo_read on public.patients
  for select to public
  using (current_setting('app.admin_bypass', true) = 'join_link_undo');
