# Simplifier la banque d'exercices — proposition à valider

**149 exercices retirés** sur 385 (banque actuelle). Il en resterait **236**.

Règle : on retire les variantes « salle de musculation » (barre, machine guidée, poulie, versions lestées ou acrobatiques) qu'un kiné ne prescrit presque jamais, surtout quand une variante plus simple existe déjà. **Aucune séance ne perd d'exercice** : partout où un exercice retiré apparaît, il est remplacé par l'exercice gardé indiqué. Rien n'est supprimé tant que Philippe n'a pas validé (la migration 0069 est écrite mais pas appliquée).

Pour garder un exercice, il suffit de le rayer de la liste : je l'enlève du fichier `scripts/simplification-banque.mjs` et je régénère.

## Doublons de rééducation : le même mouvement décliné par pathologie ou par dosage (même dessin) — le kiné adapte l'amplitude, la durée et les consignes lui-même (38)

| Retiré | Remplacé dans les séances par | Pourquoi |
|---|---|---|
| Assisted Progressive Walking (Post-Knee-Replacement) | Assisted Progressive Walking | même marche avec aide technique |
| Fractionated Short Walks | Walking | marche : seule la durée change |
| Forward-Leaning Walk (Short Duration) | Walking | marche : seule la consigne change |
| Unassisted Prolonged Walking (Hip) | Walking | marche : seule la durée change |
| Progressive Brisk Walking | Walking | marche : seule l'allure change |
| Walking on Varied Terrain | Walking | marche : seul le terrain change |
| Controlled Mini-Squat (Knee Arthritis) | Bodyweight Squat | squat : seule l'amplitude change |
| Limited-Range Squat (Hip) | Bodyweight Squat | squat : seule l'amplitude change |
| Protected Squat (Quadriceps) | Bodyweight Squat | squat : seule l'amplitude change |
| ACL-Protected Squat (Limited Range) | Bodyweight Squat | squat : seule l'amplitude change |
| Light Closed-Chain Quad Strengthening | Bodyweight Squat | c'est un squat partiel |
| Slow Bilateral Calf Raise | Calf Raise | même élévation sur la pointe des pieds |
| Assisted Calf Raise (Post-Achilles) | Calf Raise | même exercice, avec appui |
| Eccentric Calf Raise (Bent Knee, Soleus) | Eccentric Calf Raise (Straight Knee, Single-Leg) | même excentrique, genou fléchi |
| Isometric Calf Hold (Resistance) | Isometric Calf Hold | même isométrique |
| Gentle Supine Core Bracing (Hernia) | Postural Core Bracing | même gainage doux |
| Dynamic Plank (Limb Movement) | Plank | variante de la planche |
| Wrist Extension (Light Dumbbell) | Wrist Extension | même extension du poignet |
| Wrist Extension (Band) | Wrist Extension | même extension du poignet |
| Wrist Curl (Light Dumbbell) | Wrist Curl | même flexion du poignet |
| Seated Stationary Cycling (Forward Lean) | Cycling | vélo : seule la consigne change |
| Stationary Cycling (No Resistance) | Cycling | vélo : seule la résistance change |
| Stationary Cycling (Low Resistance, Meniscus) | Cycling | vélo : seule la résistance change |
| Assisted Low Step-Up (Slow) | Step-Up | même montée de marche |
| Front Raise (Bodyweight) | Front Raise | même élévation frontale |
| Limited Front Raise (Pain-Guided) | Assisted Front Raise | même élévation frontale douce |
| Heel-Driven Glute Bridge (Hamstring Focus) | Glute Bridge | même pont fessier |
| Isometric Wall Sit (60 Degrees) | Wall Sit | même chaise contre le mur |
| Clamshell (Band) | Banded Clamshell | doublon exact |
| Progressive Clamshell | Banded Clamshell | même coquillage avec résistance |
| Side-Lying Hip Abduction (Band) | Side-Lying Hip Abduction | même abduction couché |
| Side-Lying Leg Raise | Side-Lying Hip Abduction | doublon exact |
| Lateral Lunge (Band) | Lateral Lunge | même fente latérale |
| Anti-Rotation Hold (Band) | Pallof Press | même anti-rotation |
| Banded Pallof Press | Pallof Press | doublon exact |
| Cable Pallof Hold | Pallof Press | même anti-rotation, à la poulie |
| Controlled Lateral Jump (Hip/Knee Alignment) | Skater Hop | même saut latéral |
| Single-Leg Romanian Deadlift (Light, Bodyweight) | Single-Leg Romanian Deadlift | doublon |

## Pompes : on garde Pompe murale, inclinée, à genoux, classique, scapulaire, avec touches d'épaule, archer, diamant, explosive et typewriter (9)

| Retiré | Remplacé dans les séances par | Pourquoi |
|---|---|---|
| Wide Push-up | Push-up | variante de musculation |
| Decline Push-up | Push-up | variante de musculation |
| Hindu Push-up | Push-up | variante de musculation |
| Weighted Push-up | Push-up | lestée, salle de sport |
| Pike Push-up | Push-up | variante avancée, épaule en charge |
| Feet-Elevated Pike Push-up | Push-up | variante avancée, épaule en charge |
| Handstand Push-up | Push-up | gymnastique avancée |
| Wall Walk | Push-up | gymnastique avancée (montée en appui renversé) |
| Wall Handstand Push-up | Push-up | gymnastique avancée |

## Tractions : on garde Traction, Traction assistée, Suspension active / passive et Traction scapulaire (9)

| Retiré | Remplacé dans les séances par | Pourquoi |
|---|---|---|
| Chin-up | Pull-up | doublon de la traction |
| Neutral-Grip Pull-up | Pull-up | doublon de la traction |
| Commando Pull-up | Pull-up | variante de musculation |
| L-Sit Pull-up | Pull-up | gymnastique avancée |
| Weighted Pull-up | Pull-up | lestée, performance |
| Weighted Chin-up | Pull-up | lestée, performance |
| Towel Pull-up | Pull-up | variante de grimpe / préhension |
| Negative Pull-up | Assisted Pull-up | même objectif que la traction assistée |
| Assisted Chin-up | Assisted Pull-up | doublon de la traction assistée |

## Dips : on garde Dips (barres parallèles), Dips sur chaise et Dips sur banc (3)

| Retiré | Remplacé dans les séances par | Pourquoi |
|---|---|---|
| Chest Dip | Dip | barres parallèles, épaule très sollicitée |
| Weighted Dip | Dip | lesté, performance |
| Assisted Dip | Dip | machine de salle, doublon |

## Exercices à la barre et à la machine guidée : on garde les versions haltères / poids du corps (38)

| Retiré | Remplacé dans les séances par | Pourquoi |
|---|---|---|
| Bench Press | Dumbbell Bench Press | barre, salle de sport |
| Close-Grip Bench Press | Dumbbell Bench Press | barre, salle de sport |
| Decline Bench Press | Dumbbell Bench Press | barre, salle de sport |
| Incline Bench Press | Incline Dumbbell Press | barre, salle de sport |
| Smith Machine Bench Press | Dumbbell Bench Press | machine guidée |
| Decline Dumbbell Press | Dumbbell Bench Press | doublon |
| Barbell Row | One-Arm Dumbbell Row | barre, salle de sport |
| Pendlay Row | One-Arm Dumbbell Row | haltérophilie |
| T-Bar Row | One-Arm Dumbbell Row | barre, salle de sport |
| Meadows Row | One-Arm Dumbbell Row | barre, salle de sport |
| Sumo Deadlift | Romanian Deadlift | barre, charge lourde |
| Trap Bar Deadlift | Romanian Deadlift | barre, charge lourde |
| Rack Pull | Romanian Deadlift | barre, charge lourde |
| Good Morning | Romanian Deadlift | barre sur la nuque |
| Smith Machine Romanian Deadlift | Romanian Deadlift | machine guidée |
| Landmine Romanian Deadlift | Romanian Deadlift | barre, salle de sport |
| Dumbbell Sumo Deadlift | Dumbbell Sumo Squat | presque identique au squat sumo (demandé par Philippe) |
| Front Squat | Goblet Squat | barre, salle de sport |
| Smith Machine Squat | Goblet Squat | machine guidée |
| Hack Squat | Leg Press | machine, doublon de la presse |
| Leg Press Calf Raise | Calf Raise | machine, doublon des mollets debout |
| Seated Calf Raise | Eccentric Calf Raise (Straight Knee, Single-Leg) | machine ; le travail genou fléchi (soléaire) existe sans machine |
| Standing Calf Raise | Calf Raise | barre sur les épaules, doublon |
| Assisted Standing Calf Raise | Calf Raise | même exercice que l'élévation lente à deux pieds (demandé par Philippe) |
| Lying Leg Curl | Leg Curl | doublon du leg curl |
| Kettlebell Romanian Deadlift | Romanian Deadlift | doublon (haltères) |
| Landmine Squat | Goblet Squat | barre, salle de sport |
| Belt Squat | Goblet Squat | machine spécialisée |
| Smith Machine Split Squat | Split Squat | machine guidée |
| Smith Machine Bulgarian Split Squat | Bulgarian Split Squat | machine guidée |
| Smith Machine Reverse Lunge | Reverse Lunge | machine guidée |
| Smith Machine Hip Thrust | Hip Thrust | machine guidée |
| Barbell Glute Bridge | Dumbbell Glute Bridge | barre, salle de sport |
| Barbell Shrug | Dumbbell Shrug | barre, doublon |
| Push Press | Standing Dumbbell Press | haltérophilie |
| Landmine Press | Standing Dumbbell Press | barre, salle de sport |
| Overhead Press | Standing Dumbbell Press | doublon |
| Machine Shoulder Press | Dumbbell Seated Shoulder Press | machine, doublon |

## Bras (biceps / triceps) : on garde Curl biceps (haltères et bouteille d'eau), Curl marteau, Extension triceps au-dessus de la tête, Kickback triceps (14)

| Retiré | Remplacé dans les séances par | Pourquoi |
|---|---|---|
| EZ-Bar Curl | Bicep Curl | barre, variante de musculation |
| Drag Curl | Bicep Curl | variante de musculation |
| Spider Curl | Bicep Curl | variante de musculation |
| Preacher Curl | Bicep Curl | machine / pupitre |
| Cable Curl | Bicep Curl | poulie, doublon |
| Incline Dumbbell Curl | Bicep Curl | variante de musculation |
| Rope Hammer Curl | Hammer Curl | poulie, doublon |
| Reverse Curl | Hammer Curl | barre, doublon du curl marteau |
| Skull Crusher | Overhead Tricep Extension | variante de musculation |
| Two Dumbbell Skullcrusher | Overhead Tricep Extension | variante de musculation |
| Single Dumbbell Skullcrusher | Overhead Tricep Extension | variante de musculation |
| Dumbbell Overhead Tricep Extension | Overhead Tricep Extension | doublon |
| Single Arm Dumbbell Tricep Extension | Overhead Tricep Extension | doublon |
| Rope Tricep Pushdown | Tricep Pushdown | doublon |

## Pectoraux, épaules, dos à la machine : on garde Écarté haltères, Élévations latérales / frontales, Oiseau, Tirage poitrine, Tirage horizontal (17)

| Retiré | Remplacé dans les séances par | Pourquoi |
|---|---|---|
| Cable Fly | Dumbbell Fly | poulie, doublon |
| Incline Cable Fly | Dumbbell Fly | poulie, doublon |
| Pec Deck | Dumbbell Fly | machine, doublon |
| Cable Lateral Raise | Lateral Raise | poulie, doublon |
| Machine Lateral Raise | Lateral Raise | machine, doublon |
| Cable Front Raise | Front Raise | poulie, doublon |
| Plate Front Raise | Front Raise | doublon |
| Cable Rear Delt Fly | Rear Delt Fly | poulie, doublon |
| Reverse Pec Deck | Rear Delt Fly | machine, doublon |
| Bent-Over Rear Delt Raise | Rear Delt Fly | doublon |
| Upright Row | Lateral Raise | souvent évité en kiné (conflit sous-acromial) |
| Wide-Grip Lat Pulldown | Lat Pulldown | doublon |
| Close-Grip Lat Pulldown | Lat Pulldown | doublon |
| Straight-Arm Pulldown | Lat Pulldown | poulie, variante de musculation |
| Machine Row | Seated Cable Row | machine, doublon |
| Chest Supported Row | Seated Cable Row | machine, doublon |
| Single-Arm Cable Row | Seated Cable Row | doublon |

## Abdominaux / gainage avancés : on garde Crunch, Crunch inversé, Relevé de jambes, Hollow, Dead bug, gainages (7)

| Retiré | Remplacé dans les séances par | Pourquoi |
|---|---|---|
| Dragon Flag | Lying Leg Raise | trop complexe (demandé par Philippe) |
| L-Sit Hold | Hollow Body Hold | gymnastique avancée |
| Hanging Leg Raise | Hanging Knee Raise | variante avancée |
| Decline Sit-Up | Crunch | banc incliné, lombaires sollicitées |
| Weighted Crunch | Crunch | lesté, doublon |
| Cable Crunch | Crunch | poulie, doublon |
| Weighted Russian Twist | Russian Twist | lesté, doublon |

## Fessiers / lombaires à la machine (4)

| Retiré | Remplacé dans les séances par | Pourquoi |
|---|---|---|
| Machine Glute Kickback | Banded Kickback | machine, doublon |
| Cable Kickback | Banded Kickback | poulie, doublon |
| Reverse Hyperextension | Back Extension | machine spécialisée |
| Glute-Focused Back Extension | Back Extension | doublon |

## Jambes, variantes avancées : on garde Pistol assisté, Squat sur box une jambe, Skater squat (4)

| Retiré | Remplacé dans les séances par | Pourquoi |
|---|---|---|
| Pistol Squat | Assisted Pistol Squat | variante avancée |
| Shrimp Squat | Single-Leg Box Squat | variante avancée |
| Sissy Squat | Bodyweight Squat | genou très sollicité, rarement prescrit |
| Weighted Single-Leg Glute Bridge | Single-Leg Glute Bridge | lesté, doublon |

## Cardio de salle : on garde Marche, Vélo, Rameur, Course, Escaliers (6)

| Retiré | Remplacé dans les séances par | Pourquoi |
|---|---|---|
| Elliptical | Cycling | demandé par Philippe |
| Assault Bike | Cycling | doublon du vélo |
| SkiErg | Rowing | machine rare |
| Battle Ropes | Jumping Jack | matériel de salle, performance |
| Stair Climber | Controlled Stair Climbing | machine, doublon des escaliers |
| Seal Jack | Jumping Jack | doublon |

