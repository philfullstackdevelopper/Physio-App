// Les 2 derniers exercices filmés avec Jules (fente puis montée sur step,
// montée sur step avec rotation), dessins validés par Philippe le 2026-10-31 (animations dessinées par Codex d'après la vidéo).
//   node scripts/exercices-jules.mjs
// écrit supabase/migrations/0074_jules_step_exercises.sql et ajoute les noms dans
// lib/exercise/illustrationMap.ts (nom de l'exercice → dessin).
// Même format et même méthode que scripts/nouveaux-exercices.mjs (0070).
// Consignes rédigées par Claude d'après les vidéos de Jules : à faire RELIRE
// par Jules avant le lancement.
import fs from "node:fs";
import crypto from "node:crypto";

// [dessin, nom, zones, matériel, mots-clés, consignes]
const E = [
  ["reverse-lunge-to-step-up", "Lunge to Step-Up with Knee Drive", ["genou-jambe", "hanche-fessiers"], [],
    ["Fente puis montée sur step", "Fente enchaînée step-up", "Montée de genou", "Retour au sport"],
    "Partez en fente au sol devant un step (ou une marche) : la jambe droite devant, pied bien à plat, la jambe gauche derrière. Remontez en gardant le pied droit planté au sol, ramenez la jambe gauche vers l'avant en penchant légèrement le buste, posez le pied gauche sur le step et poussez dessus pour monter, en levant le genou droit devant vous. Redescendez en contrôlant, puis changez de côté."],
  ["rotational-step-up", "Rotational Step-Up", ["genou-jambe", "hanche-fessiers", "equilibre-general"], [],
    ["Montée sur step avec rotation", "Step-up en rotation", "Équilibre sur une jambe", "Retour au sport"],
    "Debout à côté d'un step (ou d'une marche), parallèle à lui. Faites pivoter la jambe gauche vers le step et posez le pied gauche dessus, comme si vous étiez face au step. Poussez sur la jambe gauche en tournant le buste pour monter, et restez sur la jambe gauche sans poser le pied droit, genou droit levé. Redescendez par le même mouvement, puis changez de côté."],
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
  if (map.includes(`"${name}":`) && !map.includes("migration 0074")) errors.push("nom déjà dans la banque : " + name);
}
if (new Set(E.map((e) => e[1])).size !== E.length) errors.push("nom en double");
if (errors.length) { console.error(errors.join("\n")); process.exit(1); }

const values = E.map(([slug, name, , equip, kw, instr]) => `  (${q(uuid(slug))}::uuid, ${q(name)},\n   ${q(instr)},\n   ${arr(equip)}, ${arr(kw)})`).join(",\n");
const rows = E.flatMap(([slug, name, zones]) => zones.map((z, i) => [`  (${q(uuid(slug))}::uuid, ${q(z)})`, i === 0 ? ` -- ${name}` : ""]));
const parts = rows.map(([r, c], i) => r + (i < rows.length - 1 ? "," : "") + c).join("\n");
const sql = `-- Physio-App — Migration 0074 : ${E.length} nouveaux exercices de step filmés avec Jules
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
fs.writeFileSync("supabase/migrations/0074_jules_step_exercises.sql", sql);

const block = `  // Exercices filmés avec Jules (migration 0074, 2026-10-31) — animations 8 images.\n${E.map(([slug, name]) => `  ${JSON.stringify(name)}: ${JSON.stringify(slug)},`).join("\n")}\n`;
if (!map.includes("migration 0074")) {
  const end = map.lastIndexOf("};");
  fs.writeFileSync("lib/exercise/illustrationMap.ts", map.slice(0, end) + block + map.slice(end));
}
console.log(E.length, "exercices → 0074 + illustrationMap");
