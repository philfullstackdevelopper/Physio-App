-- Physio-App — Migration 0076 : rattacher un compte au nouvel identifiant Clerk
-- (passage du Clerk de test au Clerk de production). Safe to re-run.
--
-- EN CLAIR (Philippe, 2026-11-01) :
-- Le site est passé du Clerk de TEST au Clerk de PRODUCTION (clerk.easyphysio.fr).
-- Chaque personne y a un NOUVEL identifiant Clerk, alors que la base garde, pour
-- son e-mail, l'ancien identifiant du Clerk de test. La fonction actuelle refuse
-- alors la connexion (« e-mail déjà lié à un autre identifiant ») : personne
-- ayant un compte d'avant ne peut plus se connecter.
--
-- Cette migration ajoute une version de internal.resolve_app_user à 3
-- paramètres. Quand quelqu'un se connecte avec un e-mail que Clerk a VÉRIFIÉ
-- (la personne a prouvé qu'elle reçoit les messages de cette adresse) et que
-- cet e-mail est déjà lié à un autre identifiant, son compte interne (le même
-- uuid : ses patients, séances, historique) est rattaché au nouvel identifiant.
-- Si l'e-mail n'est PAS vérifié, rien ne change : la connexion est refusée
-- comme avant — personne ne peut prendre le compte d'un autre en tapant son
-- adresse. Aucun uuid ne change, donc aucune règle d'accès (RLS) ni aucune
-- donnée n'est modifiée : seul le lien « identifiant Clerk → compte » est mis
-- à jour.
--
-- L'ancienne version à 2 paramètres reste en place (comportement inchangé).

create or replace function internal.resolve_app_user(p_clerk_id text, p_email text, p_email_verified boolean)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_email text := lower(trim(p_email));
  v_id uuid;
begin
  perform set_config('app.admin_bypass', 'app_users', true);

  select app_id into v_id from public.app_users where clerk_id = p_clerk_id;
  if v_id is not null then
    return v_id;
  end if;

  -- Compte pré-créé (patient invité, compte migré) : on y attache le Clerk id,
  -- seulement s'il n'en a pas déjà un.
  update public.app_users set clerk_id = p_clerk_id
  where email = v_email and clerk_id is null
  returning app_id into v_id;
  if v_id is not null then
    return v_id;
  end if;

  -- Nouveau Clerk (production) : e-mail vérifié par Clerk et déjà lié à un
  -- autre identifiant → on rattache le même compte au nouvel identifiant.
  if p_email_verified and v_email <> '' then
    update public.app_users set clerk_id = p_clerk_id
    where email = v_email and clerk_id is distinct from p_clerk_id
    returning app_id into v_id;
    if v_id is not null then
      return v_id;
    end if;
  end if;

  insert into public.app_users (clerk_id, email)
  values (p_clerk_id, v_email)
  on conflict do nothing
  returning app_id into v_id;
  if v_id is not null then
    return v_id;
  end if;

  select app_id into v_id from public.app_users where clerk_id = p_clerk_id;
  if v_id is null then
    raise exception 'resolve_app_user: impossible de créer ou retrouver le compte (e-mail déjà lié à un autre identifiant ?)';
  end if;
  return v_id;
end;
$$;
