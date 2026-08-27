// Maps exercise names from the shared library (supabase `exercises.name`) to a
// matching illustration in the vendored open-source asset set under
// public/exercise-illustrations/<slug>/frame-{1,2,3}.svg.
//
// Source: derived from Everkinetic (CC BY-SA 4.0) via bryllim/workout-guide
// (https://github.com/bryllim/workout-guide, CC BY-SA 4.0 for the artwork).
// Attribution lives on the mentions-légales page.
//
// Deliberately hand-curated, not fuzzy-matched: physio-app's library is a
// clinical rehab exercise set (397 entries, mostly condition-specific
// variants), while the asset set is a general gym/calisthenics catalog (302
// entries). Only entries below are confident the illustrated movement matches
// what the exercise name actually describes — a wrong illustration would show
// a patient the wrong movement. Exercises with no entry here fall back to the
// existing hand-drawn ExerciseIllustration pictogram, same as before.
export const EXERCISE_ILLUSTRATION_MAP: Record<string, string> = {
  // Cat-cow
  "Chat-vache": "cat-cow-stretch",

  // Glute bridge family
  "Pont fessier": "glute-bridge",
  "Pont fessier (coxarthrose)": "glute-bridge",
  "Pont fessier progressif": "glute-bridge",
  "Pont fessier avec charge (une jambe)": "single-leg-glute-bridge",
  "Pont fessier unilatéral": "single-leg-glute-bridge",
  "Pont fessier unipodal progressif": "single-leg-glute-bridge",
  "Gainage du tronc en pont": "glute-bridge",
  "Renforcement des fessiers, pont fessier (ménisque)": "glute-bridge",
  "Renforcement des ischio-jambiers, pont sur talons": "glute-bridge",

  // Squat family
  "Squat": "squat",
  "Squat contre un mur": "wall-sit",
  "Mini-squat au mur": "wall-sit",
  "Renforcement isométrique du quadriceps, chaise": "wall-sit",
  "Renforcement progressif du quadriceps, chaise": "wall-sit",
  "Mini-squat contrôlé": "bodyweight-squat",
  "Mini-squats contrôlés (arthrose genou)": "bodyweight-squat",
  "Squat en amplitude limitée (hanche)": "bodyweight-squat",
  "Squat fonctionnel (genou arthrose)": "bodyweight-squat",
  "Squat fonctionnel complet (hanche)": "bodyweight-squat",
  "Squat fonctionnel léger": "bodyweight-squat",
  "Squat partiel avec appui": "bodyweight-squat",
  "Squat protégé (quadriceps)": "bodyweight-squat",
  "Squat protégé sur amplitude réduite (LCA)": "bodyweight-squat",
  "Squat sauté contrôlé": "jump-squat",

  // Lunges
  "Fente avant": "forward-lunge",
  "Fente arrière": "reverse-lunge",
  "Fentes latérales avec élastique aux hanches": "lateral-lunge",
  "Fentes latérales contrôlées (bandelette)": "lateral-lunge",
  "Fentes latérales dynamiques": "lateral-lunge",

  // Core / plank
  "Gainage abdominal (planche)": "plank",
  "Gainage abdominal en douceur (hernie)": "plank",
  "Gainage abdominal léger (sciatique)": "plank",
  "Gainage en planche modifiée": "plank",
  "Gainage postural": "plank",
  "Gainage abdominal anti-rotation": "pallof-press",
  "Planche latérale": "side-plank",
  "Gainage latéral léger": "side-plank",
  "Crunch abdominal": "crunch",

  // Quadruped / hip extension
  "Quadrupède alterné": "bird-dog",
  "Stabilité scapulaire en quadrupédie": "bird-dog",
  "Extension de hanche en quadrupédie (donkey kick)": "donkey-kick",

  // Clamshell / hip abduction
  "Clam (palourde) avec élastique": "clamshell",
  "Coquille (clam)": "clamshell",
  "Renforcement des fessiers en coquille progressive": "clamshell",
  "Renforcement du moyen fessier, coquille": "clamshell",
  "Renforcement du moyen fessier, coquille (piriforme)": "banded-clamshell",
  "Renforcement des abducteurs de hanche, allongé (bandelette)": "side-lying-hip-abduction",
  "Renforcement léger des abducteurs, allongé": "side-lying-hip-abduction",
  "Renforcement des abducteurs debout à l'élastique": "banded-standing-hip-abduction",

  // Lateral band walk
  "Marche latérale avec élastique": "banded-lateral-walk",
  "Marche latérale avec élastique (bandelette)": "banded-lateral-walk",
  "Marche latérale avec élastique (crabe)": "crab-walk",

  // Stretches
  "Étirement des pectoraux à la porte": "doorway-chest-stretch",
  "Étirement des pectoraux à la porte (dorsalgie)": "doorway-chest-stretch",
  "Étirement de l'épaule (bras croisé)": "cross-body-shoulder-stretch",
  "Étirement de l'épaule en adduction croisée": "cross-body-shoulder-stretch",
  "Étirement du mollet au mur": "wall-calf-stretch",
  "Étirement du mollet contre le mur": "wall-calf-stretch",
  "Étirement du mollet contre un mur (fascia)": "wall-calf-stretch",
  "Étirement doux du mollet, genou tendu": "wall-calf-stretch",
  "Étirement du mollet genou fléchi (soléaire)": "wall-calf-stretch",
  "Étirement du mollet genou tendu (achille)": "wall-calf-stretch",
  "Étirement du mollet genou tendu (pied)": "wall-calf-stretch",
  "Étirement du mollet, genou plié": "wall-calf-stretch",
  "Étirement des ischio-jambiers": "hamstring-stretch",
  "Étirement des ischio-jambiers (genou arthrose)": "hamstring-stretch",
  "Étirement doux des ischio-jambiers, position allongée": "hamstring-stretch",
  "Étirement doux des ischio-jambiers assis": "seated-forward-fold-stretch",
  "Étirement des ischio-jambiers assis (sciatique)": "seated-forward-fold-stretch",
  "Étirement des quadriceps debout": "standing-quad-stretch",
  "Étirement du quadriceps debout": "standing-quad-stretch",
  "Étirement des fléchisseurs de hanche": "kneeling-hip-flexor-stretch",
  "Étirement doux des fléchisseurs de hanche": "kneeling-hip-flexor-stretch",
  "Étirement du psoas": "kneeling-hip-flexor-stretch",
  "Étirement du psoas à genoux": "kneeling-hip-flexor-stretch",
  "Étirement du psoas en fente basse": "kneeling-hip-flexor-stretch",
  "Cercles d'épaules": "arm-circles",
  "Rotation du tronc": "torso-twist-stretch",

  // Gait / cardio
  "Marche assistée progressive": "walking",
  "Marche assistée progressive (post-prothèse genou)": "walking",
  "Marche avant course progressive (périostite)": "walking",
  "Marche courte avec aide si besoin": "walking",
  "Marche courte fractionnée": "walking",
  "Marche en position penchée, courte durée": "walking",
  "Marche progressive quotidienne": "walking",
  "Marche prolongée (genou arthrose)": "walking",
  "Marche prolongée sans aide (hanche)": "walking",
  "Marche puis course progressive (ischio-jambiers)": "walking",
  "Marche puis trottinement progressif (mollet)": "walking",
  "Marche rapide progressive": "walking",
  "Marche sur terrain varié": "walking",
  "Course légère progressive (fascia)": "running",
  "Course progressive (achille)": "running",
  "Course progressive sur terrain plat": "running",
  "Vélo stationnaire assis (sténose)": "cycling",
  "Vélo stationnaire sans résistance": "cycling",
  "Vélo stationnaire, faible résistance (ménisque)": "cycling",
  "Sauts à la corde légers": "jump-rope",
  "Montées de genoux sur place": "high-knees",
  "Sauts latéraux avec réception contrôlée (renforcement hanche)": "skater-hop",
  "Sauts latéraux contrôlés": "skater-hop",

  // Steps
  "Descente de marche en contrôle du genou": "step-down",
  "Montée d'escaliers contrôlée": "step-up",
  "Montée de marche": "step-up",
  "Montée de marche assistée": "step-up",
  "Montée de marche contrôlée": "step-up",
  "Montée de marche contrôlée (genou arthrose)": "step-up",
  "Montée sur step contrôlée": "step-up",

  // Calf raises
  "Montée sur pointe des pieds bilatérale (fascia)": "calf-raise",
  "Montée sur pointe des pieds bilatérale lente": "calf-raise",
  "Montée sur pointes assistée (post-Achille)": "calf-raise",
  "Montées sur pointes": "calf-raise",
  "Renforcement des mollets": "calf-raise",
  "Renforcement des mollets, montées lentes": "calf-raise",
  "Renforcement excentrique du mollet, genou fléchi": "calf-raise",
  "Renforcement excentrique du mollet, genou tendu": "calf-raise",
  "Montée sur pointe des pieds unilatérale": "single-leg-calf-raise",
  "Montée sur pointe des pieds unilatérale (achille)": "single-leg-calf-raise",

  // Wrist
  "Renforcement du poignet en extension avec haltère léger": "wrist-extension",
  "Renforcement excentrique des extenseurs du poignet": "wrist-extension",
  "Renforcement isométrique du poignet en extension": "wrist-extension",
  "Renforcement du poignet en flexion avec haltère léger": "wrist-curl",
  "Renforcement excentrique des fléchisseurs du poignet": "wrist-curl",

  // Wall push-up
  "Pompes murales (doigts au mur)": "wall-push-up",

  // Misc single matches
  "Flexion du coude avec bouteille": "bicep-curl",
  "Élévation des bras devant": "front-raise",
  "Élévation latérale contrôlée (charge légère)": "lateral-raise",
  "Élévation latérale des bras": "lateral-raise",
  "Élévation de jambe tendue": "lying-leg-raise",
  "Soulevé de terre à la jambe tendue, dos droit (léger)": "romanian-deadlift",
};
