// 13 pathologies de la plateforme qui n'avaient AUCUNE séance (2026-11-17). À RELIRE PAR JULES.
export const PLAN_EXTRA = {
  "Bursite du coude": {
    acute: ["Foam Ball Squeeze|2x10", "Wrist Radial-Ulnar Deviation|2x10", "Shoulder Circles|2x10", "Chin Tuck|2x10", "Walking|1x10min"],
    subacute: ["Foam Ball Squeeze|3x10", "Wrist Radial-Ulnar Deviation|3x10", "Banded Row|2x12", "Band Shoulder External Rotation|2x12", "Wall Push-up|2x8"],
    recovery: ["Foam Ball Squeeze|3x15", "Wrist Radial-Ulnar Deviation|3x15", "Banded Row|3x12", "Wall Push-up|3x10", "Band Shoulder External Rotation|3x12"],
    return_to_sport: ["Foam Ball Squeeze|3x15", "Wrist Radial-Ulnar Deviation|3x15", "Farmer Carry|3x30s", "Incline Push-up|3x10", "Banded Row|3x15"],
  },
  "Capsulite de l'épaule": {
    acute: ["Codman Pendulum|3x30s", "Supine Stick Shoulder Flexion|2x10", "Shoulder Circles|2x10", "Towel Internal Rotation Stretch|2x20s", "Chin Tuck|2x10"],
    subacute: ["Supine Stick Shoulder Flexion|3x10", "Wall Slides|3x10", "Towel Internal Rotation Stretch|3x30s", "Seated External Rotation (Elbow on Knee)|3x12", "Codman Pendulum|2x30s", "Thoracic Extension Over Chair|2x10"],
    recovery: ["Band Shoulder External Rotation|3x12", "Band Shoulder Internal Rotation|3x12", "Wall Slides|3x10", "Banded Row|3x12", "Prone T Arm Raise (Floor)|3x10", "Towel Internal Rotation Stretch|2x30s"],
    return_to_sport: ["External Rotation at 90° Abduction (Band)|3x12", "Lateral Raise|3x10", "Banded Face Pull|3x12", "Incline Push-up|3x10", "Prone Y Raise|3x10"],
  },
  "Entorse acromio-claviculaire": {
    acute: ["Codman Pendulum|2x30s", "Shoulder Isometrics Against Wall|3x5", "Shoulder Circles|2x10", "Chin Tuck|2x10", "Walking|1x10min"],
    subacute: ["Supine Stick Shoulder Flexion|3x10", "Wall Slides|3x10", "Side-Lying External Rotation|3x12", "Banded Row|3x12", "Shoulder Isometrics Against Wall|3x5"],
    recovery: ["Band Shoulder External Rotation|3x12", "Band Shoulder Internal Rotation|3x12", "Prone T Arm Raise (Floor)|3x10", "Banded Row|3x12", "Wall Push-up|3x10", "Prone Y Raise|3x10"],
    return_to_sport: ["Incline Push-up|3x10", "Push-up|3x8", "Plank Shoulder Tap|3x10", "Banded Face Pull|3x12", "Lateral Raise|3x10"],
  },
  "Entorse du poignet": {
    acute: ["Foam Ball Squeeze|2x10", "Shoulder Circles|2x10", "Chin Tuck|2x10", "Walking|1x10min"],
    subacute: ["Wrist Radial-Ulnar Deviation|3x10", "Foam Ball Squeeze|3x10", "Wall Push-up|2x8", "Banded Row|3x12", "Thoracic Extension Over Chair|2x10"],
    recovery: ["Wrist Radial-Ulnar Deviation|3x15", "Foam Ball Squeeze|3x15", "Wall Push-up|3x10", "Banded Row|3x12", "Band Shoulder External Rotation|3x12"],
    return_to_sport: ["Wrist Radial-Ulnar Deviation|3x15", "Foam Ball Squeeze|3x15", "Incline Push-up|3x10", "Bear Plank|3x20s", "Farmer Carry|3x30s", "Push-up|3x8"],
  },
  "Fracture de la cheville": {
    acute: ["Quad Set|3x10", "Straight Leg Raise|3x10", "Glute Bridge|2x10", "Assisted Progressive Walking|1x5min"],
    subacute: ["Ankle Circles|3x15", "Calf Raise|2x10", "Wall Calf Stretch|2x30s", "Single-Leg Stance|3x20s", "Cycling|1x10min", "Side-Lying Hip Abduction|3x12"],
    recovery: ["Calf Raise|3x15", "Single-Leg Calf Raise|3x8", "Step-Up|3x10", "Step-Down|3x8", "Single-Leg Stance|3x30s", "Walking|1x20min"],
    return_to_sport: ["Single-Leg Calf Raise|3x12", "Y-Balance Reach|3x8", "Hop and Stick|3x6", "Lateral Jump (Two Feet)|3x10", "Progressive Walk-to-Jog (Shin Splints, Soft Terrain)|1x15min"],
  },
  "Fracture du poignet": {
    acute: ["Foam Ball Squeeze|2x10", "Shoulder Circles|2x10", "Supine Stick Shoulder Flexion|2x10", "Chin Tuck|2x10"],
    subacute: ["Wrist Radial-Ulnar Deviation|3x10", "Foam Ball Squeeze|3x10", "Wall Slides|3x10", "Banded Row|3x12", "Shoulder Circles|2x10"],
    recovery: ["Wrist Radial-Ulnar Deviation|3x15", "Foam Ball Squeeze|3x15", "Wall Push-up|3x10", "Banded Row|3x12", "Band Shoulder External Rotation|3x12"],
    return_to_sport: ["Wrist Radial-Ulnar Deviation|3x15", "Foam Ball Squeeze|3x15", "Incline Push-up|3x10", "Bear Plank|3x20s", "Farmer Carry|3x30s"],
  },
  "Instabilité chronique de cheville": {
    acute: ["Ankle Circles|2x15", "Ankle Eversion (Band)|2x10", "Single-Leg Stance|3x20s", "Calf Raise|2x12", "Lateral Weight Shift|2x10"],
    subacute: ["Ankle Eversion (Band)|3x12", "Single-Leg Stance|3x30s", "Calf Raise|3x15", "Lateral Weight Shift|3x10", "Wall Tibialis Raise|3x12", "Y-Balance Reach|2x6"],
    recovery: ["Single-Leg Calf Raise|3x10", "Ankle Eversion (Band)|3x15", "Y-Balance Reach|3x8", "Step-Down|3x8", "Banded Lateral Walk|3x10", "Single-Leg Stance|3x30s"],
    return_to_sport: ["Hop and Stick|3x6", "Single-Leg Lateral Hop|3x6", "Skater Hop|3x8", "Lateral Jump (Two Feet)|3x10", "Lateral Shuffle|3x20s", "Single-Leg Forward Hop|3x6"],
  },
  "Prothèse totale d'épaule": {
    acute: ["Codman Pendulum|2x30s", "Shoulder Circles|2x10", "Chin Tuck|2x10", "Walking|1x10min"],
    subacute: ["Supine Stick Shoulder Flexion|3x10", "Codman Pendulum|2x30s", "Wall Slides|2x8", "Thoracic Extension Over Chair|2x10"],
    recovery: ["Side-Lying External Rotation|3x12", "Seated External Rotation (Elbow on Knee)|3x12", "Band Shoulder Internal Rotation|3x12", "Banded Row|3x12", "Wall Slides|3x10", "Wall Push-up|3x10"],
    return_to_sport: ["Band Shoulder External Rotation|3x12", "Lateral Raise|3x10", "Banded Row|3x12", "Prone T Arm Raise (Floor)|3x10", "Incline Push-up|3x10"],
  },
  "Réparation de la coiffe des rotateurs": {
    acute: ["Codman Pendulum|3x30s", "Shoulder Circles|2x10", "Chin Tuck|2x10", "Upper Trapezius Stretch|2x30s", "Walking|1x10min"],
    subacute: ["Supine Stick Shoulder Flexion|3x10", "Codman Pendulum|2x30s", "Wall Slides|2x8", "Thoracic Extension Over Chair|2x10"],
    recovery: ["Side-Lying External Rotation|3x12", "Seated External Rotation (Elbow on Knee)|3x12", "Band Shoulder External Rotation|3x12", "Band Shoulder Internal Rotation|3x12", "Banded Row|3x12", "Prone T Arm Raise (Floor)|3x10"],
    return_to_sport: ["External Rotation at 90° Abduction (Band)|3x12", "Lateral Raise|3x10", "Banded Face Pull|3x12", "Prone Y Raise|3x10", "Incline Push-up|3x10"],
  },
  "Rhizarthrose": {
    acute: ["Wrist Radial-Ulnar Deviation|2x10", "Shoulder Circles|2x10", "Chin Tuck|2x10", "Upper Trapezius Stretch|2x30s"],
    subacute: ["Foam Ball Squeeze|3x10", "Wrist Radial-Ulnar Deviation|3x10", "Shoulder Circles|2x10", "Thoracic Extension Over Chair|2x10", "Wall Slides|2x10"],
    recovery: ["Foam Ball Squeeze|3x12", "Wrist Radial-Ulnar Deviation|3x12", "Banded Row|3x12", "Wall Push-up|3x10", "Band Shoulder External Rotation|3x12"],
    return_to_sport: ["Foam Ball Squeeze|3x15", "Wrist Radial-Ulnar Deviation|3x15", "Banded Row|3x12", "Incline Push-up|3x10"],
  },
  "Syndrome du défilé thoracique": {
    acute: ["Chin Tuck|3x10", "Upper Trapezius Stretch|2x30s", "Shoulder Circles|2x10", "Thoracic Extension Over Chair|2x10", "Supine Chin Nod|3x10"],
    subacute: ["Chin Tuck|3x10", "Reverse Snow Angel|3x10", "Thoracic Extension Over Chair|2x10", "Wall Slides|3x10", "Upper Trapezius Stretch|2x30s", "Prone T Arm Raise (Floor)|2x10"],
    recovery: ["Prone T Arm Raise (Floor)|3x10", "Prone Y Raise|3x10", "Banded Row|3x12", "Banded Face Pull|3x12", "Reverse Snow Angel|3x12"],
    return_to_sport: ["Banded Face Pull|3x15", "Banded Row|3x15", "Prone Y Raise|3x12", "Plank|3x30s", "Incline Push-up|3x10"],
  },
  "Tendinopathie de De Quervain": {
    acute: ["Shoulder Circles|2x10", "Chin Tuck|2x10", "Upper Trapezius Stretch|2x30s", "Thoracic Extension Over Chair|2x10"],
    subacute: ["Foam Ball Squeeze|3x10", "Banded Row|3x12", "Wall Push-up|2x10", "Thoracic Extension Over Chair|2x10"],
    recovery: ["Wrist Radial-Ulnar Deviation|3x15", "Foam Ball Squeeze|3x15", "Banded Row|3x12", "Wall Push-up|3x10", "Band Shoulder External Rotation|3x12"],
    return_to_sport: ["Wrist Radial-Ulnar Deviation|3x15", "Foam Ball Squeeze|3x15", "Incline Push-up|3x10", "Banded Row|3x15"],
  },
  "Torticolis": {
    acute: ["Supine Chin Nod|3x10", "Active Cervical Rotation|2x8", "Shoulder Circles|2x10", "Upper Trapezius Stretch|2x30s", "Walking|1x10min"],
    subacute: ["Chin Tuck|3x10", "Active Cervical Rotation|3x10", "Upper Trapezius Stretch|2x30s", "Thoracic Extension Over Chair|2x10", "Wall Slides|2x10"],
    recovery: ["Chin Tuck|3x12", "Prone T Arm Raise (Floor)|3x10", "Banded Row|3x12", "Reverse Snow Angel|3x10", "Active Cervical Rotation|2x10"],
    return_to_sport: ["Banded Face Pull|3x12", "Banded Row|3x12", "Prone Y Raise|3x12", "Chin Tuck|2x10", "Plank|3x30s"],
  },
};
