-- Une séance assignée à un patient devient effective à partir d'une semaine
-- donnée (le lundi de cette semaine) et reste valable jusqu'à ce qu'une
-- assignation plus récente la remplace — au lieu d'une seule "séance
-- courante" sans notion de semaine. Exemple (Philippe, 2026-09-08) : semaine 1
-- -> séance A, semaine 4 -> séance B => A reste valable semaines 1 à 3, B à
-- partir de la semaine 4. Résoudre "quelle séance pour la semaine N ?" revient
-- à prendre la ligne la plus récente dont week_start_date <= le lundi de la
-- semaine N (voir lib/exercise/activeRecommendation.ts).
-- 0035's `unique (patient_id, workout_id)` assumed a workout appears at most
-- once in a patient's list ever — wrong now that the same séance can come
-- back at a later week after being swapped out and back in.
alter table public.patient_recommended_workouts
  drop constraint if exists patient_recommended_workouts_patient_id_workout_id_key;

alter table public.patient_recommended_workouts
  add column if not exists week_start_date date;

-- Les lignes déjà en place deviennent l'assignation "depuis le lundi de leur
-- semaine de création" — ne casse rien pour les patients déjà suivis.
update public.patient_recommended_workouts
set week_start_date = date_trunc('week', created_at)::date
where week_start_date is null;

alter table public.patient_recommended_workouts
  alter column week_start_date set not null;

-- Une seule assignation par patient par semaine : ré-assigner la même semaine
-- remplace la ligne existante (upsert) au lieu d'en accumuler plusieurs.
create unique index if not exists patient_recommended_workouts_patient_week_key
  on public.patient_recommended_workouts (patient_id, week_start_date);

-- Résolution "dernière assignation <= semaine visée" : lecture triée par date
-- décroissante, la plus fréquente des deux requêtes de ce module.
create index if not exists idx_patient_recommended_workouts_patient_week
  on public.patient_recommended_workouts (patient_id, week_start_date desc);

-- `priority` portait l'ordre de la file d'attente de 0035 (remplacée depuis
-- par "une seule séance à la fois", voir components/AdjustWorkoutModal.tsx) —
-- toujours 1 en pratique. week_start_date porte maintenant tout l'ordre utile.
alter table public.patient_recommended_workouts
  drop column if exists priority;
