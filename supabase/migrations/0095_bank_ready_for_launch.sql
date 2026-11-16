-- =============================================================================
-- 0095 — Banque d'exercices prête pour le lancement (Philippe, 2026-11-17)
--
-- En clair, pour Philippe (CLAUDE.md §3) :
--   1. 3 exercices reçoivent une vidéo (clips Higgsfield du 10/11 contrôlés le
--      17/11) : Calf Raise, Step-Up, Assisted Partial Squat.
--   2. 12 consignes sont réécrites pour correspondre à la vidéo retenue
--      (docs/revue-videos-ia-2026-11-16.md §6 et contrôle du 17/11).
--   3. Séances de la PLATEFORME seulement (créées par personne, non copiées pour
--      un patient) : chaque exercice encore sans vidéo est remplacé par
--      l'exercice filmé le plus proche ; si la séance contient déjà cet
--      exercice, la ligne en double est simplement retirée (méthode de 0069).
--      Les séances des kinés et les copies « Ajuster la séance » des patients
--      ne sont PAS touchées. Les exercices remplacés restent dans la banque.
--   Aucune règle d'accès ne change. FORCE ROW LEVEL SECURITY est levé le temps
--   des écritures puis remis (comme 0069 / 0075 / 0094).
--   Contenu clinique : à relire par Jules (docs/seances-a-valider-jules.md).
-- =============================================================================

alter table public.exercises no force row level security;
alter table public.workouts no force row level security;
alter table public.workout_exercises no force row level security;

-- 1. Vidéos
update public.exercises e
set media_url = v.url
from (values
  ('Calf Raise', 'r2:ia-calf-raise.mp4'),
  ('Step-Up', 'r2:ia-step-up.mp4'),
  ('Assisted Partial Squat', 'r2:ia-assisted-partial-squat.mp4')
) as v(name, url)
where e.name = v.name and e.created_by is null;

-- 2. Consignes
update public.exercises e
set instructions = v.instr
from (values
  ('Prone Y Raise', 'Allongé sur le ventre au sol, bras tendus au-dessus de la tête en formant un Y, pouces vers le plafond. Décollez légèrement les bras du sol en resserrant les omoplates, tenez une seconde, puis redescendez avec contrôle.'),
  ('Ankle Eversion (Band)', 'Assis au sol, jambes tendues devant vous, un élastique passé autour des deux avant-pieds. Tournez un pied vers l''extérieur contre l''élastique, sans bouger le genou, puis revenez lentement. Changez de pied.'),
  ('External Rotation at 90° Abduction (Band)', 'Debout, bras levé sur le côté à hauteur d''épaule, coude plié à 90°. L''élastique est tenu de l''autre main près du corps, ou fixé devant vous à hauteur d''épaule. Faites pivoter l''avant-bras vers le haut jusqu''à la verticale, sans baisser le coude, puis revenez lentement.'),
  ('Banded Face Pull', 'Élastique noué autour d''un point fixe devant vous (poignée de porte, barre), à hauteur de visage. Tirez vers le visage en écartant les mains et en resserrant les omoplates, coudes hauts, puis revenez lentement.'),
  ('Split Squat', 'Un pied devant, l''autre derrière, pieds fixes au sol. Descendez jusqu''à ce que les deux genoux forment un angle droit, buste droit, puis remontez en poussant dans le pied avant. Pour plus de difficulté, tenez un poids.'),
  ('Forward Lunge', 'Faites un grand pas en avant et descendez jusqu''à ce que les deux genoux forment un angle droit, puis repoussez pour revenir à la position de départ. Pour plus de difficulté, tenez des haltères.'),
  ('Hip Thrust', 'Haut du dos calé contre un banc ou le bord d''une chaise stable, genoux fléchis, pieds au sol. Poussez le bassin vers le haut jusqu''à extension complète des hanches, puis redescendez. Pour plus de difficulté, posez une charge sur les hanches.'),
  ('Modified Side Plank (Light)', 'Allongé sur le côté, genoux pliés, appui sur l''avant-bras, coude sous l''épaule. Soulevez le bassin pour aligner épaules, hanches et genoux, et maintenez quelques secondes. Changez de côté.'),
  ('Single-Leg Box Squat', 'En équilibre sur une jambe devant une chaise ou un banc bas, descendez en fléchissant le genou d''appui jusqu''à toucher légèrement l''assise, puis remontez. Faites les deux côtés.'),
  ('Lateral Shuffle', 'Jambes fléchies, hanches basses, déplacez-vous latéralement par petits pas chassés rapides, sans croiser les pieds. Pour plus de difficulté, passez un élastique autour des pieds.'),
  ('Farmer Carry', 'Debout, une charge lourde dans chaque main, épaules basses et gainage engagé, marchez en petits pas réguliers sur 15 à 20 mètres.'),
  ('Progressive Walk-to-Jog (Shin Splints, Soft Terrain)', 'Commencez par marcher, puis passez très progressivement à un petit trot, sur terrain souple ou sur tapis de course, en l''absence de douleur.')
) as v(name, instr)
where e.name = v.name and e.created_by is null;

-- 3. Séances de la plateforme : remplacements
create temporary table swap_pairs on commit drop as
select s.id as from_id, t.id as to_id
from (values
  ('Clamshell', 'Banded Clamshell'),
  ('Postural Core Bracing', 'Dead Bug'),
  ('Lying Torso Rotation', 'Cat-Cow Stretch'),
  ('Quadruped Scapular Stability', 'Bird Dog'),
  ('Doorway Chest Stretch', 'Reverse Snow Angel'),
  ('Isometric Calf Hold', 'Calf Raise'),
  ('Assisted Front Raise', 'Supine Stick Shoulder Flexion'),
  ('Gentle Supine Hamstring Stretch', 'Hamstring Stretch'),
  ('Seated Forward Fold', 'Seated Spinal Roll-Down'),
  ('Side Plank', 'Modified Side Plank (Light)'),
  ('Standing Quad Stretch', 'Kneeling Hip Flexor Stretch'),
  ('Wrist Extension', 'Wrist Radial-Ulnar Deviation'),
  ('Wrist Curl', 'Wrist Radial-Ulnar Deviation'),
  ('Eccentric Wrist Extension', 'Wrist Radial-Ulnar Deviation'),
  ('Eccentric Wrist Curl', 'Foam Ball Squeeze'),
  ('Isometric Wrist Extension', 'Foam Ball Squeeze'),
  ('Modified Plank (Knees)', 'Bear Plank'),
  ('Wall Calf Stretch (Bent Knee, Soleus)', 'Wall Calf Stretch'),
  ('Eccentric Calf Raise (Straight Knee, Single-Leg)', 'Single-Leg Calf Raise'),
  ('Lying Leg Raise', 'Straight Leg Raise'),
  ('Cross-Body Shoulder Stretch', 'Towel Internal Rotation Stretch'),
  ('Wall Finger Walk (Shoulder Mobility)', 'Supine Stick Shoulder Flexion'),
  ('Crab Walk', 'Banded Lateral Walk'),
  ('Donkey Kick', 'Bird Dog')
) as v(from_name, to_name)
join public.exercises s on s.name = v.from_name and s.created_by is null
join public.exercises t on t.name = v.to_name and t.created_by is null;

create temporary table platform_workouts on commit drop as
select id from public.workouts where created_by is null and patient_id is null;

-- 3a. La séance contient déjà l'exercice filmé : on retire la ligne en double.
delete from public.workout_exercises we
using swap_pairs p
where we.exercise_id = p.from_id
  and we.workout_id in (select id from platform_workouts)
  and exists (select 1 from public.workout_exercises x where x.workout_id = we.workout_id and x.exercise_id = p.to_id);

-- 3b. Deux exercices remplacés par le même dans une séance : on n'en garde qu'un.
delete from public.workout_exercises we
using swap_pairs p
where we.exercise_id = p.from_id
  and we.workout_id in (select id from platform_workouts)
  and exists (
    select 1 from public.workout_exercises x join swap_pairs p2 on p2.from_id = x.exercise_id
    where x.workout_id = we.workout_id and p2.to_id = p.to_id and x.ctid < we.ctid
  );

-- 3c. Ailleurs, l'exercice est remplacé par sa version filmée.
update public.workout_exercises we
set exercise_id = p.to_id
from swap_pairs p
where we.exercise_id = p.from_id
  and we.workout_id in (select id from platform_workouts);

alter table public.exercises force row level security;
alter table public.workouts force row level security;
alter table public.workout_exercises force row level security;
