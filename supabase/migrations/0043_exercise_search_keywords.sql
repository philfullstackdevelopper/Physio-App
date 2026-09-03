-- Physio-App — Migration 0043: exercise search keywords
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run. Safe to re-run.
--
-- Search only matches exercises.name (see ExerciseLibraryGrid.tsx), so a
-- kine typing a French term like "pont" never finds "Glute Bridge" even
-- though the whole library is now English-named (migration 0042). Two-part
-- fix, this migration is the data half:
--
--  1. Add a search_keywords column: extra terms a search should also match,
--     beyond the exercise's own name.
--  2. Seed it with the exact old French names each exercise was renamed
--     from, or merged away from, in migration 0042 — a kine used to typing
--     "Pont fessier" should still find that exercise now that it is called
--     "Glute Bridge". This is real provenance from this session's own
--     migrations, not guessed synonyms.
--
-- The app-side fix (components/ExerciseLibraryGrid.tsx) makes search also
-- match instructions text (already French) and these keywords, not just name.

alter table public.exercises
  add column if not exists search_keywords text[] not null default '{}'::text[];

with seed (name, keywords) as (
  values
  ('Side-Lying Hip Abduction', ARRAY['Abduction de hanche allongé', 'Renforcement des abducteurs de hanche (genou)']::text[]),
  ('Side-Lying Hip Abduction (Band)', ARRAY['Renforcement des abducteurs de hanche, allongé (bandelette)']::text[]),
  ('Shoulder Circles', ARRAY['Cercles d''épaules']::text[]),
  ('Banded Clamshell', ARRAY['Renforcement du moyen fessier, coquille (piriforme)']::text[]),
  ('Banded Lateral Walk', ARRAY['Marche latérale avec élastique', 'Marche latérale avec élastique (bandelette)']::text[]),
  ('Banded Standing Hip Abduction', ARRAY['Renforcement des abducteurs debout à l''élastique']::text[]),
  ('Bicep Curl (Water Bottle)', ARRAY['Flexion du coude avec bouteille']::text[]),
  ('Bird Dog', ARRAY['Quadrupède alterné']::text[]),
  ('Quadruped Scapular Stability', ARRAY['Stabilité scapulaire en quadrupédie']::text[]),
  ('Bodyweight Squat', ARRAY['Mini-squat contrôlé', 'Renforcement du quadriceps en chaîne fermée légère', 'Squat fonctionnel (genou arthrose)', 'Squat fonctionnel léger', 'Squat']::text[]),
  ('Controlled Mini-Squat (Knee Arthritis)', ARRAY['Mini-squats contrôlés (arthrose genou)']::text[]),
  ('Light Closed-Chain Quad Strengthening', ARRAY['Renforcement du quadriceps, chaîne fermée légère']::text[]),
  ('Limited-Range Squat (Hip)', ARRAY['Squat en amplitude limitée (hanche)']::text[]),
  ('Assisted Partial Squat', ARRAY['Squat partiel avec appui']::text[]),
  ('Protected Squat (Quadriceps)', ARRAY['Squat protégé (quadriceps)']::text[]),
  ('ACL-Protected Squat (Limited Range)', ARRAY['Squat protégé sur amplitude réduite (LCA)']::text[]),
  ('Isometric Calf Hold (Resistance)', ARRAY['Isométrie du mollet contre résistance']::text[]),
  ('Calf Raise', ARRAY['Montée sur pointe des pieds bilatérale (fascia)', 'Renforcement des mollets', 'Renforcement des mollets, montées lentes']::text[]),
  ('Slow Bilateral Calf Raise', ARRAY['Montée sur pointe des pieds bilatérale lente']::text[]),
  ('Assisted Calf Raise (Post-Achilles)', ARRAY['Montée sur pointes assistée (post-Achille)']::text[]),
  ('Assisted Standing Calf Raise', ARRAY['Montées sur pointes']::text[]),
  ('Eccentric Calf Raise (Bent Knee, Soleus)', ARRAY['Renforcement excentrique du mollet, genou fléchi']::text[]),
  ('Eccentric Calf Raise (Straight Knee, Single-Leg)', ARRAY['Renforcement excentrique du mollet, genou tendu']::text[]),
  ('Isometric Calf Hold', ARRAY['Renforcement isométrique du mollet (élongation)']::text[]),
  ('Cat-Cow Stretch', ARRAY['Chat-vache']::text[]),
  ('Clamshell (Band)', ARRAY['Clam (palourde) avec élastique']::text[]),
  ('Clamshell', ARRAY['Coquille (clam)', 'Renforcement du moyen fessier, coquille']::text[]),
  ('Progressive Clamshell', ARRAY['Renforcement des fessiers en coquille progressive']::text[]),
  ('Running', ARRAY['Course légère progressive (fascia)', 'Course progressive (achille)', 'Course progressive sur terrain plat']::text[]),
  ('Crab Walk', ARRAY['Marche latérale avec élastique (crabe)']::text[]),
  ('Cross-Body Shoulder Stretch', ARRAY['Étirement de l''épaule (bras croisé)', 'Étirement de l''épaule en adduction croisée']::text[]),
  ('Crunch', ARRAY['Crunch abdominal']::text[]),
  ('Seated Stationary Cycling (Forward Lean)', ARRAY['Vélo stationnaire assis (sténose)']::text[]),
  ('Stationary Cycling (No Resistance)', ARRAY['Vélo stationnaire sans résistance']::text[]),
  ('Stationary Cycling (Low Resistance, Meniscus)', ARRAY['Vélo stationnaire, faible résistance (ménisque)']::text[]),
  ('Step-Down', ARRAY['Descente de marche en contrôle du genou']::text[]),
  ('Donkey Kick', ARRAY['Extension de hanche en quadrupédie (donkey kick)']::text[]),
  ('Doorway Chest Stretch', ARRAY['Étirement des pectoraux à la porte (dorsalgie)']::text[]),
  ('Limited Front Raise (Pain-Guided)', ARRAY['Élévation active limitée']::text[]),
  ('Assisted Front Raise', ARRAY['Élévation antérieure du bras assistée']::text[]),
  ('Front Raise (Bodyweight)', ARRAY['Élévation des bras devant']::text[]),
  ('Lying Leg Raise', ARRAY['Élévation de jambe tendue']::text[]),
  ('Lateral Raise', ARRAY['Élévation latérale contrôlée (charge légère)', 'Élévation latérale des bras']::text[]),
  ('Kneeling Hip Flexor Stretch', ARRAY['Étirement des fléchisseurs de hanche', 'Étirement doux des fléchisseurs de hanche', 'Étirement du psoas', 'Étirement du psoas à genoux', 'Étirement du psoas en fente basse']::text[]),
  ('Hamstring Stretch', ARRAY['Étirement des ischio-jambiers']::text[]),
  ('Gentle Supine Hamstring Stretch', ARRAY['Étirement doux des ischio-jambiers, position allongée']::text[]),
  ('Standing Quad Stretch', ARRAY['Étirement des quadriceps debout', 'Étirement du quadriceps debout']::text[]),
  ('Seated Forward Fold', ARRAY['Étirement doux des ischio-jambiers assis']::text[]),
  ('Wall Calf Stretch', ARRAY['Étirement doux du mollet, genou tendu', 'Étirement du mollet au mur', 'Étirement du mollet contre le mur', 'Étirement du mollet contre un mur (fascia)', 'Étirement du mollet genou tendu (achille)', 'Étirement du mollet genou tendu (pied)', 'Étirement du mollet, genou plié']::text[]),
  ('Wall Calf Stretch (Bent Knee, Soleus)', ARRAY['Étirement du mollet genou fléchi (soléaire)']::text[]),
  ('Reverse Lunge', ARRAY['Fente arrière']::text[]),
  ('Forward Lunge', ARRAY['Fente avant']::text[]),
  ('Lateral Lunge (Band)', ARRAY['Fentes latérales avec élastique aux hanches']::text[]),
  ('Lateral Lunge', ARRAY['Fentes latérales contrôlées (bandelette)', 'Fentes latérales dynamiques']::text[]),
  ('Plank', ARRAY['Gainage abdominal (planche)', 'Gainage abdominal léger (sciatique)', 'Gainage sur les genoux']::text[]),
  ('Gentle Supine Core Bracing (Hernia)', ARRAY['Gainage abdominal en douceur (hernie)']::text[]),
  ('Dynamic Plank (Limb Movement)', ARRAY['Gainage dynamique (sciatique)']::text[]),
  ('Modified Plank (Knees)', ARRAY['Gainage en planche modifiée']::text[]),
  ('Postural Core Bracing', ARRAY['Gainage postural']::text[]),
  ('Anti-Rotation Hold (Band)', ARRAY['Gainage abdominal anti-rotation']::text[]),
  ('Glute Bridge', ARRAY['Gainage du tronc en pont', 'Pont fessier', 'Pont fessier progressif', 'Renforcement des fessiers, pont fessier (ménisque)']::text[]),
  ('Heel-Driven Glute Bridge (Hamstring Focus)', ARRAY['Renforcement des ischio-jambiers, pont sur talons']::text[]),
  ('Modified Side Plank (Light)', ARRAY['Gainage latéral léger']::text[]),
  ('Side Plank', ARRAY['Planche latérale']::text[]),
  ('High Knees', ARRAY['Montées de genoux sur place']::text[]),
  ('Jump Rope', ARRAY['Sauts à la corde légers']::text[]),
  ('Jump Squat', ARRAY['Squat sauté contrôlé']::text[]),
  ('Assisted Progressive Walking', ARRAY['Marche assistée progressive']::text[]),
  ('Assisted Progressive Walking (Post-Knee-Replacement)', ARRAY['Marche assistée progressive (post-prothèse genou)']::text[]),
  ('Progressive Walk-to-Jog (Shin Splints, Soft Terrain)', ARRAY['Marche avant course progressive (périostite)']::text[]),
  ('Walking', ARRAY['Marche courte avec aide si besoin', 'Marche progressive quotidienne', 'Marche prolongée (genou arthrose)', 'Marche puis course progressive (ischio-jambiers)', 'Marche puis trottinement progressif (mollet)']::text[]),
  ('Fractionated Short Walks', ARRAY['Marche courte fractionnée']::text[]),
  ('Forward-Leaning Walk (Short Duration)', ARRAY['Marche en position penchée, courte durée']::text[]),
  ('Unassisted Prolonged Walking (Hip)', ARRAY['Marche prolongée sans aide (hanche)']::text[]),
  ('Progressive Brisk Walking', ARRAY['Marche rapide progressive']::text[]),
  ('Marching in Place (Warm-Up)', ARRAY['Marche sur place']::text[]),
  ('Walking on Varied Terrain', ARRAY['Marche sur terrain varié']::text[]),
  ('Mini Wall Sit (Shallow)', ARRAY['Mini-squat au mur']::text[]),
  ('Isometric Wall Sit (60 Degrees)', ARRAY['Renforcement isométrique du quadriceps, chaise']::text[]),
  ('Wall Sit', ARRAY['Squat contre un mur']::text[]),
  ('Controlled Stair Climbing', ARRAY['Montée d''escaliers contrôlée']::text[]),
  ('Step-Up', ARRAY['Montée de marche', 'Montée de marche contrôlée', 'Montée sur step contrôlée']::text[]),
  ('Assisted Low Step-Up (Slow)', ARRAY['Montée de marche assistée']::text[]),
  ('Single-Leg Calf Raise', ARRAY['Montée sur pointe des pieds unilatérale', 'Montée sur pointe des pieds unilatérale (achille)']::text[]),
  ('Wall Finger Walk (Shoulder Mobility)', ARRAY['Pompes murales (doigts au mur)']::text[]),
  ('Weighted Single-Leg Glute Bridge', ARRAY['Pont fessier avec charge (une jambe)']::text[]),
  ('Single-Leg Glute Bridge', ARRAY['Pont fessier unilatéral', 'Pont fessier unipodal progressif']::text[]),
  ('Wrist Extension (Band)', ARRAY['Renforcement des extenseurs du poignet à l''élastique']::text[]),
  ('Wrist Extension (Light Dumbbell)', ARRAY['Renforcement du poignet en extension avec haltère léger']::text[]),
  ('Eccentric Wrist Extension', ARRAY['Renforcement excentrique des extenseurs du poignet']::text[]),
  ('Isometric Wrist Extension', ARRAY['Renforcement isométrique du poignet en extension']::text[]),
  ('Wrist Curl (Light Dumbbell)', ARRAY['Renforcement du poignet en flexion avec haltère léger']::text[]),
  ('Eccentric Wrist Curl', ARRAY['Renforcement excentrique des fléchisseurs du poignet']::text[]),
  ('Single-Leg Romanian Deadlift (Light, Bodyweight)', ARRAY['Soulevé de terre à la jambe tendue, dos droit (léger)']::text[]),
  ('Lying Torso Rotation', ARRAY['Rotation du tronc']::text[]),
  ('Controlled Lateral Jump (Hip/Knee Alignment)', ARRAY['Sauts latéraux avec réception contrôlée (renforcement hanche)']::text[]),
  ('Skater Hop', ARRAY['Sauts latéraux contrôlés']::text[])
)
update public.exercises e
set search_keywords = s.keywords
from seed s
where e.name = s.name;
