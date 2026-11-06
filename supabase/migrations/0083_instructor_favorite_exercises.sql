-- =============================================================================
-- 0083 — Exercices favoris du kiné (Philippe, 2026-11-05, proposition 6 de la
-- page « Modèles de séances » : « une étoile sur chaque exercice, et une
-- rangée Mes favoris · Récents en tête de Ajuster la séance »).
--
-- En clair, pour Philippe (CLAUDE.md §3 : chaque règle expliquée avant d'être
-- appliquée) :
--
-- Une nouvelle table, instructor_favorite_exercises : une ligne = « ce kiné a
-- mis une étoile sur cet exercice ». Elle ne contient aucune donnée patient.
--
-- Une seule règle d'accès, copiée de la liste des exercices masqués
-- (instructor_hidden_exercises, migration 0037) : un kiné ne voit, n'ajoute et
-- ne retire QUE ses propres étoiles. Un autre kiné ne voit pas les favoris
-- des autres ; un patient n'en voit aucun. Si le kiné ou l'exercice est
-- supprimé, ses étoiles partent avec.
--
-- Les « Récents » n'ont pas besoin de table : ils viennent des séances que
-- le kiné a déjà composées.
--
-- Aucune autre table ni règle ne change. Rejouable sans risque.
-- =============================================================================

create table if not exists public.instructor_favorite_exercises (
  instructor_id uuid not null references public.instructors (id) on delete cascade,
  exercise_id   uuid not null references public.exercises (id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (instructor_id, exercise_id)
);

alter table public.instructor_favorite_exercises enable row level security;

drop policy if exists favorite_ex_instructor_all on public.instructor_favorite_exercises;
create policy favorite_ex_instructor_all on public.instructor_favorite_exercises
  for all to authenticated
  using (instructor_id = public.current_app_user_id())
  with check (instructor_id = public.current_app_user_id());

-- PostgREST lit le schéma au démarrage : on lui demande de relire.
notify pgrst, 'reload schema';
