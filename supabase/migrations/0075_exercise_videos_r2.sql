-- Physio-App — Migration 0075 : vidéos de démonstration des exercices filmés
-- Safe to re-run.
--
-- Philippe, 2026-10-31 : les 63 vidéos du tournage avec Jules sont chez
-- Cloudflare R2 (bucket privé). Chaque exercice de la PLATEFORME filmé reçoit
-- media_url = 'r2:<fichier>.mp4' ; le serveur en fait un lien signé de 6 h au
-- moment d'afficher la page (lib/storage/r2-videos.ts). Généré par
-- scripts/videos-r2-preparer.mjs.
--
-- Ne touche qu'à exercises.media_url / media_start_seconds des exercices de la
-- plateforme (created_by null) listés ci-dessous. Aucune règle d'accès (RLS),
-- aucun patient, aucune séance. FORCE ROW LEVEL SECURITY est levé le temps de
-- la mise à jour puis remis, dans la transaction de scripts/migrate.mjs --only.

alter table public.exercises no force row level security;

update public.exercises e
set media_url = v.url, media_start_seconds = 0
from (values
  ('Bodyweight Squat', 'r2:bodyweight-squat.mp4'),
  ('Single-Leg Calf Raise', 'r2:single-leg-calf-raise.mp4'),
  ('Wall Push-up', 'r2:wall-push-up.mp4'),
  ('Wall Sit', 'r2:wall-sit.mp4'),
  ('Wall Calf Stretch', 'r2:wall-calf-stretch.mp4'),
  ('Kneeling Calf and Hip Flexor Wall Stretch', 'r2:kneeling-calf-hip-flexor-wall-stretch.mp4'),
  ('Wall Lunge Hip Flexor Stretch', 'r2:wall-lunge-hip-flexor-stretch.mp4'),
  ('Kneeling Hip Flexor Stretch', 'r2:kneeling-hip-flexor-stretch.mp4'),
  ('Single-Leg Stance', 'r2:single-leg-stance.mp4'),
  ('Wall Slides', 'r2:wall-slides.mp4'),
  ('Codman Pendulum', 'r2:codman-pendulum.mp4'),
  ('Supine Chin Nod', 'r2:supine-chin-nod.mp4'),
  ('Chin Tuck', 'r2:chin-tuck.mp4'),
  ('Upper Trapezius Stretch', 'r2:upper-trap-stretch.mp4'),
  ('Active Cervical Rotation', 'r2:cervical-rotation.mp4'),
  ('Ankle Circles', 'r2:ankle-alphabet.mp4'),
  ('Quad Set', 'r2:quad-set.mp4'),
  ('Heel Slide', 'r2:heel-slide.mp4'),
  ('Straight Leg Raise', 'r2:straight-leg-raise.mp4'),
  ('Glute Bridge', 'r2:glute-bridge.mp4'),
  ('Single-Leg Glute Bridge', 'r2:single-leg-glute-bridge.mp4'),
  ('Dead Bug', 'r2:dead-bug.mp4'),
  ('Bear Plank', 'r2:bear-plank.mp4'),
  ('Hamstring Stretch', 'r2:hamstring-stretch.mp4'),
  ('Banded Clamshell', 'r2:banded-clamshell.mp4'),
  ('Side-Lying Hip Abduction', 'r2:side-lying-hip-abduction.mp4'),
  ('Banded Standing Hip Abduction', 'r2:banded-standing-hip-abduction.mp4'),
  ('Banded Lateral Walk', 'r2:banded-lateral-walk.mp4'),
  ('Prone Press-Up (McKenzie)', 'r2:prone-press-up.mp4'),
  ('Child''s Pose to Press-Up Flow', 'r2:childs-pose-to-press-up.mp4'),
  ('Cat-Cow Stretch', 'r2:cat-cow-stretch.mp4'),
  ('Bird Dog', 'r2:bird-dog.mp4'),
  ('Seated Spinal Roll-Down', 'r2:seated-spinal-roll-down.mp4'),
  ('Standing Bent-Leg Hamstring Stretch (Table)', 'r2:standing-bent-leg-hamstring-stretch-table.mp4'),
  ('Standing Lateral Pelvic Shift', 'r2:standing-lateral-pelvic-shift.mp4'),
  ('Terminal Knee Extension (Band)', 'r2:terminal-knee-extension.mp4'),
  ('Pallof Press', 'r2:pallof-press.mp4'),
  ('Y-Balance Reach', 'r2:y-balance.mp4'),
  ('Towel Row', 'r2:towel-row.mp4'),
  ('Single-Leg Romanian Deadlift', 'r2:single-leg-romanian-deadlift.mp4'),
  ('Romanian Deadlift', 'r2:romanian-deadlift.mp4'),
  ('Prone T Arm Raise (Floor)', 'r2:prone-arm-raise-t.mp4'),
  ('Reverse Snow Angel', 'r2:reverse-snow-angel.mp4'),
  ('Prone Back Extension (Hands Behind Head)', 'r2:prone-back-extension-hands-head.mp4'),
  ('Plank', 'r2:plank.mp4'),
  ('Plank Shoulder Tap', 'r2:plank-shoulder-tap.mp4'),
  ('Step-Down', 'r2:step-down.mp4'),
  ('Lunge to Step-Up with Knee Drive', 'r2:reverse-lunge-to-step-up.mp4'),
  ('Rotational Step-Up', 'r2:rotational-step-up.mp4'),
  ('Lateral Step-Over Hop', 'r2:step-straddle-jump.mp4'),
  ('Step Drop Landing (Two Feet)', 'r2:step-drop-landing.mp4'),
  ('Step Drop Landing (Single Leg)', 'r2:step-drop-single-leg-landing.mp4'),
  ('Hop and Stick', 'r2:hop-and-stick.mp4'),
  ('Bulgarian Split Squat', 'r2:bulgarian-split-squat.mp4'),
  ('Seated External Rotation (Elbow on Knee)', 'r2:seated-external-rotation-elbow-on-knee.mp4'),
  ('Side-Lying External Rotation', 'r2:side-lying-external-rotation.mp4'),
  ('Lateral Raise', 'r2:lateral-raise.mp4'),
  ('Banded Row', 'r2:banded-row.mp4'),
  ('Reverse Lunge', 'r2:reverse-lunge.mp4'),
  ('Lateral Lunge', 'r2:lateral-lunge.mp4'),
  ('Curtsy Lunge', 'r2:curtsy-lunge.mp4'),
  ('Wall Tibialis Raise', 'r2:wall-tibialis-raise.mp4'),
  ('Band Shoulder External Rotation', 'r2:band-shoulder-external-rotation.mp4')
) as v(name, url)
where e.name = v.name and e.created_by is null;

alter table public.exercises force row level security;
