-- Physio-App — Migration 0058: politique permissive explicite sur app_users
-- Appliquée sur Supabase le 2026-09-13 (via apply_migration) et sur Scalingo
-- (psql). Safe to re-run.
--
-- app_users est la table de résolution d'identité elle-même (Clerk id ↔ uuid
-- interne, voir lib/auth/user-map.ts) : current_app_user_id() la lit pour
-- savoir QUI appelle, donc aucune politique "par identité" ne peut s'y
-- appliquer — l'identité n'est pas encore connue au moment où on la lit.
--
-- Jusqu'ici la table avait RLS activé mais ZÉRO politique : elle n'était
-- lisible que via la clé service-role de Supabase (qui contourne tout). Depuis
-- que lib/auth/user-map.ts passe par le client normal (bascule Scalingo,
-- CLAUDE.md §7), il lui faut une politique explicite — sans elle, chaque
-- connexion échoue silencieusement (constaté en vrai sur Supabase le
-- 2026-09-13, corrigé dans la foulée).
--
-- Sur Scalingo, FORCE ROW LEVEL SECURITY s'applique à toutes les tables, donc
-- même le rôle propriétaire a besoin de cette politique.

drop policy if exists app_users_service on public.app_users;
create policy app_users_service on public.app_users
  for all to public
  using (true)
  with check (true);
