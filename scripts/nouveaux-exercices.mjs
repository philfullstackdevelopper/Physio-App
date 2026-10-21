// Les 56 nouveaux exercices de la banque (2026-10-21) : rééducation (liste
// docs/exercices-a-illustrer.md, P2/P3) + ajouts demandés par Philippe.
//   node scripts/nouveaux-exercices.mjs
// écrit supabase/migrations/0070_new_rehab_exercises.sql et ajoute les noms
// dans lib/exercise/illustrationMap.ts (nom de l'exercice → dessin).
// Nom en anglais (convention de la banque, cf. 0042), consignes et mots-clés
// en français. Contenu clinique rédigé par Claude : à faire RELIRE par le
// kiné partenaire. Identifiants stables (dérivés du nom du dessin).
import fs from "node:fs";
import crypto from "node:crypto";

// [dessin, nom, zones, matériel, mots-clés, consignes]
const E = [
  // --- Cheville & pied
  ["ankle-alphabet", "Ankle Circles", ["cheville-pied"], [], ["Cercles de cheville", "Alphabet avec le pied", "Mobilité de la cheville"],
    "Assis, la jambe allongée, le talon posé sur un petit support et le pied dans le vide. Dessinez lentement de grands cercles avec la pointe du pied, sans bouger la jambe, dans un sens puis dans l'autre."],
  ["towel-curl", "Towel Toe Curl", ["cheville-pied"], [], ["Serviette tirée avec les orteils", "Muscles du pied", "Voûte plantaire"],
    "Assis, pied nu à plat sur une serviette posée au sol. En gardant le talon au sol, repliez les orteils pour attraper la serviette et la ramener vers vous, puis relâchez et recommencez."],
  ["short-foot", "Short Foot", ["cheville-pied"], [], ["Short foot", "Voûte plantaire", "Pied plat"],
    "Assis ou debout, pied nu à plat. Sans replier les orteils, rapprochez l'avant du pied du talon pour creuser la voûte plantaire. Tenez quelques secondes, puis relâchez."],
  ["plantar-fascia-stretch", "Seated Plantar Fascia Stretch", ["cheville-pied"], [], ["Étirement du fascia plantaire", "Aponévrosite plantaire", "Douleur sous le talon"],
    "Assis, la cheville posée sur le genou opposé. Avec la main, tirez doucement les orteils vers le tibia jusqu'à sentir l'étirement sous la plante du pied. Maintenez la position en respirant calmement."],
  ["toe-pick-up", "Toe Pick-Up", ["cheville-pied"], [], ["Ramasser des objets avec les orteils", "Muscles du pied", "Billes"],
    "Assis, pied nu, quelques petits objets (billes, bouchons) posés au sol. Attrapez un objet avec les orteils, soulevez-le et déposez-le un peu plus loin, puis recommencez."],
  // --- Genou & jambe
  ["patella-mobilization", "Patellar Self-Mobilization", ["genou-jambe"], [], ["Mobilisation de la rotule", "Rotule", "Post-opératoire genou"],
    "Assis, la jambe tendue et la cuisse complètement relâchée. Avec les pouces, faites glisser doucement la rotule vers le haut puis vers le bas, puis vers la droite et vers la gauche, sans douleur."],
  ["prone-quad-stretch", "Prone Quadriceps Stretch", ["genou-jambe"], [], ["Étirement du quadriceps sur le ventre", "Quadriceps", "Souplesse du genou"],
    "Allongé sur le ventre. Pliez un genou et attrapez la cheville avec la main du même côté, puis ramenez doucement le talon vers la fesse, sans cambrer le bas du dos. Maintenez la position."],
  ["seated-knee-flexion", "Seated Knee Flexion (Heel Slide Under Chair)", ["genou-jambe"], ["chaise"], ["Flexion du genou assis", "Talon sous la chaise", "Récupération de flexion"],
    "Assis sur une chaise, pied à plat. Faites glisser le pied vers l'arrière sous la chaise pour plier le genou le plus loin possible sans douleur forte, tenez un instant, puis revenez."],
  ["standing-hamstring-curl", "Standing Hamstring Curl", ["genou-jambe"], [], ["Flexion du genou debout", "Talon-fesse", "Ischio-jambiers"],
    "Debout, les mains en appui sur un dossier de chaise. Pliez un genou pour amener le talon vers la fesse, les cuisses bien côte à côte, puis redescendez lentement."],
  ["sciatic-nerve-glide", "Sciatic Nerve Glide", ["genou-jambe", "dos-lombaires"], ["chaise"], ["Glissement neural sciatique", "Sciatique", "Mobilité nerveuse"],
    "Assis au bord d'une chaise, dos droit. Tendez le genou en tirant la pointe du pied vers vous tout en levant la tête, puis pliez le genou en baissant la tête. Alternez lentement, sans forcer."],
  ["spanish-squat", "Spanish Squat (Single Leg)", ["genou-jambe"], ["elastiques"], ["Squat espagnol", "Tendinopathie rotulienne", "Quadriceps"],
    "Debout sur une jambe, une sangle ou un gros élastique passé derrière le genou et fixé devant vous. Asseyez-vous vers l'arrière en pliant le genou, le tibia restant vertical, retenu par la sangle. Remontez lentement."],
  ["lateral-jump-two-feet", "Lateral Jump (Two Feet)", ["genou-jambe", "equilibre-general"], [], ["Saut latéral à deux pieds", "Pliométrie", "Retour au sport"],
    "Debout, pieds joints, genoux légèrement fléchis. Sautez sur le côté en gardant les pieds ensemble, réceptionnez-vous genoux fléchis et stables, marquez une pause, puis sautez de l'autre côté."],
  ["single-leg-hop-lateral", "Single-Leg Lateral Hop", ["genou-jambe", "equilibre-general"], [], ["Saut latéral à cloche-pied", "Pliométrie unipodale", "Retour au sport"],
    "Debout sur une jambe. Sautez sur le côté sur la même jambe, réceptionnez-vous genou fléchi dans l'axe du pied et tenez la position, puis sautez de l'autre côté."],
  ["single-leg-hop-forward", "Single-Leg Forward Hop", ["genou-jambe", "equilibre-general"], [], ["Saut vers l'avant à cloche-pied", "Pliométrie unipodale", "Retour au sport LCA"],
    "Debout sur une jambe. Pliez le genou, sautez vers l'avant et réceptionnez-vous sur la même jambe, genou fléchi dans l'axe du pied, en restant stable avant de recommencer."],
  ["sit-to-jump", "Sit-to-Jump", ["genou-jambe", "hanche-fessiers"], ["chaise"], ["Assis-debout sauté", "Puissance des jambes", "Retour au sport"],
    "Assis au bord d'une chaise, pieds à plat. Penchez le buste en avant, levez-vous et poussez fort sur les jambes pour sauter vers le haut, puis réceptionnez-vous en douceur, genoux fléchis, devant la chaise."],
  // --- Hanche & fessiers
  ["figure-four-stretch", "Seated Figure-Four Stretch", ["hanche-fessiers"], ["chaise"], ["Étirement du piriforme", "Figure 4", "Fessiers", "Sciatique"],
    "Assis sur une chaise, posez la cheville sur le genou opposé. En gardant le dos droit, penchez le buste vers l'avant jusqu'à sentir l'étirement dans la fesse. Maintenez la position."],
  ["it-band-stretch", "Standing IT Band Stretch", ["hanche-fessiers"], [], ["Étirement du TFL", "Bandelette ilio-tibiale", "Syndrome de l'essuie-glace"],
    "Debout, croisez une jambe derrière l'autre. Levez le bras du côté de la jambe arrière au-dessus de la tête et poussez la hanche sur le côté en penchant le buste de l'autre côté. Maintenez la position."],
  ["quadruped-hip-circles", "Quadruped Hip Circles", ["hanche-fessiers"], [], ["Cercles de hanche à quatre pattes", "Mobilité de hanche", "Fessiers"],
    "À quatre pattes, dos plat. Genou plié, décollez une jambe et dessinez lentement des cercles avec le genou, sans bouger le dos ni le bassin, dans un sens puis dans l'autre."],
  ["side-lying-hip-adduction", "Side-Lying Hip Adduction", ["hanche-fessiers"], [], ["Adduction couché sur le côté", "Adducteurs", "Pubalgie"],
    "Allongé sur le côté, la jambe du dessus pliée et le pied posé devant le genou du dessous. Levez la jambe du dessous tendue de quelques centimètres, puis redescendez lentement."],
  ["seated-hip-rotation", "Seated Hip Rotation", ["hanche-fessiers"], ["chaise"], ["Rotation de hanche assis", "Mobilité de hanche", "Rotateurs de hanche"],
    "Assis sur une chaise, genoux à 90°. Sans bouger la cuisse, faites pivoter la jambe pour amener le pied vers l'intérieur puis vers l'extérieur, lentement."],
  ["dowel-hip-hinge", "Dowel Hip Hinge", ["hanche-fessiers", "dos-lombaires"], ["baton"], ["Hip hinge avec bâton", "Charnière de hanche", "Posture du dos"],
    "Debout, un bâton tenu dans le dos, en contact avec la tête, le haut du dos et le bassin. Poussez les hanches vers l'arrière en penchant le buste, le dos droit et le bâton toujours en contact, puis revenez."],
  ["prone-hip-extension", "Prone Straight-Leg Hip Extension", ["hanche-fessiers"], [], ["Extension de hanche sur le ventre", "Fessiers", "Lombalgie"],
    "Allongé sur le ventre, front posé sur les mains. Serrez les fessiers et levez une jambe tendue de quelques centimètres, sans cambrer le bas du dos, puis redescendez lentement."],
  ["walking-lunge-rotation", "Walking Lunge with Trunk Rotation", ["hanche-fessiers", "tronc-gainage-abdos", "equilibre-general"], [], ["Fente marchée avec rotation", "Stabilité", "Fessiers"],
    "Debout, mains jointes devant la poitrine. Faites un grand pas en avant en fente, genoux pliés à 90°. En gardant la fente immobile et contrôlée, tournez lentement le buste vers la jambe avant, revenez, puis avancez l'autre jambe."],
  // --- Dos & lombaires
  ["thread-the-needle", "Thread the Needle", ["dos-lombaires"], [], ["Rotation thoracique à quatre pattes", "Mobilité du dos", "Thoracique"],
    "À quatre pattes. Ouvrez un bras vers le plafond en tournant le buste, puis faites passer ce bras sous la poitrine de l'autre côté jusqu'à poser l'épaule au sol. Revenez lentement."],
  ["standing-side-bend-stretch", "Standing Side Bend Stretch", ["dos-lombaires"], [], ["Inclinaison latérale debout", "Carré des lombes", "Étirement du flanc"],
    "Debout, pieds écartés. Levez un bras au-dessus de la tête et penchez le buste du côté opposé, sans tourner le bassin, jusqu'à sentir l'étirement sur le côté. Maintenez la position."],
  ["thoracic-extension-chair", "Thoracic Extension Over Chair", ["dos-lombaires"], ["chaise"], ["Extension thoracique sur chaise", "Dos voûté", "Posture"],
    "Assis sur une chaise à dossier, mains derrière la tête. Penchez le haut du dos en arrière par-dessus le dossier, coudes vers le plafond, sans cambrer le bas du dos. Revenez lentement."],
  // --- Cervicales & cou
  ["cervical-rotation", "Active Cervical Rotation", ["cervicales-cou"], [], ["Rotation du cou", "Mobilité cervicale", "Cervicalgie"],
    "Assis bien droit. Tournez lentement la tête d'un côté le plus loin possible sans douleur, en gardant les épaules immobiles, revenez au centre, puis tournez de l'autre côté."],
  ["cervical-side-bend", "Active Cervical Side Bend", ["cervicales-cou"], [], ["Inclinaison latérale du cou", "Mobilité cervicale", "Cervicalgie"],
    "Assis bien droit, épaules basses. Penchez lentement la tête pour amener l'oreille vers l'épaule, sans lever l'épaule, revenez au centre, puis penchez de l'autre côté."],
  ["cervical-flexion-extension", "Active Cervical Flexion-Extension", ["cervicales-cou"], [], ["Flexion-extension du cou", "Mobilité cervicale", "Cervicalgie"],
    "Assis bien droit. Baissez lentement la tête pour amener le menton vers la poitrine, puis relevez-la doucement pour regarder vers le haut, sans forcer."],
  ["upper-trap-stretch", "Upper Trapezius Stretch", ["cervicales-cou"], ["chaise"], ["Étirement du trapèze supérieur", "Tension dans la nuque", "Cervicalgie"],
    "Assis, une main tenant le bord de la chaise. Penchez la tête du côté opposé et posez l'autre main sur la tête pour accentuer doucement l'étirement. Maintenez la position."],
  ["levator-scapulae-stretch", "Levator Scapulae Stretch", ["cervicales-cou"], ["chaise"], ["Étirement de l'élévateur de la scapula", "Raideur du cou", "Cervicalgie"],
    "Assis, une main tenant le bord de la chaise. Tournez la tête de 45° de l'autre côté et baissez-la comme pour regarder votre aisselle, l'autre main posée sur la tête aidant doucement. Maintenez la position."],
  ["scalene-stretch", "Scalene Stretch", ["cervicales-cou"], [], ["Étirement des scalènes", "Côté du cou", "Cervicalgie"],
    "Assis bien droit, une main posée à plat sur la clavicule opposée. Penchez la tête du côté opposé et légèrement en arrière, jusqu'à sentir l'étirement sur le côté du cou. Maintenez la position."],
  ["supine-chin-nod", "Supine Chin Nod", ["cervicales-cou"], [], ["Rentrer le menton allongé", "Fléchisseurs profonds du cou", "Cervicalgie"],
    "Allongé sur le dos, la tête posée. Faites un petit « oui » de la tête en rentrant doucement le menton vers la gorge, l'arrière de la tête restant au sol. Tenez quelques secondes, puis relâchez."],
  ["mckenzie-cervical", "Cervical Retraction-Extension", ["cervicales-cou"], [], ["Rétraction puis extension cervicale", "McKenzie cou", "Cervicalgie"],
    "Assis bien droit. Rentrez d'abord le menton en reculant la tête (double menton), puis, depuis cette position, basculez doucement la tête en arrière pour regarder le plafond. Revenez lentement."],
  // --- Épaule
  ["external-rotation-90", "External Rotation at 90° Abduction (Band)", ["epaule"], ["elastiques"], ["Rotation externe à 90°", "Coiffe des rotateurs", "Sport de lancer"],
    "Debout, bras levé sur le côté à hauteur d'épaule, coude plié à 90°, élastique fixé devant vous. Faites pivoter l'avant-bras vers le haut jusqu'à la verticale, sans baisser le coude, puis revenez lentement."],
  ["side-lying-external-rotation", "Side-Lying External Rotation", ["epaule"], ["halteres"], ["Rotation externe couché sur le côté", "Coiffe des rotateurs", "Infra-épineux"],
    "Allongé sur le côté, une serviette roulée sous le coude du dessus, coude plié à 90° et collé au corps, un haltère léger en main. Faites pivoter l'avant-bras vers le plafond sans décoller le coude, puis redescendez lentement."],
  ["wall-slides", "Wall Slides", ["epaule"], [], ["Glissés au mur", "Mobilité de l'épaule", "Omoplates"],
    "Debout face à un mur, avant-bras posés contre le mur. Faites glisser les avant-bras vers le haut le plus loin possible sans douleur, en gardant les épaules basses, puis redescendez."],
  ["sleeper-stretch", "Sleeper Stretch", ["epaule"], [], ["Sleeper stretch", "Rotation interne de l'épaule", "Capsule postérieure"],
    "Allongé sur le côté, le bras du dessous devant vous, coude plié à 90°. Avec l'autre main, poussez doucement l'avant-bras vers le sol devant vous, sans forcer. Maintenez la position."],
  ["shoulder-isometrics-wall", "Shoulder Isometrics Against Wall", ["epaule"], [], ["Isométriques d'épaule", "Renforcement sans mouvement", "Épaule douloureuse"],
    "Debout à côté d'un mur, coude plié à 90° contre le corps, une serviette pliée entre le poignet et le mur. Appuyez le poignet contre le mur sans bouger le bras. Tenez quelques secondes, puis relâchez. Changez de direction."],
  ["towel-internal-rotation", "Towel Internal Rotation Stretch", ["epaule"], [], ["Serviette dans le dos", "Rotation interne de l'épaule", "Raideur de l'épaule"],
    "Debout, une serviette tenue derrière le dos, une main en haut au-dessus de l'épaule et l'autre en bas. Tirez doucement la serviette vers le haut avec la main du haut pour faire remonter la main du bas dans le dos."],
  ["shoulder-pulley", "Shoulder Pulley", ["epaule"], ["chaise"], ["Auto-mobilisation à la poulie", "Mobilité de l'épaule", "Post-opératoire épaule"],
    "Assis sous une poulie fixée en hauteur (porte), une poignée dans chaque main. Tirez vers le bas avec le bras sain pour faire monter doucement le bras opéré au-dessus de la tête, puis redescendez lentement."],
  // --- Poignet, main & coude
  ["forearm-hammer-rotation", "Pronation-Supination with Dumbbell", ["poignet-main-coude"], ["halteres"], ["Pronation supination", "Rotation de l'avant-bras", "Coude"],
    "Assis, l'avant-bras posé sur une table, la main dépassant du bord et tenant un haltère léger par le milieu. Tournez lentement la paume vers le haut puis vers le bas, sans bouger le coude."],
  ["wrist-flexor-stretch", "Wrist Flexor and Extensor Stretch", ["poignet-main-coude"], [], ["Étirement des fléchisseurs du poignet", "Épicondylite", "Avant-bras"],
    "Debout, bras tendu devant vous. Avec l'autre main, tirez doucement les doigts vers vous, paume vers l'avant, puis faites de même paume vers le bas pour étirer le dessus de l'avant-bras. Maintenez chaque position."],
  ["tendon-glides", "Finger Tendon Glides", ["poignet-main-coude"], [], ["Glissements tendineux des doigts", "Mobilité des doigts", "Canal carpien"],
    "Main ouverte, doigts tendus. Enchaînez lentement : doigts pliés en crochet, poing fermé, doigts à plat pliés à la base, puis poing complet, et revenez main ouverte."],
  ["foam-ball-grip", "Foam Ball Squeeze", ["poignet-main-coude"], ["ballon"], ["Préhension balle mousse", "Force de la main", "Poignet"],
    "Une balle en mousse dans la main. Serrez la balle le plus fort possible sans douleur, tenez quelques secondes, puis relâchez doucement."],
  ["thumb-opposition", "Thumb Opposition", ["poignet-main-coude"], [], ["Opposition du pouce", "Mobilité du pouce", "Rhizarthrose"],
    "Main ouverte. Touchez successivement le bout de chaque doigt avec le bout du pouce, de l'index jusqu'à l'auriculaire, en formant un rond, puis rouvrez la main."],
  ["finger-extension-band", "Finger Extension with Band", ["poignet-main-coude"], ["elastiques"], ["Ouverture des doigts avec élastique", "Extenseurs des doigts", "Épicondylite"],
    "Un petit élastique passé autour des cinq doigts rassemblés. Écartez les doigts au maximum contre l'élastique, puis refermez lentement."],
  ["wrist-deviation", "Wrist Radial-Ulnar Deviation", ["poignet-main-coude"], ["halteres"], ["Inclinaison latérale du poignet", "Déviation radiale et ulnaire", "Poignet"],
    "L'avant-bras posé sur une table, paume vers le bas, la main dépassant du bord et tenant un haltère léger. Inclinez la main vers le pouce puis vers l'auriculaire, sans bouger l'avant-bras."],
  // --- Tronc
  ["lunge-band-woodchop", "Lunge Band Woodchop", ["tronc-gainage-abdos", "hanche-fessiers"], ["elastiques"], ["Woodchop à l'élastique en fente", "Rotation du tronc", "Gainage"],
    "En fente fixe, genoux pliés, élastique fixé en hauteur sur le côté et tenu à deux mains. En gardant la fente immobile et le ventre gainé, tirez l'élastique en diagonale vers la hanche opposée en tournant le buste, puis revenez lentement."],
  // --- Équilibre & général
  ["tandem-walk", "Tandem Walk", ["equilibre-general"], [], ["Marche tandem", "Talon-pointe", "Prévention des chutes"],
    "Marchez en ligne droite en posant à chaque pas le talon juste devant les orteils de l'autre pied, bras écartés pour l'équilibre, regard droit devant."],
  ["heel-toe-walk", "Heel and Toe Walk", ["equilibre-general", "cheville-pied"], [], ["Marche sur les talons", "Marche sur les pointes", "Équilibre"],
    "Marchez quelques pas sur les talons, pointes de pied relevées, puis quelques pas sur la pointe des pieds, talons décollés, en gardant le buste droit."],
  ["lateral-weight-shift", "Lateral Weight Shift", ["equilibre-general"], [], ["Transfert de poids latéral", "Équilibre", "Prévention des chutes"],
    "Debout, pieds écartés largeur du bassin, mains sur les hanches. Transférez lentement le poids du corps sur une jambe, puis sur l'autre, sans décoller les pieds."],
  ["obstacle-step-over", "Obstacle Step-Over", ["equilibre-general"], [], ["Franchissement d'obstacle", "Prévention des chutes", "Équilibre"],
    "Debout devant un petit obstacle (marche basse, boîte). Levez le genou et enjambez l'obstacle en posant le pied de l'autre côté, puis ramenez l'autre jambe, sans vous précipiter."],
  ["floor-to-stand", "Floor to Stand", ["equilibre-general"], ["chaise"], ["Se relever du sol", "Relevé du sol", "Prévention des chutes"],
    "À genoux à côté d'une chaise stable, mains sur l'assise. Avancez un pied pour vous mettre en chevalier servant, puis poussez sur la jambe avant et sur la chaise pour vous relever."],
  ["diaphragmatic-breathing", "Diaphragmatic Breathing", ["equilibre-general"], [], ["Respiration diaphragmatique", "Respiration abdominale", "Relaxation"],
    "Allongé sur le dos, genoux fléchis, une main sur la poitrine et l'autre sur le ventre. Inspirez lentement par le nez en gonflant le ventre, la main sur la poitrine restant immobile, puis expirez doucement."],
  ["pursed-lip-breathing", "Pursed-Lip Breathing", ["equilibre-general"], [], ["Respiration à lèvres pincées", "Essoufflement", "Respiration"],
    "Assis, détendu. Inspirez par le nez sur deux temps, puis expirez lentement par la bouche, lèvres pincées comme pour souffler une bougie, sur quatre temps."],
];

const uuid = (slug) => {
  const h = crypto.createHash("sha1").update("easyphysio-exercise:" + slug).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${((parseInt(h[16], 16) & 3) | 8).toString(16)}${h.slice(17, 20)}-${h.slice(20, 32)}`;
};
const q = (s) => `'${s.replace(/'/g, "''")}'`;
const arr = (a) => (a.length ? `array[${a.map(q).join(", ")}]` : "array[]::text[]");

// Vérifications : dessins présents, noms uniques et absents de la banque.
const map = fs.readFileSync("lib/exercise/illustrationMap.ts", "utf8");
const errors = [];
for (const [slug, name] of E) {
  if (!fs.existsSync(`docs/test-illustrations-ia/codex/out-nouveaux/${slug}/svg/frame-8.svg`)) errors.push("pas d'animation : " + slug);
  if (map.includes(`"${name}":`)) errors.push("nom déjà dans la banque : " + name);
}
if (new Set(E.map((e) => e[1])).size !== E.length) errors.push("nom en double");
if (errors.length) { console.error(errors.join("\n")); process.exit(1); }

const values = E.map(([slug, name, , equip, kw, instr]) => `  (${q(uuid(slug))}::uuid, ${q(name)},\n   ${q(instr)},\n   ${arr(equip)}, ${arr(kw)})`).join(",\n");
// La virgule doit précéder le commentaire de fin de ligne (sinon -- l'avale).
const rows = E.flatMap(([slug, name, zones]) => zones.map((z, i) => [`  (${q(uuid(slug))}::uuid, ${q(z)})`, i === 0 ? ` -- ${name}` : ""]));
const parts = rows.map(([r, c], i) => r + (i < rows.length - 1 ? "," : "") + c).join("\n");
const sql = `-- Physio-App — Migration 0070 : ${E.length} nouveaux exercices de rééducation
-- Safe to re-run.
--
-- Philippe, 2026-10-21 : ajout à la bibliothèque de la plateforme des
-- exercices de docs/exercices-a-illustrer.md (P2/P3) et de ses ajouts (sauts,
-- fente marchée avec rotation, woodchop en fente, assis-debout sauté), avec
-- leurs animations (public/exercise-illustrations/<dessin>/, reliées par nom
-- dans lib/exercise/illustrationMap.ts). Généré par scripts/nouveaux-exercices.mjs.
--
-- Même méthode que 0068 : exercices de la PLATEFORME (created_by null),
-- visibles par tous les kinés et patients connectés, modifiables par
-- personne ; rangés dans leurs zones du corps (exercise_body_parts).
-- Ne modifie aucune règle d'accès (RLS), aucun patient, aucune séance, aucun
-- exercice existant. FORCE ROW LEVEL SECURITY est levé le temps des INSERT
-- puis remis, dans la transaction de scripts/migrate.mjs --only.
--
-- Contenu clinique (consignes, matériel, zones) rédigé par Claude — à faire
-- RELIRE par le kiné partenaire.

alter table public.exercises no force row level security;
alter table public.exercise_body_parts no force row level security;

insert into public.exercises (id, name, instructions, equipment, search_keywords)
select v.id, v.name, v.instructions, v.equipment, v.keywords
from (values
${values}
) as v(id, name, instructions, equipment, keywords)
where not exists (select 1 from public.exercises e where e.id = v.id or e.name = v.name);

insert into public.exercise_body_parts (exercise_id, body_part_id)
select v.id, bp.id
from (values
${parts}
) as v(id, slug)
join public.body_parts bp on bp.slug = v.slug
join public.exercises e on e.id = v.id
on conflict (exercise_id, body_part_id) do nothing;

alter table public.exercise_body_parts force row level security;
alter table public.exercises force row level security;
`;
fs.writeFileSync("supabase/migrations/0070_new_rehab_exercises.sql", sql);

// illustrationMap : un bloc de noms → dessins, juste avant la fin de l'objet.
const block = `  // Nouveaux exercices (migration 0070, 2026-10-21) — animations 8 images.\n${E.map(([slug, name]) => `  ${JSON.stringify(name)}: ${JSON.stringify(slug)},`).join("\n")}\n`;
if (!map.includes("migration 0070")) {
  const end = map.lastIndexOf("};");
  fs.writeFileSync("lib/exercise/illustrationMap.ts", map.slice(0, end) + block + map.slice(end));
}
console.log(E.length, "exercices → 0070 + illustrationMap");
