// Retire des phases 1-2 les exercices dont la pertinence est douteuse (Philippe, 17/11 :
// « if there are certain things you aren't sure about in the early stages just take them out »),
// plus 2 cas nets en phase 4 (port de charges pour le pouce). Minimum 4 exercices par séance.
import fs from "node:fs";
const REMOVE = [
  // [pathologie, phase, exercice, raison]
  ["Réparation de la coiffe des rotateurs", "subacute", "Shoulder Isometrics Against Wall", "contraction contre résistance trop tôt après suture"],
  ["Prothèse totale d'épaule", "acute", "Supine Stick Shoulder Flexion", "élévation active-aidée : selon protocole du chirurgien"],
  ["Prothèse totale d'épaule", "subacute", "Shoulder Isometrics Against Wall", "rotation interne contre résistance (sous-scapulaire réinséré)"],
  ["Rupture du tendon d'Achille", "acute", "Ankle Circles", "flexion dorsale à éviter (botte)"],
  ["Fracture de la cheville", "acute", "Ankle Circles", "mobilisation selon l'ostéosynthèse"],
  ["Prothèse totale de hanche", "acute", "Glute Bridge", "trop tôt la première semaine"],
  ["Prothèse totale de hanche", "subacute", "Straight Leg Raise", "sollicite l'avant de la hanche opérée"],
  ["Tendinopathie de De Quervain", "acute", "Wrist Radial-Ulnar Deviation", "charge les tendons atteints"],
  ["Tendinopathie de De Quervain", "acute", "Foam Ball Squeeze", "serrage = douleur"],
  ["Tendinopathie de De Quervain", "subacute", "Wrist Radial-Ulnar Deviation", "charge les tendons atteints"],
  ["Tendinopathie de De Quervain", "return_to_sport", "Farmer Carry", "prise forte prolongée"],
  ["Rhizarthrose", "acute", "Foam Ball Squeeze", "pince pouce-doigts en poussée douloureuse"],
  ["Rhizarthrose", "return_to_sport", "Farmer Carry", "prise forte prolongée"],
  ["Syndrome du canal carpien", "acute", "Foam Ball Squeeze", "serrage répété"],
  ["Fracture du poignet", "acute", "Wrist Radial-Ulnar Deviation", "poignet immobilisé"],
  ["Entorse du poignet", "acute", "Wrist Radial-Ulnar Deviation", "trop tôt"],
  ["Élongation des ischio-jambiers", "acute", "Standing Bent-Leg Hamstring Stretch (Table)", "étirement déconseillé sur lésion récente"],
  ["Élongation du mollet", "acute", "Wall Calf Stretch", "étirement déconseillé sur lésion récente"],
  ["Déchirure du quadriceps", "subacute", "Kneeling Hip Flexor Stretch", "étire le droit fémoral lésé"],
  ["Entorse de la cheville", "acute", "Single-Leg Stance", "appui unipodal trop tôt"],
  ["Pubalgie", "acute", "Kneeling Hip Flexor Stretch", "étirement en phase douloureuse"],
];
// Remplacement quand il resterait moins de 4 exercices.
const ADD = [
  ["Tendinopathie de De Quervain", "acute", "Thoracic Extension Over Chair|2x10"],
];
for (const f of process.argv.slice(2)) {
  let s = fs.readFileSync(f, "utf8");
  const L = s.split(/\r?\n/);
  let cur = null;
  for (let i = 0; i < L.length; i++) {
    const c = /^  "(.+)": \{$/.exec(L[i]);
    if (c) { cur = c[1]; continue; }
    const st = /^    (acute|subacute|recovery|return_to_sport): \[/.exec(L[i]);
    if (!st || !cur) continue;
    for (const [cond, stage, ex] of REMOVE) {
      if (cond !== cur || stage !== st[1]) continue;
      const before = L[i];
      L[i] = L[i].replace(new RegExp(`"${ex.replace(/[()]/g, "\\$&")}\\|[^"]+", ?`), "").replace(new RegExp(`, "${ex.replace(/[()]/g, "\\$&")}\\|[^"]+"`), "");
      if (L[i] === before) throw new Error(`introuvable : ${cond} ${stage} ${ex}`);
      REMOVE.find((r) => r[0] === cond && r[1] === stage && r[2] === ex).done = true;
    }
    for (const a of ADD) if (a[0] === cur && a[1] === st[1]) { L[i] = L[i].replace(/\],?$/, (m) => `, "${a[2]}"${m}`); a.done = true; }
  }
  fs.writeFileSync(f, L.join("\n"));
}
const left = REMOVE.filter((r) => !r.done);
if (left.length) throw new Error("non appliqués : " + left.map((r) => r.join("/")).join("; "));
fs.writeFileSync(new URL("./removed.json", import.meta.url), JSON.stringify(REMOVE.map(({ done, ...r }) => r)));
console.log("retirés :", REMOVE.length, "; ajoutés :", ADD.filter((a) => a.done).length);
