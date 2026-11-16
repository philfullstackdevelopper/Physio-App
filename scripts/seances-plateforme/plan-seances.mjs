// Programme des séances de la plateforme : 37 pathologies × 4 phases,
// 5 à 6 exercices FILMÉS (ou activités du quotidien) chacune, avec dosage.
// Dosage : "3x10" (séries × répétitions), "3x30s" (séries × tenue en s), "1x10min".
// Contenu rédigé par Claude le 2026-11-17 : À RELIRE PAR JULES.
export const PLAN = {
  "Arthrose de la hanche": {
    acute: ["Walking|1x10min", "Heel Slide|2x10", "Glute Bridge|2x10", "Side-Lying Hip Abduction|2x10", "Kneeling Hip Flexor Stretch|2x30s"],
    subacute: ["Cycling|1x10min", "Glute Bridge|3x10", "Side-Lying Hip Abduction|3x10", "Banded Clamshell|3x12", "Kneeling Hip Flexor Stretch|2x30s", "Sit-to-Stand|2x8"],
    recovery: ["Sit-to-Stand|3x10", "Assisted Partial Squat|3x10", "Banded Standing Hip Abduction|3x12", "Step-Up|3x8", "Glute Bridge March|3x8", "Single-Leg Stance|3x30s"],
    return_to_sport: ["Walking|1x20min", "Bodyweight Squat|3x12", "Step-Up|3x10", "Banded Lateral Walk|3x10", "Controlled Stair Climbing|1x5min"],
  },
  "Arthrose du genou": {
    acute: ["Quad Set|3x10", "Straight Leg Raise|3x10", "Heel Slide|2x10", "Glute Bridge|2x10", "Cycling|1x10min"],
    subacute: ["Cycling|1x10min", "Terminal Knee Extension (Band)|3x12", "Straight Leg Raise|3x12", "Sit-to-Stand|2x10", "Side-Lying Hip Abduction|3x10", "Wall Calf Stretch|2x30s"],
    recovery: ["Sit-to-Stand|3x10", "Assisted Partial Squat|3x12", "Step-Up|3x10", "Wall Sit|3x30s", "Banded Lateral Walk|3x10", "Calf Raise|3x15"],
    return_to_sport: ["Walking|1x20min", "Bodyweight Squat|3x12", "Step-Down|3x8", "Split Squat|3x8", "Single-Leg Stance|3x30s", "Controlled Stair Climbing|1x5min"],
  },
  "Cervicalgie": {
    acute: ["Chin Tuck|3x10", "Supine Chin Nod|3x10", "Active Cervical Rotation|2x10", "Upper Trapezius Stretch|2x30s", "Shoulder Circles|2x10"],
    subacute: ["Chin Tuck|3x10", "Active Cervical Rotation|2x10", "Upper Trapezius Stretch|2x30s", "Thoracic Extension Over Chair|2x10", "Wall Slides|3x10", "Reverse Snow Angel|2x10"],
    recovery: ["Chin Tuck|3x12", "Prone T Arm Raise (Floor)|3x10", "Prone Y Raise|3x10", "Banded Row|3x12", "Wall Slides|3x10", "Thoracic Extension Over Chair|2x10"],
    return_to_sport: ["Banded Face Pull|3x12", "Banded Row|3x12", "Prone Y Raise|3x12", "Dead Bug|3x10", "Plank|3x30s", "Chin Tuck|2x10"],
  },
  "Entorse cervicale": {
    acute: ["Supine Chin Nod|3x10", "Chin Tuck|2x10", "Active Cervical Rotation|2x8", "Shoulder Circles|2x10", "Walking|1x10min"],
    subacute: ["Chin Tuck|3x10", "Active Cervical Rotation|3x10", "Upper Trapezius Stretch|2x30s", "Thoracic Extension Over Chair|2x10", "Wall Slides|2x10"],
    recovery: ["Chin Tuck|3x12", "Prone T Arm Raise (Floor)|3x10", "Banded Row|3x12", "Reverse Snow Angel|3x10", "Dead Bug|3x10"],
    return_to_sport: ["Banded Face Pull|3x12", "Prone Y Raise|3x12", "Plank|3x30s", "Banded Row|3x12", "Bird Dog|3x10"],
  },
  "Conflit fémoro-acétabulaire": {
    acute: ["Glute Bridge|2x10", "Side-Lying Hip Abduction|2x10", "Bird Dog|2x8", "Dead Bug|2x8", "Walking|1x10min"],
    subacute: ["Glute Bridge|3x12", "Banded Clamshell|3x12", "Wall Lunge Hip Flexor Stretch|2x30s", "Cat-Cow Stretch|2x10", "Dead Bug|3x10"],
    recovery: ["Bodyweight Squat|3x10", "Banded Clamshell|3x15", "Glute Bridge March|3x8", "Banded Lateral Walk|3x10", "Pallof Press|3x10", "Side-Lying Hip Abduction|3x12"],
    return_to_sport: ["Bulgarian Split Squat|3x8", "Lateral Lunge|3x8", "Single-Leg Romanian Deadlift|3x8", "Banded Lateral Walk|3x12", "Plank|3x30s", "Lateral Shuffle|3x20s"],
  },
  "Conflit sous-acromial": {
    acute: ["Codman Pendulum|2x30s", "Supine Stick Shoulder Flexion|2x10", "Shoulder Isometrics Against Wall|3x5", "Chin Tuck|2x10", "Shoulder Circles|2x10"],
    subacute: ["Supine Stick Shoulder Flexion|3x10", "Wall Slides|3x10", "Side-Lying External Rotation|3x12", "Seated External Rotation (Elbow on Knee)|3x12", "Towel Internal Rotation Stretch|2x30s", "Thoracic Extension Over Chair|2x10"],
    recovery: ["Band Shoulder External Rotation|3x12", "Band Shoulder Internal Rotation|3x12", "Prone Y Raise|3x10", "Prone T Arm Raise (Floor)|3x10", "Banded Row|3x12", "Wall Push-up|3x10"],
    return_to_sport: ["External Rotation at 90° Abduction (Band)|3x12", "Banded Face Pull|3x12", "Lateral Raise|3x10", "Incline Push-up|3x10", "Plank Shoulder Tap|3x10", "Banded Row|3x12"],
  },
  "Déchirure du quadriceps": {
    acute: ["Quad Set|3x10", "Straight Leg Raise|2x10", "Heel Slide|2x10", "Glute Bridge|2x10", "Walking|1x10min"],
    subacute: ["Straight Leg Raise|3x12", "Terminal Knee Extension (Band)|3x12", "Cycling|1x10min", "Wall Sit|3x20s", "Kneeling Hip Flexor Stretch|2x30s"],
    recovery: ["Bodyweight Squat|3x12", "Step-Up|3x10", "Reverse Lunge|3x8", "Wall Sit|3x30s", "Step-Down|3x8", "Single-Leg Glute Bridge|3x10"],
    return_to_sport: ["Rotational Step-Up|3x8", "Bulgarian Split Squat|3x8", "Jump Squat|3x8", "Hop and Stick|3x6", "Running|1x15min", "Lateral Shuffle|3x20s"],
  },
  "Dorsalgie": {
    acute: ["Cat-Cow Stretch|2x10", "Child's Pose to Press-Up Flow|2x8", "Thoracic Extension Over Chair|2x8", "Shoulder Circles|2x10", "Walking|1x10min"],
    subacute: ["Reverse Snow Angel|3x10", "Cat-Cow Stretch|2x10", "Thoracic Extension Over Chair|2x10", "Wall Slides|3x10", "Chin Tuck|2x10"],
    recovery: ["Prone T Arm Raise (Floor)|3x10", "Prone Y Raise|3x10", "Banded Row|3x12", "Dead Bug|3x10", "Bird Dog|3x10"],
    return_to_sport: ["Banded Face Pull|3x12", "Plank|3x30s", "Modified Side Plank (Light)|3x20s", "Bird Dog|3x12", "Banded Row|3x15", "Prone Back Extension (Hands Behind Head)|3x10"],
  },
  "Élongation des ischio-jambiers": {
    acute: ["Glute Bridge|2x10", "Heel Slide|2x10", "Dead Bug|2x8", "Standing Bent-Leg Hamstring Stretch (Table)|2x20s", "Walking|1x10min"],
    subacute: ["Glute Bridge|3x12", "Single-Leg Glute Bridge|3x8", "Glute Bridge March|3x8", "Hamstring Stretch|2x30s", "Walking|1x15min"],
    recovery: ["Romanian Deadlift|3x10", "Single-Leg Glute Bridge|3x10", "Single-Leg Romanian Deadlift|3x8", "Hip Thrust|3x10", "Bird Dog|3x10"],
    return_to_sport: ["Romanian Deadlift|3x10", "Single-Leg Romanian Deadlift|3x10", "Running|1x15min", "Lateral Shuffle|3x20s", "Skater Hop|3x8", "Hop and Stick|3x6"],
  },
  "Élongation du mollet": {
    acute: ["Ankle Circles|2x10", "Wall Calf Stretch|2x20s", "Calf Raise|2x10", "Single-Leg Stance|2x20s", "Walking|1x10min"],
    subacute: ["Calf Raise|3x15", "Wall Calf Stretch|3x30s", "Kneeling Calf and Hip Flexor Wall Stretch|2x30s", "Single-Leg Stance|3x30s", "Cycling|1x10min"],
    recovery: ["Single-Leg Calf Raise|3x12", "Calf Raise|3x15", "Step-Down|3x8", "Wall Tibialis Raise|3x15", "Walking|1x20min"],
    return_to_sport: ["Single-Leg Calf Raise|3x15", "Hop and Stick|3x6", "Lateral Jump (Two Feet)|3x10", "Single-Leg Forward Hop|3x6", "Progressive Walk-to-Jog (Shin Splints, Soft Terrain)|1x15min", "Jump Rope|3x30s"],
  },
  "Entorse de la cheville": {
    acute: ["Ankle Circles|3x10", "Wall Calf Stretch|2x20s", "Single-Leg Stance|3x20s", "Glute Bridge|2x10", "Straight Leg Raise|2x10"],
    subacute: ["Ankle Circles|2x15", "Calf Raise|3x12", "Ankle Eversion (Band)|3x12", "Wall Calf Stretch|2x30s", "Single-Leg Stance|3x30s", "Wall Tibialis Raise|3x12"],
    recovery: ["Single-Leg Calf Raise|3x10", "Ankle Eversion (Band)|3x15", "Y-Balance Reach|3x8", "Single-Leg Stance|3x30s", "Step-Down|3x8", "Lateral Weight Shift|2x10"],
    return_to_sport: ["Hop and Stick|3x6", "Lateral Jump (Two Feet)|3x10", "Skater Hop|3x8", "Single-Leg Lateral Hop|3x6", "Lateral Shuffle|3x20s", "Single-Leg Calf Raise|3x15"],
  },
  "Entorse du ligament collatéral médial": {
    acute: ["Quad Set|3x10", "Straight Leg Raise|3x10", "Heel Slide|2x10", "Glute Bridge|2x10", "Side-Lying Hip Abduction|2x10"],
    subacute: ["Terminal Knee Extension (Band)|3x12", "Straight Leg Raise|3x12", "Cycling|1x10min", "Bodyweight Squat|2x10", "Wall Sit|3x20s"],
    recovery: ["Bodyweight Squat|3x12", "Step-Up|3x10", "Reverse Lunge|3x8", "Banded Lateral Walk|3x10", "Single-Leg Stance|3x30s", "Wall Sit|3x30s"],
    return_to_sport: ["Lateral Lunge|3x8", "Lateral Shuffle|3x20s", "Hop and Stick|3x6", "Skater Hop|3x8", "Bulgarian Split Squat|3x8", "Running|1x15min"],
  },
  "Fasciite plantaire": {
    acute: ["Wall Calf Stretch|3x30s", "Kneeling Calf and Hip Flexor Wall Stretch|2x30s", "Ankle Circles|2x10", "Calf Raise|2x10", "Walking|1x10min"],
    subacute: ["Calf Raise|3x12", "Wall Calf Stretch|3x30s", "Single-Leg Stance|3x30s", "Wall Tibialis Raise|3x12", "Cycling|1x10min"],
    recovery: ["Single-Leg Calf Raise|3x12", "Calf Raise|3x15", "Step-Down|3x8", "Single-Leg Stance|3x30s", "Walking|1x20min"],
    return_to_sport: ["Single-Leg Calf Raise|3x15", "Hop and Stick|3x6", "Lateral Jump (Two Feet)|3x10", "Wall Calf Stretch|2x30s", "Progressive Walk-to-Jog (Shin Splints, Soft Terrain)|1x15min"],
  },
  "Hernie discale lombaire": {
    acute: ["Prone Press-Up (McKenzie)|3x10", "Standing Lateral Pelvic Shift|2x10", "Child's Pose to Press-Up Flow|2x6", "Glute Bridge|2x10", "Walking|1x10min"],
    subacute: ["Prone Press-Up (McKenzie)|3x10", "Bird Dog|3x8", "Dead Bug|3x8", "Glute Bridge|3x12", "Walking|1x15min"],
    recovery: ["Bird Dog|3x10", "Dead Bug|3x10", "Modified Side Plank (Light)|3x20s", "Pallof Press|3x10", "Glute Bridge March|3x8"],
    return_to_sport: ["Plank|3x30s", "Modified Side Plank (Light)|3x30s", "Romanian Deadlift|3x10", "Farmer Carry|3x30s", "Pallof Press|3x12", "Bodyweight Squat|3x12"],
  },
  "Instabilité de l'épaule": {
    acute: ["Codman Pendulum|2x30s", "Shoulder Isometrics Against Wall|3x5", "Shoulder Circles|2x10", "Banded Row|2x10", "Wall Slides|2x8"],
    subacute: ["Shoulder Isometrics Against Wall|3x5", "Side-Lying External Rotation|3x12", "Band Shoulder Internal Rotation|3x12", "Banded Row|3x12", "Wall Push-up|3x10", "Prone T Arm Raise (Floor)|2x10"],
    recovery: ["Band Shoulder External Rotation|3x12", "Band Shoulder Internal Rotation|3x12", "Prone Y Raise|3x10", "Incline Push-up|3x10", "Bear Plank|3x20s", "Banded Row|3x12"],
    return_to_sport: ["External Rotation at 90° Abduction (Band)|3x12", "Push-up|3x10", "Plank Shoulder Tap|3x10", "Banded Face Pull|3x12", "Lateral Raise|3x10", "Bear Plank|3x30s"],
  },
  "Lombalgie chronique": {
    acute: ["Cat-Cow Stretch|2x10", "Child's Pose to Press-Up Flow|2x8", "Glute Bridge|2x10", "Dead Bug|2x8", "Walking|1x10min"],
    subacute: ["Bird Dog|3x10", "Dead Bug|3x10", "Glute Bridge|3x12", "Cat-Cow Stretch|2x10", "Kneeling Hip Flexor Stretch|2x30s", "Hamstring Stretch|2x30s"],
    recovery: ["Bird Dog|3x12", "Modified Side Plank (Light)|3x20s", "Pallof Press|3x10", "Glute Bridge March|3x10", "Sit-to-Stand|3x10", "Prone Back Extension (Hands Behind Head)|3x10"],
    return_to_sport: ["Plank|3x30s", "Romanian Deadlift|3x10", "Bodyweight Squat|3x12", "Farmer Carry|3x30s", "Reverse Lunge|3x10", "Pallof Press|3x12"],
  },
  "Méniscopathie": {
    acute: ["Quad Set|3x10", "Straight Leg Raise|3x10", "Heel Slide|2x10", "Glute Bridge|2x10", "Walking|1x10min"],
    subacute: ["Terminal Knee Extension (Band)|3x12", "Straight Leg Raise|3x12", "Cycling|1x10min", "Wall Sit|3x20s", "Side-Lying Hip Abduction|3x12", "Heel Slide|2x10"],
    recovery: ["Assisted Partial Squat|3x12", "Step-Up|3x10", "Wall Sit|3x30s", "Single-Leg Stance|3x30s", "Banded Lateral Walk|3x10", "Calf Raise|3x15"],
    return_to_sport: ["Bodyweight Squat|3x12", "Reverse Lunge|3x8", "Step-Down|3x8", "Hop and Stick|3x6", "Lateral Shuffle|3x20s", "Running|1x15min"],
  },
  "Prothèse totale de genou": {
    acute: ["Quad Set|3x10", "Heel Slide|3x10", "Ankle Circles|3x15", "Straight Leg Raise|2x10", "Assisted Progressive Walking|1x5min"],
    subacute: ["Heel Slide|3x12", "Straight Leg Raise|3x12", "Terminal Knee Extension (Band)|3x12", "Sit-to-Stand|2x8", "Assisted Progressive Walking|1x10min", "Cycling|1x10min"],
    recovery: ["Sit-to-Stand|3x10", "Assisted Partial Squat|3x10", "Step-Up|3x10", "Calf Raise|3x15", "Single-Leg Stance|3x20s", "Wall Sit|3x20s"],
    return_to_sport: ["Step-Down|3x8", "Bodyweight Squat|3x10", "Obstacle Step-Over|3x8", "Floor to Stand|2x5", "Controlled Stair Climbing|1x5min", "Walking|1x20min"],
  },
  "Prothèse totale de hanche": {
    acute: ["Ankle Circles|3x15", "Quad Set|3x10", "Heel Slide|2x10", "Glute Bridge|2x8", "Assisted Progressive Walking|1x5min"],
    subacute: ["Glute Bridge|3x10", "Side-Lying Hip Abduction|3x10", "Heel Slide|3x10", "Straight Leg Raise|3x10", "Sit-to-Stand|2x8", "Assisted Progressive Walking|1x10min"],
    recovery: ["Sit-to-Stand|3x10", "Banded Standing Hip Abduction|3x12", "Banded Clamshell|3x12", "Step-Up|3x8", "Single-Leg Stance|3x20s", "Glute Bridge March|3x8"],
    return_to_sport: ["Walking|1x20min", "Controlled Stair Climbing|1x5min", "Obstacle Step-Over|3x8", "Floor to Stand|2x5", "Banded Lateral Walk|3x10", "Bodyweight Squat|3x10"],
  },
  "Pubalgie": {
    acute: ["Glute Bridge|2x10", "Dead Bug|2x8", "Side-Lying Hip Abduction|2x10", "Kneeling Hip Flexor Stretch|2x30s", "Walking|1x10min"],
    subacute: ["Dead Bug|3x10", "Glute Bridge|3x12", "Bird Dog|3x10", "Pallof Press|3x10", "Lateral Lunge|2x8", "Cycling|1x10min"],
    recovery: ["Lateral Lunge|3x8", "Pallof Press|3x12", "Modified Side Plank (Light)|3x20s", "Banded Lateral Walk|3x10", "Single-Leg Glute Bridge|3x10", "Plank|3x30s"],
    return_to_sport: ["Lateral Shuffle|3x20s", "Skater Hop|3x8", "Curtsy Lunge|3x8", "Lateral Lunge|3x10", "Plank|3x30s", "Running|1x15min"],
  },
  "Périostite tibiale": {
    acute: ["Wall Tibialis Raise|2x12", "Calf Raise|2x12", "Wall Calf Stretch|2x30s", "Ankle Circles|2x10", "Cycling|1x10min"],
    subacute: ["Calf Raise|3x15", "Wall Tibialis Raise|3x15", "Single-Leg Stance|3x30s", "Glute Bridge|3x12", "Cycling|1x15min"],
    recovery: ["Single-Leg Calf Raise|3x12", "Wall Tibialis Raise|3x20", "Step-Down|3x8", "Side-Lying Hip Abduction|3x12", "Walking|1x20min"],
    return_to_sport: ["Progressive Walk-to-Jog (Shin Splints, Soft Terrain)|1x20min", "Single-Leg Calf Raise|3x15", "Hop and Stick|3x6", "Lateral Jump (Two Feet)|3x10", "Running|1x15min"],
  },
  "Reconditionnement physique général": {
    acute: ["Walking|1x15min", "Sit-to-Stand|2x8", "Wall Push-up|2x8", "Glute Bridge|2x10", "Single-Leg Stance|2x20s"],
    subacute: ["Walking|1x20min", "Sit-to-Stand|3x10", "Wall Push-up|3x10", "Glute Bridge|3x12", "Bird Dog|2x8", "Calf Raise|2x12"],
    recovery: ["Cycling|1x20min", "Bodyweight Squat|3x12", "Incline Push-up|3x10", "Banded Row|3x12", "Step-Up|3x10", "Forward Lunge|3x8"],
    return_to_sport: ["Bodyweight Squat|3x15", "Push-up|3x10", "Reverse Lunge|3x10", "Farmer Carry|3x30s", "Plank|3x30s", "Running|1x15min"],
  },
  "Rupture du ligament croisé antérieur": {
    acute: ["Quad Set|3x10", "Straight Leg Raise|3x10", "Heel Slide|3x10", "Ankle Circles|3x15", "Assisted Progressive Walking|1x5min"],
    subacute: ["Terminal Knee Extension (Band)|3x15", "Straight Leg Raise|3x12", "Heel Slide|3x12", "Cycling|1x10min", "Single-Leg Stance|3x20s", "Sit-to-Stand|2x10"],
    recovery: ["Bodyweight Squat|3x12", "Step-Up|3x10", "Step-Down|3x8", "Single-Leg Romanian Deadlift|3x8", "Wall Sit|3x30s", "Y-Balance Reach|3x8"],
    return_to_sport: ["Step Drop Landing (Two Feet)|3x6", "Step Drop Landing (Single Leg)|3x6", "Hop and Stick|3x6", "Lateral Step-Over Hop|3x8", "Bulgarian Split Squat|3x8", "Lunge to Step-Up with Knee Drive|3x8"],
  },
  "Rupture du tendon d'Achille": {
    acute: ["Ankle Circles|3x10", "Quad Set|3x10", "Straight Leg Raise|3x10", "Glute Bridge|2x10", "Assisted Progressive Walking|1x5min"],
    subacute: ["Ankle Circles|3x15", "Wall Tibialis Raise|2x12", "Single-Leg Stance|3x20s", "Glute Bridge|3x12", "Cycling|1x10min"],
    recovery: ["Calf Raise|3x15", "Single-Leg Calf Raise|3x8", "Step-Down|3x8", "Single-Leg Stance|3x30s", "Walking|1x20min"],
    return_to_sport: ["Single-Leg Calf Raise|3x15", "Hop and Stick|3x6", "Lateral Jump (Two Feet)|3x10", "Single-Leg Forward Hop|3x6", "Progressive Walk-to-Jog (Shin Splints, Soft Terrain)|1x15min"],
  },
  "Sciatique": {
    acute: ["Prone Press-Up (McKenzie)|3x10", "Standing Lateral Pelvic Shift|2x10", "Child's Pose to Press-Up Flow|2x8", "Glute Bridge|2x10", "Walking|1x10min"],
    subacute: ["Prone Press-Up (McKenzie)|3x10", "Bird Dog|3x8", "Dead Bug|3x8", "Glute Bridge|3x12", "Kneeling Hip Flexor Stretch|2x30s", "Walking|1x15min"],
    recovery: ["Bird Dog|3x10", "Modified Side Plank (Light)|3x20s", "Glute Bridge March|3x8", "Pallof Press|3x10", "Sit-to-Stand|3x10"],
    return_to_sport: ["Plank|3x30s", "Romanian Deadlift|3x10", "Bodyweight Squat|3x12", "Farmer Carry|3x30s", "Walking|1x30min"],
  },
  "Sténose spinale lombaire": {
    acute: ["Seated Spinal Roll-Down|2x8", "Cat-Cow Stretch|2x10", "Glute Bridge|2x10", "Dead Bug|2x8", "Cycling|1x10min"],
    subacute: ["Seated Spinal Roll-Down|2x10", "Dead Bug|3x10", "Glute Bridge|3x12", "Kneeling Hip Flexor Stretch|2x30s", "Bird Dog|2x8", "Cycling|1x15min"],
    recovery: ["Sit-to-Stand|3x10", "Bird Dog|3x10", "Modified Side Plank (Light)|3x20s", "Glute Bridge March|3x8", "Step-Up|3x8", "Pallof Press|3x10"],
    return_to_sport: ["Walking|1x20min", "Bodyweight Squat|3x12", "Farmer Carry|3x30s", "Step-Up|3x10", "Plank|3x30s"],
  },
  "Syndrome croisé supérieur": {
    acute: ["Chin Tuck|3x10", "Upper Trapezius Stretch|2x30s", "Thoracic Extension Over Chair|2x10", "Shoulder Circles|2x10", "Wall Slides|2x10"],
    subacute: ["Chin Tuck|3x10", "Reverse Snow Angel|3x10", "Thoracic Extension Over Chair|2x10", "Wall Slides|3x10", "Prone T Arm Raise (Floor)|2x10", "Upper Trapezius Stretch|2x30s"],
    recovery: ["Prone Y Raise|3x10", "Prone T Arm Raise (Floor)|3x12", "Banded Row|3x12", "Banded Face Pull|3x12", "Reverse Snow Angel|3x12", "Chin Tuck|2x10"],
    return_to_sport: ["Banded Face Pull|3x15", "Banded Row|3x15", "Push-up|3x10", "Plank|3x30s", "Prone Y Raise|3x12"],
  },
  "Syndrome de la bandelette ilio-tibiale": {
    acute: ["Side-Lying Hip Abduction|2x10", "Glute Bridge|2x10", "Banded Clamshell|2x10", "Kneeling Hip Flexor Stretch|2x30s", "Cycling|1x10min"],
    subacute: ["Side-Lying Hip Abduction|3x12", "Banded Clamshell|3x15", "Glute Bridge|3x12", "Single-Leg Stance|3x30s", "Kneeling Hip Flexor Stretch|2x30s"],
    recovery: ["Banded Lateral Walk|3x12", "Banded Standing Hip Abduction|3x12", "Single-Leg Glute Bridge|3x10", "Step-Down|3x8", "Single-Leg Romanian Deadlift|3x8"],
    return_to_sport: ["Lateral Shuffle|3x20s", "Skater Hop|3x8", "Bulgarian Split Squat|3x8", "Progressive Walk-to-Jog (Shin Splints, Soft Terrain)|1x15min", "Running|1x20min"],
  },
  "Syndrome du canal carpien": {
    acute: ["Wrist Radial-Ulnar Deviation|2x10", "Foam Ball Squeeze|2x10", "Shoulder Circles|2x10", "Chin Tuck|2x10", "Upper Trapezius Stretch|2x30s"],
    subacute: ["Wrist Radial-Ulnar Deviation|3x10", "Foam Ball Squeeze|3x10", "Thoracic Extension Over Chair|2x10", "Chin Tuck|2x10", "Wall Slides|2x10"],
    recovery: ["Wrist Radial-Ulnar Deviation|3x12", "Foam Ball Squeeze|3x12", "Banded Row|3x12", "Wall Push-up|3x10", "Chin Tuck|2x10"],
    return_to_sport: ["Wrist Radial-Ulnar Deviation|3x15", "Foam Ball Squeeze|3x15", "Incline Push-up|3x10", "Banded Row|3x12", "Farmer Carry|3x30s"],
  },
  "Syndrome du piriforme": {
    acute: ["Glute Bridge|2x10", "Cat-Cow Stretch|2x10", "Side-Lying Hip Abduction|2x10", "Kneeling Hip Flexor Stretch|2x30s", "Walking|1x10min"],
    subacute: ["Banded Clamshell|3x12", "Glute Bridge|3x12", "Bird Dog|3x8", "Side-Lying Hip Abduction|3x12", "Kneeling Hip Flexor Stretch|2x30s"],
    recovery: ["Banded Lateral Walk|3x10", "Single-Leg Glute Bridge|3x10", "Banded Standing Hip Abduction|3x12", "Hip Thrust|3x10", "Pallof Press|3x10"],
    return_to_sport: ["Lateral Lunge|3x8", "Single-Leg Romanian Deadlift|3x8", "Bulgarian Split Squat|3x8", "Lateral Shuffle|3x20s", "Running|1x15min"],
  },
  "Syndrome fémoro-patellaire": {
    acute: ["Quad Set|3x10", "Straight Leg Raise|3x10", "Side-Lying Hip Abduction|2x12", "Banded Clamshell|2x12", "Glute Bridge|2x10"],
    subacute: ["Straight Leg Raise|3x12", "Terminal Knee Extension (Band)|3x12", "Wall Sit|3x20s", "Banded Clamshell|3x15", "Side-Lying Hip Abduction|3x12", "Cycling|1x10min"],
    recovery: ["Assisted Partial Squat|3x12", "Step-Up|3x10", "Reverse Lunge|3x8", "Banded Lateral Walk|3x10", "Wall Sit|3x30s", "Single-Leg Glute Bridge|3x10"],
    return_to_sport: ["Bodyweight Squat|3x12", "Step-Down|3x10", "Split Squat|3x8", "Single-Leg Box Squat|3x8", "Lateral Shuffle|3x20s", "Running|1x15min"],
  },
  "Tendinopathie d'Achille": {
    acute: ["Calf Raise|2x10", "Wall Calf Stretch|2x30s", "Ankle Circles|2x10", "Single-Leg Stance|2x20s", "Cycling|1x10min"],
    subacute: ["Calf Raise|3x15", "Wall Calf Stretch|2x30s", "Single-Leg Stance|3x30s", "Wall Tibialis Raise|3x12", "Glute Bridge|3x12"],
    recovery: ["Single-Leg Calf Raise|3x12", "Calf Raise|3x15", "Step-Down|3x8", "Single-Leg Glute Bridge|3x10", "Walking|1x20min"],
    return_to_sport: ["Single-Leg Calf Raise|3x15", "Hop and Stick|3x6", "Lateral Jump (Two Feet)|3x10", "Single-Leg Forward Hop|3x6", "Progressive Walk-to-Jog (Shin Splints, Soft Terrain)|1x15min"],
  },
  "Tendinopathie de l'épaule": {
    acute: ["Codman Pendulum|2x30s", "Shoulder Isometrics Against Wall|3x5", "Supine Stick Shoulder Flexion|2x10", "Shoulder Circles|2x10", "Chin Tuck|2x10"],
    subacute: ["Seated External Rotation (Elbow on Knee)|3x12", "Side-Lying External Rotation|3x12", "Supine Stick Shoulder Flexion|3x10", "Wall Slides|3x10", "Towel Internal Rotation Stretch|2x30s"],
    recovery: ["Band Shoulder External Rotation|3x12", "Band Shoulder Internal Rotation|3x12", "Lateral Raise|3x10", "Banded Row|3x12", "Prone Y Raise|3x10", "Wall Push-up|3x10"],
    return_to_sport: ["External Rotation at 90° Abduction (Band)|3x12", "Banded Face Pull|3x12", "Incline Push-up|3x10", "Lateral Raise|3x12", "Plank Shoulder Tap|3x10"],
  },
  "Tendinopathie des fessiers": {
    acute: ["Glute Bridge|2x10", "Banded Standing Hip Abduction|2x10", "Sit-to-Stand|2x8", "Single-Leg Stance|2x20s", "Walking|1x10min"],
    subacute: ["Glute Bridge|3x12", "Banded Standing Hip Abduction|3x12", "Sit-to-Stand|3x10", "Single-Leg Stance|3x30s", "Bird Dog|2x8"],
    recovery: ["Single-Leg Glute Bridge|3x10", "Step-Up|3x10", "Banded Lateral Walk|3x10", "Hip Thrust|3x10", "Glute Bridge March|3x8"],
    return_to_sport: ["Bulgarian Split Squat|3x8", "Single-Leg Romanian Deadlift|3x8", "Step-Up|3x12", "Lateral Lunge|3x8", "Walking|1x30min"],
  },
  "Tendinopathie du coude": {
    acute: ["Foam Ball Squeeze|2x10", "Wrist Radial-Ulnar Deviation|2x10", "Shoulder Circles|2x10", "Banded Row|2x10", "Chin Tuck|2x10"],
    subacute: ["Foam Ball Squeeze|3x10", "Wrist Radial-Ulnar Deviation|3x10", "Banded Row|3x12", "Band Shoulder External Rotation|3x12", "Wall Push-up|2x10"],
    recovery: ["Wrist Radial-Ulnar Deviation|3x15", "Foam Ball Squeeze|3x15", "Banded Row|3x12", "Wall Push-up|3x10", "Band Shoulder External Rotation|3x12"],
    return_to_sport: ["Wrist Radial-Ulnar Deviation|3x15", "Foam Ball Squeeze|3x15", "Farmer Carry|3x30s", "Incline Push-up|3x10", "Banded Row|3x15"],
  },
  "Tendinopathie du poignet": {
    acute: ["Foam Ball Squeeze|2x10", "Wrist Radial-Ulnar Deviation|2x10", "Shoulder Circles|2x10", "Chin Tuck|2x10", "Upper Trapezius Stretch|2x30s"],
    subacute: ["Foam Ball Squeeze|3x10", "Wrist Radial-Ulnar Deviation|3x10", "Banded Row|3x12", "Wall Push-up|2x10", "Thoracic Extension Over Chair|2x10"],
    recovery: ["Wrist Radial-Ulnar Deviation|3x15", "Foam Ball Squeeze|3x15", "Banded Row|3x12", "Wall Push-up|3x10", "Band Shoulder External Rotation|3x12"],
    return_to_sport: ["Wrist Radial-Ulnar Deviation|3x15", "Foam Ball Squeeze|3x15", "Farmer Carry|3x30s", "Incline Push-up|3x10", "Push-up|3x8"],
  },
  "Tendinopathie rotulienne": {
    acute: ["Wall Sit|3x30s", "Straight Leg Raise|3x10", "Glute Bridge|2x10", "Kneeling Hip Flexor Stretch|2x30s", "Cycling|1x10min"],
    subacute: ["Wall Sit|4x40s", "Terminal Knee Extension (Band)|3x12", "Single-Leg Glute Bridge|3x8", "Calf Raise|3x15", "Cycling|1x15min"],
    recovery: ["Step-Down|3x8", "Split Squat|3x8", "Single-Leg Box Squat|3x8", "Bodyweight Squat|3x12", "Wall Sit|3x45s"],
    return_to_sport: ["Jump Squat|3x8", "Hop and Stick|3x6", "Step Drop Landing (Two Feet)|3x6", "Bulgarian Split Squat|3x8", "Running|1x15min"],
  },
};

export const STAGE_DEFAULT_NAME = {
  acute: "Phase 1 — Soulagement (jours 0-7)",
  subacute: "Phase 2 — Mobilité (semaines 1-2)",
  recovery: "Phase 3 — Renforcement (semaines 2-4)",
  return_to_sport: "Phase 4 — Reprise (semaines 4+)",
};

export function parseDose(d) {
  let m;
  if ((m = /^(\d+)x(\d+)min$/.exec(d))) return { sets: +m[1], reps: null, hold: +m[2] * 60 };
  if ((m = /^(\d+)x(\d+)s$/.exec(d))) return { sets: +m[1], reps: null, hold: +m[2] };
  if ((m = /^(\d+)x(\d+)$/.exec(d))) return { sets: +m[1], reps: +m[2], hold: null };
  throw new Error("dose ? " + d);
}

import { PLAN_EXTRA } from "./plan-extra.mjs";
Object.assign(PLAN, PLAN_EXTRA);
