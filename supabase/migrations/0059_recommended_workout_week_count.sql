-- Physio-App — Migration 0059: durée (en semaines) d'une séance attribuée
-- Safe to re-run.
--
-- Philippe, 2026-10-01 : quand le kiné attribue une séance, il doit pouvoir
-- choisir pendant combien de semaines elle s'applique. Jusqu'ici une séance
-- attribuée à partir d'une semaine restait en place indéfiniment, jusqu'à
-- l'attribution suivante (migration 0047).
--
-- week_count :
--   null  → comme avant : jusqu'à la prochaine séance attribuée ;
--   N     → la séance s'applique pendant N semaines à partir de
--           week_start_date, puis plus aucune séance (sauf si une autre
--           attribution prend le relais). Le calcul est fait côté app, à un
--           seul endroit : lib/exercise/activeRecommendation.ts.
--
-- RLS : aucune nouvelle politique. Les deux politiques existantes de la table
-- (0035 : le kiné gère les attributions de SES patients ; le patient lit les
-- siennes) s'appliquent ligne par ligne, donc automatiquement à cette
-- nouvelle colonne — rien d'autre ne devient lisible ou modifiable.
--
-- Purement additif : à appliquer sur Scalingo ET sur l'ancienne base
-- Supabase (gardée comme retour arrière, voir CLAUDE.md §7).

alter table public.patient_recommended_workouts
  add column if not exists week_count integer;

alter table public.patient_recommended_workouts
  drop constraint if exists patient_recommended_workouts_week_count_check;
alter table public.patient_recommended_workouts
  add constraint patient_recommended_workouts_week_count_check
  check (week_count is null or week_count between 1 and 52);
