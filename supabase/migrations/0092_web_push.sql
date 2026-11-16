-- =============================================================================
-- 0092 — Notifications sur l'appli ajoutée à l'écran d'accueil (Philippe,
-- 2026-11-16).
--
-- En clair, pour Philippe (CLAUDE.md §3) :
--
--  Le site peut maintenant s'installer sur l'écran d'accueil du téléphone
--  (app/manifest.ts). Une fois installé, il peut recevoir des notifications
--  (« nouveau message », « votre séance du jour vous attend »), comme l'appli
--  mobile. Le téléphone donne alors une « adresse d'envoi » web, un peu plus
--  longue qu'un jeton d'appli.
--
--  On la range dans la MÊME table que les téléphones de l'appli mobile
--  (push_tokens, migration 0083), marquée « web » :
--    - AUCUNE règle d'accès ne change : chacun ne voit que SES propres
--      téléphones, personne n'écrit depuis le navigateur, seul le serveur
--      enregistre (après avoir vérifié qui est connecté) et envoie ;
--    - les rappels de séance et les avis de message, déjà prévus pour
--      l'appli, partent donc aussi vers ces téléphones ;
--    - à la suppression d'un compte, ses adresses partent avec lui.
--
--  Ce fichier ne fait qu'autoriser la valeur « web » et une adresse plus
--  longue (1000 caractères au lieu de 300). Rejouable sans risque. Sur
--  Scalingo, appliquer CE fichier seul.
-- =============================================================================

alter table public.push_tokens drop constraint if exists push_tokens_platform_check;
alter table public.push_tokens
  add constraint push_tokens_platform_check check (platform in ('ios', 'android', 'web'));

create or replace function internal.register_push_token(p_app_user_id uuid, p_token text, p_platform text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_token is null or length(p_token) < 10 or length(p_token) > 1000 then
    raise exception 'jeton invalide';
  end if;
  perform set_config('app.admin_bypass', 'push', true);
  insert into public.push_tokens (token, app_user_id, platform)
  values (p_token, p_app_user_id, p_platform)
  on conflict (token) do update
    set app_user_id = excluded.app_user_id, platform = excluded.platform, updated_at = now();
  perform set_config('app.admin_bypass', '', true);
end;
$$;
