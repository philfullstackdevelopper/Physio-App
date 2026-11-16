// 0097 : durée écrite dans la consigne des 4 activités qui n'en avaient pas.
import fs from "node:fs";
import path from "node:path";
const repo = process.argv[2];
const ROWS = [
  ["Running",
    "Courez 15 minutes à une allure régulière et confortable, foulée souple. Augmentez la durée progressivement d'une semaine à l'autre si tout va bien.",
    "Run for 15 minutes at a steady, comfortable pace with a light stride. Increase the time gradually from week to week if all goes well."],
  ["Progressive Walk-to-Jog (Shin Splints, Soft Terrain)",
    "Pendant 15 minutes, commencez par marcher, puis passez très progressivement à un petit trot, sur terrain souple ou sur tapis de course, en l'absence de douleur.",
    "For 15 minutes, start by walking, then very gradually move into a light jog, on soft ground or a treadmill, as long as it is pain-free."],
  ["Controlled Stair Climbing",
    "Montez et descendez les escaliers pendant 5 minutes en contrôlant le mouvement, en vous tenant à la rampe si besoin.",
    "Walk up and down the stairs for 5 minutes with control, holding the handrail if needed."],
  ["Jump Rope",
    "Sautez à la corde par séries de 30 secondes, à un rythme régulier, petits sauts sur l'avant des pieds, coudes proches du corps.",
    "Jump rope in sets of 30 seconds at a steady rhythm, with small hops on the balls of your feet and elbows close to your body."],
];
const q = (s) => "'" + s.replace(/'/g, "''") + "'";
const sql = `-- =============================================================================
-- 0097 — Durée dans la consigne des activités (Philippe, 2026-11-17)
--
-- En clair : l'appli lit la durée d'une activité (« 15 minutes ») dans sa
-- consigne. Course, marche-course, escaliers et corde à sauter n'en avaient
-- pas : le patient aurait vu « 3 séries de 8 à 12 répétitions » pour une course.
-- Seules ces 4 consignes changent. Aucune règle d'accès ne change.
-- =============================================================================

alter table public.exercises no force row level security;

update public.exercises e
set instructions = v.instr
from (values
${ROWS.map(([n, fr]) => `  (${q(n)}, ${q(fr)})`).join(",\n")}
) as v(name, instr)
where e.name = v.name and e.created_by is null;

alter table public.exercises force row level security;
`;
fs.writeFileSync(path.join(repo, "supabase/migrations/0097_activity_durations.sql"), sql);
const ef = path.join(repo, "i18n/content/en.json");
const j = JSON.parse(fs.readFileSync(ef, "utf8"));
for (const [, fr, en] of ROWS) j[fr] = en;
fs.writeFileSync(ef, JSON.stringify(j, null, 2) + "\n");
console.log("0097 écrite");
