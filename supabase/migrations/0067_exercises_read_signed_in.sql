-- Physio-App — Migration 0067 : la bibliothèque d'exercices n'est lisible
-- que par une personne connectée.
--
-- ÉTAT : APPLIQUÉE sur Scalingo le 2026-10-12, après confirmation de Philippe
-- (vérifié : 0 exercice lu sans connexion, 361 par un kiné connecté).
--
-- Ce que ça change, en clair
-- --------------------------
-- Aujourd'hui, la règle de lecture de la table `exercises` dit « tout le
-- monde peut lire » (`using (true)`) : quelqu'un qui n'est pas connecté peut
-- interroger l'API et obtenir la liste des exercices (noms, consignes,
-- matériel). Constaté le 2026-10-12 en appelant l'API sans session.
--
-- La spécification (CLAUDE.md §3) dit autre chose : la bibliothèque est
-- lisible par « tous les kinés et patients CONNECTÉS ». Cette migration
-- aligne la base sur la spécification : la lecture exige une session
-- reconnue (un kiné ou un patient qui a un compte dans l'appli).
--
-- Ce que ça ne change pas
-- -----------------------
-- - Kinés et patients connectés lisent toute la bibliothèque, comme avant.
-- - Les règles d'écriture (un kiné ne modifie que ses propres exercices, les
--   exercices de la plateforme sont en lecture seule) ne sont pas touchées.
-- - Aucune page publique de l'appli ne lit cette table (la page d'accueil et
--   les démonstrations utilisent des données d'exemple).
--
-- Ce ne sont pas des données de santé : le risque actuel est faible (copie du
-- contenu de la bibliothèque par un tiers), mais il n'y a aucune raison de la
-- laisser ouverte.

drop policy if exists exercises_select_all on public.exercises;

create policy exercises_select_signed_in on public.exercises
  for select
  using (public.current_app_user_id() is not null);
