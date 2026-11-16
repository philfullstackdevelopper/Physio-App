-- =============================================================================
-- 0094 — Vidéos IA retenues par Philippe le 2026-11-16 (docs/revue-videos-ia-2026-11-16.md, §6)
--
-- En clair, pour Philippe (CLAUDE.md §3) :
--   - 36 exercices de la banque reçoivent une vidéo de démonstration (clips
--     Higgsfield retenus un par un le 16/11), envoyée dans le même stockage
--     que les vidéos de Jules (Cloudflare R2, dossier exercises/, fichiers ia-*.mp4).
--     « Wall Push-up » passe à la version IA (décision du 16/11) ; l'ancienne
--     vidéo de Jules reste stockée (retour arrière possible).
--   - La consigne de « Shoulder Isometrics Against Wall » est réécrite pour
--     correspondre à la vidéo retenue (bras tendu, poussée 5 s), décision du 16/11.
--   - Seulement des exercices de la PLATEFORME (created_by vide). Aucune règle
--     d'accès ne change. Rejouable sans risque.
-- Toujours à relire par Jules (validation clinique finale).
-- =============================================================================

-- Comme 0075 : FORCE ROW LEVEL SECURITY levé le temps des mises à jour, puis
-- remis, dans la même transaction.
alter table public.exercises no force row level security;

update public.exercises e
set media_url = v.media_url
from (values
  ('Single-Leg Box Squat', 'r2:ia-single-leg-box-squat.mp4'),
  ('Forward Lunge', 'r2:ia-forward-lunge.mp4'),
  ('Split Squat', 'r2:ia-split-squat.mp4'),
  ('Lateral Jump (Two Feet)', 'r2:ia-lateral-jump-two-feet.mp4'),
  ('Shoulder Circles', 'r2:ia-shoulder-circles.mp4'),
  ('Jump Squat', 'r2:ia-jump-squat.mp4'),
  ('Prone Y Raise', 'r2:ia-prone-y-raise.mp4'),
  ('Floor to Stand', 'r2:ia-floor-to-stand.mp4'),
  ('Progressive Walk-to-Jog (Shin Splints, Soft Terrain)', 'r2:ia-progressive-walk-to-jog-shin-splints-soft-terrain.mp4'),
  ('Running', 'r2:ia-running.mp4'),
  ('Lateral Shuffle', 'r2:ia-lateral-shuffle.mp4'),
  ('Wrist Radial-Ulnar Deviation', 'r2:ia-wrist-radial-ulnar-deviation.mp4'),
  ('Shoulder Isometrics Against Wall', 'r2:ia-shoulder-isometrics-against-wall.mp4'),
  ('Incline Push-up', 'r2:ia-incline-push-up.mp4'),
  ('Obstacle Step-Over', 'r2:ia-obstacle-step-over.mp4'),
  ('External Rotation at 90° Abduction (Band)', 'r2:ia-external-rotation-at-90-abduction-band.mp4'),
  ('Farmer Carry', 'r2:ia-farmer-carry.mp4'),
  ('Single-Leg Lateral Hop', 'r2:ia-single-leg-lateral-hop.mp4'),
  ('Ankle Eversion (Band)', 'r2:ia-ankle-eversion-band.mp4'),
  ('Walking', 'r2:ia-walking.mp4'),
  ('Push-up', 'r2:ia-push-up.mp4'),
  ('Wall Push-up', 'r2:ia-wall-push-up.mp4'),
  ('Lateral Weight Shift', 'r2:ia-lateral-weight-shift.mp4'),
  ('Foam Ball Squeeze', 'r2:ia-foam-ball-squeeze.mp4'),
  ('Banded Face Pull', 'r2:ia-banded-face-pull.mp4'),
  ('Sit-to-Stand', 'r2:ia-sit-to-stand.mp4'),
  ('Cycling', 'r2:ia-cycling.mp4'),
  ('Band Shoulder Internal Rotation', 'r2:ia-band-shoulder-internal-rotation.mp4'),
  ('Towel Internal Rotation Stretch', 'r2:ia-towel-internal-rotation-stretch.mp4'),
  ('Supine Stick Shoulder Flexion', 'r2:ia-supine-stick-shoulder-flexion.mp4'),
  ('Modified Side Plank (Light)', 'r2:ia-modified-side-plank-light.mp4'),
  ('Thoracic Extension Over Chair', 'r2:ia-thoracic-extension-over-chair.mp4'),
  ('Hip Thrust', 'r2:ia-hip-thrust.mp4'),
  ('Glute Bridge March', 'r2:ia-glute-bridge-march.mp4'),
  ('Skater Hop', 'r2:ia-skater-hop.mp4'),
  ('Single-Leg Forward Hop', 'r2:ia-single-leg-forward-hop.mp4')
) as v(name, media_url)
where e.name = v.name and e.created_by is null;

update public.exercises
set instructions = 'Debout face au mur, bras tendu devant vous, la main à plat contre le mur. Poussez fort contre le mur pendant 5 secondes sans bouger le bras, puis relâchez. Répétez.'
where name = 'Shoulder Isometrics Against Wall' and created_by is null;

alter table public.exercises force row level security;
