-- Onboarding, étape 1 : remplace « Que traversez-vous ? (condition) » — un nom
-- clinique que le patient ne connaît souvent pas — par « Quelle partie du
-- corps souhaitez-vous travailler ? » (Philippe, 2026-09-09). L'ancienne
-- question restait de toute façon purement informative pour le kiné
-- (patients.condition_id, assigné par le kiné, est ce qui pilote réellement
-- le programme — voir CLAUDE.md §4) ; condition_id sur patient_profiles n'est
-- donc pas retiré (des profils existants le renseignent encore), juste plus
-- demandé à l'inscription.
alter table public.patient_profiles
  add column if not exists declared_body_part_ids uuid[] not null default '{}';
