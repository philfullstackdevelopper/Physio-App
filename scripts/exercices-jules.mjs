// Les 13 nouveaux exercices filmés avec Jules (kiné) le 2026-10-30 et validés
// par Philippe le 2026-10-31 (animations dessinées par Codex d'après la vidéo).
//   node scripts/exercices-jules.mjs
// écrit supabase/migrations/0073_jules_exercises.sql et ajoute les noms dans
// lib/exercise/illustrationMap.ts (nom de l'exercice → dessin).
// Même format et même méthode que scripts/nouveaux-exercices.mjs (0070).
// Les deux autres exercices filmés (fente puis montée sur step, montée sur
// step avec rotation) attendent encore la validation de leur dessin.
// Consignes rédigées par Claude d'après les vidéos de Jules : à faire RELIRE
// par Jules avant le lancement.
import fs from "node:fs";
import crypto from "node:crypto";

// [dessin, nom, zones, matériel, mots-clés, consignes]
const E = [
  ["kneeling-calf-hip-flexor-wall-stretch", "Kneeling Calf and Hip Flexor Wall Stretch", ["cheville-pied", "hanche-fessiers"], [],
    ["Étirement du mollet et des fléchisseurs de hanche", "Fléchisseurs de hanche", "Mollet", "Psoas"],
    "Face à un mur, à genou : le genou arrière posé au sol sur un coussin, le pied avant à plat, les mains au mur. Avancez doucement le bassin et le genou avant vers le mur, talon avant au sol : vous sentez l'étirement dans le mollet de devant et à l'avant de la hanche de derrière. Tenez la position en respirant calmement."],
  ["wall-lunge-hip-flexor-stretch", "Wall Lunge Hip Flexor Stretch", ["hanche-fessiers"], [],
    ["Étirement des fléchisseurs de hanche en fente", "Fléchisseurs de hanche", "Psoas", "Fente au mur"],
    "Face à un mur, les mains posées dessus, faites une grande fente : la jambe arrière allongée loin derrière, le genou avant au-dessus de la cheville. Poussez doucement le bassin vers l'avant et vers le bas, buste droit, jusqu'à sentir l'étirement à l'avant de la hanche de derrière. Tenez la position, puis changez de côté."],
  ["childs-pose-to-press-up", "Child's Pose to Press-Up Flow", ["dos-lombaires"], [],
    ["Enchaînement posture de l'enfant et extension", "Posture de l'enfant", "Extension du dos", "Mobilité du dos"],
    "Partez assis sur les talons, bras allongés devant vous, front au sol (posture de l'enfant). Faites glisser lentement le buste vers l'avant jusqu'à être à plat ventre, puis poussez sur les mains en gardant le bassin au sol pour cambrer doucement le dos. Revenez ensuite lentement à la posture de l'enfant. Enchaînez sans à-coup, au rythme de votre respiration."],
  ["seated-spinal-roll-down", "Seated Spinal Roll-Down", ["dos-lombaires"], ["chaise"],
    ["Enroulement vertébral assis", "Mobilité de la colonne", "Dos rond", "Assouplissement du dos"],
    "Assis au bord d'une chaise, les pieds à plat, le dos droit. Rentrez le menton puis enroulez lentement le dos vers l'avant, vertèbre par vertèbre, en laissant les bras descendre vers le sol. Remontez ensuite tout aussi lentement en déroulant le dos jusqu'à être bien droit."],
  ["standing-bent-leg-hamstring-stretch-table", "Standing Bent-Leg Hamstring Stretch (Table)", ["genou-jambe", "hanche-fessiers"], [],
    ["Étirement des ischios jambe pliée sur la table", "Ischio-jambiers", "Fessier", "Étirement unilatéral"],
    "Debout à côté d'une table, posez une jambe pliée sur la table : la cuisse posée dessus, le genou fléchi, le pied à plat devant vous. L'autre jambe reste tendue au sol. Les mains sur la table, penchez lentement le buste vers la jambe pliée en gardant le dos droit, jusqu'à sentir l'étirement à l'arrière de la cuisse et dans la fesse. Tenez, puis changez de jambe."],
  ["standing-lateral-pelvic-shift", "Standing Lateral Pelvic Shift", ["hanche-fessiers", "equilibre-general"], [],
    ["Déplacement latéral du bassin", "Contrôle de la hanche", "Moyen fessier", "Équilibre"],
    "Debout sur une jambe, mains sur les hanches, l'autre pied légèrement décollé du sol. Sans bouger le pied d'appui, déplacez doucement le bassin sur le côté, au-dessus de la jambe d'appui, puis revenez au centre. Le mouvement est petit et contrôlé. Faites la série, puis changez de jambe."],
  ["prone-arm-raise-t", "Prone T Arm Raise (Floor)", ["epaule", "dos-lombaires"], [],
    ["Élévation des bras en T à plat ventre", "Rééducation de l'épaule", "Omoplates", "Trapèze inférieur"],
    "Allongé sur le ventre au sol, le front posé sur une serviette roulée, les bras tendus sur les côtés en T, pouces vers le haut. Resserrez les omoplates et levez les deux bras de quelques centimètres, sans lever la tête. Tenez une seconde, puis reposez-les lentement."],
  ["prone-back-extension-hands-head", "Prone Back Extension (Hands Behind Head)", ["dos-lombaires"], [],
    ["Extension du dos à plat ventre", "Mains derrière la tête", "Lombaires", "Renforcement du dos"],
    "Allongé sur le ventre, les mains derrière la tête, les coudes écartés. Décollez lentement le buste du sol en gardant le regard vers le sol et les jambes posées, puis redescendez en contrôlant. Arrêtez-vous avant toute douleur dans le bas du dos."],
  ["step-straddle-jump", "Lateral Step-Over Hop", ["genou-jambe", "equilibre-general"], [],
    ["Sauts latéraux par-dessus le step", "Pliométrie", "Retour au sport", "Changement d'appui"],
    "Placez-vous de côté à côté d'un step (ou d'une marche), un pied posé dessus, l'autre au sol. Poussez et passez par-dessus le step : le pied qui était au sol se pose en premier sur le step, puis l'autre pied rejoint le sol de l'autre côté. Repartez aussitôt dans l'autre sens, genoux souples à chaque réception."],
  ["step-drop-landing", "Step Drop Landing (Two Feet)", ["genou-jambe"], [],
    ["Saut du step réception deux pieds", "Réception stabilisée", "Pliométrie", "Retour au sport"],
    "Debout sur un step (ou une marche basse), sautez vers l'avant et réceptionnez-vous sur les deux pieds, genoux fléchis et bien alignés au-dessus des pieds, sans qu'ils rentrent vers l'intérieur. Tenez la position stable deux secondes avant de remonter."],
  ["step-drop-single-leg-landing", "Step Drop Landing (Single Leg)", ["genou-jambe", "equilibre-general"], [],
    ["Saut du step réception une jambe", "Réception unipodale", "Contrôle du genou", "Retour au sport"],
    "Debout sur un step (ou une marche basse), sautez vers l'avant et réceptionnez-vous sur une seule jambe, genou légèrement fléchi et aligné au-dessus du pied, l'autre jambe pliée en arrière. Tenez l'équilibre deux secondes avant de remonter. Faites la série, puis changez de jambe."],
  ["seated-external-rotation-elbow-on-knee", "Seated External Rotation (Elbow on Knee)", ["epaule"], ["halteres"],
    ["Rotation externe assis coude sur le genou", "Coiffe des rotateurs", "Infra-épineux", "Rééducation de l'épaule"],
    "Assis au sol, un genou plié. Posez le coude sur le genou, droit devant l'épaule, coude plié à 90°, un petit haltère (ou une bouteille d'eau) en main, l'avant-bras à l'horizontale. Sans bouger le coude, faites pivoter l'avant-bras vers le haut jusqu'à la verticale, puis redescendez lentement."],
  ["wall-tibialis-raise", "Wall Tibialis Raise", ["cheville-pied"], [],
    ["Relevé des orteils dos au mur", "Releveurs du pied", "Tibial antérieur", "Périostite"],
    "Dos et fesses appuyés contre un mur, les pieds avancés d'environ deux longueurs de pied, jambes tendues, talons au sol. Relevez la pointe des pieds le plus haut possible, tenez une seconde, puis reposez-la lentement."],
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
  if (!fs.existsSync(`docs/test-illustrations-ia/codex/out-jules/${slug}/svg/frame-8.svg`)) errors.push("pas d'animation : " + slug);
  if (map.includes(`"${name}":`) && !map.includes("migration 0073")) errors.push("nom déjà dans la banque : " + name);
}
if (new Set(E.map((e) => e[1])).size !== E.length) errors.push("nom en double");
if (errors.length) { console.error(errors.join("\n")); process.exit(1); }

const values = E.map(([slug, name, , equip, kw, instr]) => `  (${q(uuid(slug))}::uuid, ${q(name)},\n   ${q(instr)},\n   ${arr(equip)}, ${arr(kw)})`).join(",\n");
const rows = E.flatMap(([slug, name, zones]) => zones.map((z, i) => [`  (${q(uuid(slug))}::uuid, ${q(z)})`, i === 0 ? ` -- ${name}` : ""]));
const parts = rows.map(([r, c], i) => r + (i < rows.length - 1 ? "," : "") + c).join("\n");
const sql = `-- Physio-App — Migration 0073 : ${E.length} nouveaux exercices filmés avec Jules
-- Safe to re-run.
--
-- Philippe, 2026-10-31 : ajout à la bibliothèque de la plateforme des
-- exercices filmés avec Jules (kiné) le 2026-10-30, avec leurs animations
-- validées (public/exercise-illustrations/<dessin>/, reliées par nom dans
-- lib/exercise/illustrationMap.ts). Généré par scripts/exercices-jules.mjs.
--
-- Même méthode que 0068 et 0070 : exercices de la PLATEFORME (created_by
-- null), visibles par tous les kinés et patients connectés, modifiables par
-- personne ; rangés dans leurs zones du corps (exercise_body_parts).
-- Ne modifie aucune règle d'accès (RLS), aucun patient, aucune séance, aucun
-- exercice existant. FORCE ROW LEVEL SECURITY est levé le temps des INSERT
-- puis remis, dans la transaction de scripts/migrate.mjs --only.
--
-- Consignes rédigées par Claude d'après les vidéos de Jules — à faire RELIRE
-- par Jules.

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
fs.writeFileSync("supabase/migrations/0073_jules_exercises.sql", sql);

const block = `  // Exercices filmés avec Jules (migration 0073, 2026-10-31) — animations 8 images.\n${E.map(([slug, name]) => `  ${JSON.stringify(name)}: ${JSON.stringify(slug)},`).join("\n")}\n`;
if (!map.includes("migration 0073")) {
  const end = map.lastIndexOf("};");
  fs.writeFileSync("lib/exercise/illustrationMap.ts", map.slice(0, end) + block + map.slice(end));
}
console.log(E.length, "exercices → 0073 + illustrationMap");
