// 0099 : exercices douteux retirés des phases 1-2 + description / durée / fréquence alignées sur le contenu.
import fs from "node:fs";
import path from "node:path";
import { PLAN, parseDose } from "./plan-seances.mjs";
const repo = process.argv[2];
const removed = JSON.parse(fs.readFileSync(new URL("./removed.json", import.meta.url), "utf8"));
const STAGES = ["acute", "subacute", "recovery", "return_to_sport"];
const DESC = {
  acute: "Exercices doux pour calmer la douleur et garder le mouvement.",
  subacute: "Retrouver la mobilité et commencer un renforcement léger.",
  recovery: "Renforcement progressif de la zone et des muscles qui la soutiennent.",
  return_to_sport: "Retour progressif aux activités du quotidien et au sport.",
};
const PER_WEEK = { acute: 6, subacute: 4, recovery: 3, return_to_sport: 3 };
// Durée des activités : celle écrite dans leur consigne (0096/0097).
const MINUTES = { "Walking": 15, "Cycling": 10, "Running": 15, "Progressive Walk-to-Jog (Shin Splints, Soft Terrain)": 15, "Controlled Stair Climbing": 5, "Assisted Progressive Walking": 5 };
const NOSTAGE = [
  ["Lombalgie chronique", "Séance express", "acute"],
  ["Lombalgie chronique", "Séance complète", "recovery"],
  ["Lombalgie chronique", "Séance intensive", "return_to_sport"],
  ["Entorse de la cheville", "Séance mobilité", "subacute"],
  ["Entorse de la cheville", "Séance renforcement", "recovery"],
];
const q = (s) => (s == null ? "null" : "'" + String(s).replace(/'/g, "''") + "'");
const n = (v) => (v == null ? "null" : String(v));
const rows = [], meta = [];
for (const [c, st] of Object.entries(PLAN))
  for (const s of STAGES) {
    let minutes = 2; // échauffement / installation
    st[s].forEach((x, i) => {
      const [ex, d] = x.split("|");
      let dose;
      if (/min$/.test(d)) { dose = { sets: null, reps: null, hold: null }; minutes += MINUTES[ex]; }
      else {
        dose = parseDose(d);
        minutes += dose.hold ? dose.sets * (dose.hold + 20) / 60 : dose.sets * 1;
      }
      rows.push(`  (${q(c)}, ${q(s)}, ${i}, ${q(ex)}, ${n(dose.sets)}, ${n(dose.reps)}, ${n(dose.hold)})`);
    });
    meta.push(`  (${q(c)}, ${q(s)}, ${Math.max(10, Math.ceil(minutes / 5) * 5)})`);
  }
const TABLES = ["exercises", "conditions", "workouts", "workout_exercises"];
const sql = `-- =============================================================================
-- 0099 — Séances de la plateforme : prudence en début de rééducation (Philippe, 2026-11-17)
--
-- En clair, pour Philippe (CLAUDE.md §3) :
--   Philippe : « si tu n'es pas sûr de certains exercices en début de
--   rééducation, retire-les, tant qu'il reste 4 exercices par phase ».
--   1. ${removed.length} exercices retirés, surtout en phases 1-2, quand ils dépendent du
--      protocole du chirurgien ou risquent d'irriter une lésion récente :
${removed.map((r) => `--        - ${r[0]} (${r[1]}) : ${r[2]} — ${r[3]}`).join("\n")}
--   2. Chaque séance de la plateforme reçoit une description, une durée et un
--      nombre de séances par semaine calculés sur son contenu réel.
--   Minimum 4 exercices par séance. Séances des kinés et copies des patients
--   non touchées. Aucune règle d'accès ne change. À RELIRE PAR JULES.
-- =============================================================================

${TABLES.map((t) => `alter table public.${t} no force row level security;`).join("\n")}

create temporary table plan (cond text, stage text, pos int, ex text, sets int, reps int, hold int) on commit drop;
insert into plan values
${rows.join(",\n")};

create temporary table plan_meta (cond text, stage text, minutes int) on commit drop;
insert into plan_meta values
${meta.join(",\n")};

create temporary table stage_info (stage text, descr text, per_week int) on commit drop;
insert into stage_info values
${STAGES.map((s) => `  (${q(s)}, ${q(DESC[s])}, ${PER_WEEK[s]})`).join(",\n")};

do $$ begin
  if exists (select 1 from plan p left join public.exercises e on e.name = p.ex and e.created_by is null where e.id is null) then
    raise exception 'exercice du programme introuvable';
  end if;
end $$;

create temporary table target on commit drop as
select w.id as workout_id, c.name as cond, w.stage as plan_stage, true as staged
from public.workouts w join public.conditions c on c.id = w.condition_id
where w.created_by is null and w.patient_id is null and c.created_by is null and w.stage is not null
union all
select w.id, c.name, v.plan_stage, false
from (values
${NOSTAGE.map(([c, nm, s]) => `  (${q(c)}, ${q(nm)}, ${q(s)})`).join(",\n")}
) as v(cond, wname, plan_stage)
join public.conditions c on c.name = v.cond and c.created_by is null
join public.workouts w on w.condition_id = c.id and w.name = v.wname and w.stage is null
  and w.created_by is null and w.patient_id is null;

do $$ begin
  if exists (select 1 from target t where not exists (select 1 from plan p where p.cond = t.cond and p.stage = t.plan_stage)) then
    raise exception 'séance de la plateforme sans programme';
  end if;
end $$;

-- Nouvelles lignes d'abord, anciennes ensuite (une séance n'est jamais vide :
-- trg_cleanup_empty_platform_workout la supprimerait).
create temporary table old_rows on commit drop as
select we.id from public.workout_exercises we where we.workout_id in (select workout_id from target);

insert into public.workout_exercises (workout_id, exercise_id, position, sets, reps, hold_seconds)
select t.workout_id, e.id, p.pos, p.sets, p.reps, p.hold
from target t
join plan p on p.cond = t.cond and p.stage = t.plan_stage
join public.exercises e on e.name = p.ex and e.created_by is null;

delete from public.workout_exercises we where we.id in (select id from old_rows);

-- Durée et fréquence pour toutes ; description standard pour les séances de phase.
update public.workouts w
set duration_minutes = m.minutes,
    times_per_week = s.per_week,
    description = case when t.staged then s.descr else w.description end
from target t
join plan_meta m on m.cond = t.cond and m.stage = t.plan_stage
join stage_info s on s.stage = t.plan_stage
where w.id = t.workout_id;

${TABLES.map((t) => `alter table public.${t} force row level security;`).join("\n")}
`;
fs.writeFileSync(path.join(repo, "supabase/migrations/0099_early_phase_caution.sql"), sql);
console.log("0099 écrite :", rows.length, "lignes");
