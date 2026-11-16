// Génère la migration 0096 : séances de la plateforme reconstruites (37 pathologies × 4 phases).
import fs from "node:fs";
import path from "node:path";
import { PLAN, STAGE_DEFAULT_NAME, parseDose } from "./plan-seances.mjs";
const repo = process.argv[2];
const STAGES = ["acute", "subacute", "recovery", "return_to_sport"];
const DESC = {
  acute: ["Exercices doux pour calmer la douleur et garder le mouvement.", "Gentle exercises to ease pain and keep moving."],
  subacute: ["Retrouver la mobilité et commencer un renforcement léger.", "Regain mobility and start light strengthening."],
  recovery: ["Renforcement progressif de la zone et des muscles qui la soutiennent.", "Progressive strengthening of the area and the muscles that support it."],
  return_to_sport: ["Retour progressif aux activités du quotidien et au sport.", "Gradual return to daily activities and sport."],
};
const RHYTHM = { acute: [12, 6], subacute: [15, 4], recovery: [20, 3], return_to_sport: [25, 3] };
// Séances sans phase existantes : contenu repris d'une phase.
const NOSTAGE = [
  ["Lombalgie chronique", "Séance express", "acute"],
  ["Lombalgie chronique", "Séance complète", "recovery"],
  ["Lombalgie chronique", "Séance intensive", "return_to_sport"],
  ["Entorse de la cheville", "Séance mobilité", "subacute"],
  ["Entorse de la cheville", "Séance renforcement", "recovery"],
];
const q = (s) => (s == null ? "null" : "'" + String(s).replace(/'/g, "''") + "'");
const n = (v) => (v == null ? "null" : String(v));
const rows = [];
for (const [c, st] of Object.entries(PLAN))
  for (const s of STAGES)
    st[s].forEach((x, i) => {
      const [ex, d] = x.split("|");
      // Durée d'endurance : pas de dose, l'appli lit les minutes dans la consigne.
      const dose = /min$/.test(d) ? { sets: null, reps: null, hold: null } : parseDose(d);
      rows.push(`  (${q(c)}, ${q(s)}, ${i}, ${q(ex)}, ${n(dose.sets)}, ${n(dose.reps)}, ${n(dose.hold)})`);
    });

const TABLES = ["exercises", "conditions", "patients", "patient_profiles", "workouts", "workout_exercises", "workout_logs", "patient_recommended_workouts", "patient_feedback", "instructor_hidden_workouts"];
const sql = `-- =============================================================================
-- 0096 — Séances de la plateforme reconstruites pour le lancement (Philippe, 2026-11-17)
--
-- En clair, pour Philippe (CLAUDE.md §3) :
--   Les modèles de séances de la PLATEFORME (créés par personne, pas les
--   copies d'un patient, pas les séances des kinés) sont refaits :
--   1. chaque pathologie (${Object.keys(PLAN).length}) a ses 4 phases (Soulagement, Mobilité,
--      Renforcement, Reprise) ; les phases qui manquaient sont créées ;
--   2. chaque séance contient 5 à 6 exercices, tous filmés ou activités du
--      quotidien (marche, vélo…), avec séries / répétitions / tenue ;
--   3. les séances en double (même pathologie, même phase) sont supprimées,
--      SAUF si un patient l'a déjà faite, qu'elle est recommandée, copiée,
--      masquée par un kiné ou commentée : celles-là sont gardées et remplies.
--   0. les pathologies créées deux fois sont fusionnées (une seule par nom) ;
--   Aucune séance d'un kiné ni copie « Ajuster la séance » n'est touchée.
--   Aucune règle d'accès ne change. FORCE ROW LEVEL SECURITY est levé le temps
--   des écritures puis remis (comme 0069 / 0075 / 0094 / 0095).
--   Contenu clinique rédigé par Claude : À RELIRE PAR JULES
--   (programme complet : docs/seances-a-valider-jules.md).
-- =============================================================================

${TABLES.map((t) => `alter table public.${t} no force row level security;`).join("\n")}

-- 0. Pathologies de la plateforme en double (même nom, créées deux fois en août) :
--    on garde celle qui a des patients (sinon la plus ancienne), on y rattache
--    patients, profils et séances de l'autre, puis on supprime l'autre. Le
--    sélecteur de pathologie des kinés n'affiche ainsi plus chaque nom en double.
create temporary table cond_merge on commit drop as
select c.id as dup_id, k.id as keep_id
from public.conditions c
cross join lateral (
  select k.id from public.conditions k
  where k.name = c.name and k.created_by is null
  order by (select count(*) from public.patients p where p.condition_id = k.id) desc, k.created_at, k.id
  limit 1
) k
where c.created_by is null and c.id <> k.id;

update public.patients t set condition_id = m.keep_id from cond_merge m where t.condition_id = m.dup_id;
update public.patient_profiles t set condition_id = m.keep_id from cond_merge m where t.condition_id = m.dup_id;
update public.workouts t set condition_id = m.keep_id from cond_merge m where t.condition_id = m.dup_id;
delete from public.conditions c where c.id in (select dup_id from cond_merge);

create temporary table plan (cond text, stage text, pos int, ex text, sets int, reps int, hold int) on commit drop;
insert into plan values
${rows.join(",\n")};

-- Garde-fou : chaque exercice et chaque pathologie du programme existent.
do $$ begin
  if exists (select 1 from plan p left join public.exercises e on e.name = p.ex and e.created_by is null where e.id is null) then
    raise exception 'exercice du programme introuvable dans la banque';
  end if;
  if exists (select 1 from (select distinct cond from plan) p left join public.conditions c on c.name = p.cond and c.created_by is null where c.id is null) then
    raise exception 'pathologie du programme introuvable';
  end if;
end $$;

create temporary table stage_name (stage text, name text, descr text, minutes int, per_week int) on commit drop;
insert into stage_name values
${STAGES.map((s) => `  (${q(s)}, ${q(STAGE_DEFAULT_NAME[s])}, ${q(DESC[s][0])}, ${RHYTHM[s][0]}, ${RHYTHM[s][1]})`).join(",\n")};

create temporary table pw on commit drop as
select w.id, w.condition_id, w.stage, w.name, w.created_at
from public.workouts w join public.conditions c on c.id = w.condition_id
where w.created_by is null and w.patient_id is null and c.created_by is null and c.name in (select cond from plan);

create temporary table used_w on commit drop as
select id from pw p where
     exists (select 1 from public.workout_logs x where x.workout_id = p.id)
  or exists (select 1 from public.patient_recommended_workouts x where x.workout_id = p.id)
  or exists (select 1 from public.workouts x where x.source_workout_id = p.id)
  or exists (select 1 from public.patient_feedback x where x.workout_id = p.id)
  or exists (select 1 from public.instructor_hidden_workouts x where x.workout_id = p.id);

-- 1. Une séance gardée par pathologie et phase (déjà utilisée, sinon au nom standard, sinon la plus ancienne).
create temporary table keeper on commit drop as
select distinct on (p.condition_id, p.stage) p.id
from pw p join stage_name s on s.stage = p.stage
order by p.condition_id, p.stage, (p.id in (select id from used_w)) desc, (p.name = s.name) desc, p.created_at, p.id;

-- 2. Doublons jamais utilisés : supprimés (leurs lignes d'exercices partent avec, ON DELETE CASCADE).
delete from public.workouts w
where w.id in (select id from pw where stage is not null)
  and w.id not in (select id from keeper)
  and w.id not in (select id from used_w);

-- 2b. Séances sans phase en double après la fusion (« Séance complète » ×2…) :
--     une seule gardée par nom (déjà utilisée, sinon la plus ancienne).
delete from public.workouts w
where w.id in (select id from pw where stage is null)
  and w.id not in (select id from used_w)
  and w.id not in (
    select distinct on (p.condition_id, p.name) p.id from pw p where p.stage is null
    order by p.condition_id, p.name, (p.id in (select id from used_w)) desc, p.created_at, p.id
  );

-- 3. Phases manquantes : créées avec le nom standard.
insert into public.workouts (condition_id, name, description, duration_minutes, times_per_week, stage)
select c.id, s.name, s.descr, s.minutes, s.per_week, s.stage
from (select distinct cond, stage from plan) x
join public.conditions c on c.name = x.cond and c.created_by is null
join stage_name s on s.stage = x.stage
where not exists (
  select 1 from public.workouts w
  where w.condition_id = c.id and w.stage = x.stage and w.created_by is null and w.patient_id is null
);

-- 4. Contenu : toutes les séances de la plateforme avec phase, plus les 5 séances sans phase.
create temporary table target on commit drop as
select w.id as workout_id, c.name as cond, w.stage as plan_stage
from public.workouts w join public.conditions c on c.id = w.condition_id
where w.created_by is null and w.patient_id is null and c.created_by is null
  and w.stage is not null and c.name in (select cond from plan)
union all
select w.id, c.name, v.plan_stage
from (values
${NOSTAGE.map(([c, nm, s]) => `  (${q(c)}, ${q(nm)}, ${q(s)})`).join(",\n")}
) as v(cond, wname, plan_stage)
join public.conditions c on c.name = v.cond and c.created_by is null
join public.workouts w on w.condition_id = c.id and w.name = v.wname and w.stage is null
  and w.created_by is null and w.patient_id is null;

-- Anciennes lignes notées d'abord, nouvelles ajoutées, puis anciennes retirées : une séance
-- n'est jamais vide un instant (le déclencheur trg_cleanup_empty_platform_workout
-- supprimerait une séance de la plateforme devenue vide).
create temporary table old_rows on commit drop as
select we.id from public.workout_exercises we where we.workout_id in (select workout_id from target);

insert into public.workout_exercises (workout_id, exercise_id, position, sets, reps, hold_seconds)
select t.workout_id, e.id, p.pos, p.sets, p.reps, p.hold
from target t
join plan p on p.cond = t.cond and p.stage = t.plan_stage
join public.exercises e on e.name = p.ex and e.created_by is null;

delete from public.workout_exercises we where we.id in (select id from old_rows);

${TABLES.map((t) => `alter table public.${t} force row level security;`).join("\n")}
`;
fs.writeFileSync(path.join(repo, "supabase/migrations/0096_platform_seances_rebuilt.sql"), sql);
const ef = path.join(repo, "i18n/content/en.json");
const j = JSON.parse(fs.readFileSync(ef, "utf8"));
for (const s of STAGES) j[DESC[s][0]] = DESC[s][1];
fs.writeFileSync(ef, JSON.stringify(j, null, 2) + "\n");
console.log("0096 écrite :", rows.length, "lignes");
