-- Physio-App — Migration 0073 : 13 nouveaux exercices filmés avec Jules
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
  ('49ea2da0-59ed-5446-bf56-3d308efaeb67'::uuid, 'Kneeling Calf and Hip Flexor Wall Stretch',
   'Face à un mur, à genou : le genou arrière posé au sol sur un coussin, le pied avant à plat, les mains au mur. Avancez doucement le bassin et le genou avant vers le mur, talon avant au sol : vous sentez l''étirement dans le mollet de devant et à l''avant de la hanche de derrière. Tenez la position en respirant calmement.',
   array[]::text[], array['Étirement du mollet et des fléchisseurs de hanche', 'Fléchisseurs de hanche', 'Mollet', 'Psoas']),
  ('d1535814-16be-5329-96a2-401e48d3cc31'::uuid, 'Wall Lunge Hip Flexor Stretch',
   'Face à un mur, les mains posées dessus, faites une grande fente : la jambe arrière allongée loin derrière, le genou avant au-dessus de la cheville. Poussez doucement le bassin vers l''avant et vers le bas, buste droit, jusqu''à sentir l''étirement à l''avant de la hanche de derrière. Tenez la position, puis changez de côté.',
   array[]::text[], array['Étirement des fléchisseurs de hanche en fente', 'Fléchisseurs de hanche', 'Psoas', 'Fente au mur']),
  ('e431a232-f3e5-5577-8234-8cab53fe1299'::uuid, 'Child''s Pose to Press-Up Flow',
   'Partez assis sur les talons, bras allongés devant vous, front au sol (posture de l''enfant). Faites glisser lentement le buste vers l''avant jusqu''à être à plat ventre, puis poussez sur les mains en gardant le bassin au sol pour cambrer doucement le dos. Revenez ensuite lentement à la posture de l''enfant. Enchaînez sans à-coup, au rythme de votre respiration.',
   array[]::text[], array['Enchaînement posture de l''enfant et extension', 'Posture de l''enfant', 'Extension du dos', 'Mobilité du dos']),
  ('7aad5c12-1fc4-5113-91b3-0085ad92e7b4'::uuid, 'Seated Spinal Roll-Down',
   'Assis au bord d''une chaise, les pieds à plat, le dos droit. Rentrez le menton puis enroulez lentement le dos vers l''avant, vertèbre par vertèbre, en laissant les bras descendre vers le sol. Remontez ensuite tout aussi lentement en déroulant le dos jusqu''à être bien droit.',
   array['chaise'], array['Enroulement vertébral assis', 'Mobilité de la colonne', 'Dos rond', 'Assouplissement du dos']),
  ('051d426c-99d5-5d54-ae30-54ae89c9de73'::uuid, 'Standing Bent-Leg Hamstring Stretch (Table)',
   'Debout à côté d''une table, posez une jambe pliée sur la table : la cuisse posée dessus, le genou fléchi, le pied à plat devant vous. L''autre jambe reste tendue au sol. Les mains sur la table, penchez lentement le buste vers la jambe pliée en gardant le dos droit, jusqu''à sentir l''étirement à l''arrière de la cuisse et dans la fesse. Tenez, puis changez de jambe.',
   array[]::text[], array['Étirement des ischios jambe pliée sur la table', 'Ischio-jambiers', 'Fessier', 'Étirement unilatéral']),
  ('37ceee37-03a0-53fa-bb9e-f61efafbeef9'::uuid, 'Standing Lateral Pelvic Shift',
   'Debout sur une jambe, mains sur les hanches, l''autre pied légèrement décollé du sol. Sans bouger le pied d''appui, déplacez doucement le bassin sur le côté, au-dessus de la jambe d''appui, puis revenez au centre. Le mouvement est petit et contrôlé. Faites la série, puis changez de jambe.',
   array[]::text[], array['Déplacement latéral du bassin', 'Contrôle de la hanche', 'Moyen fessier', 'Équilibre']),
  ('0bad4cc6-9d79-5150-9420-dacdfe477224'::uuid, 'Prone T Arm Raise (Floor)',
   'Allongé sur le ventre au sol, le front posé sur une serviette roulée, les bras tendus sur les côtés en T, pouces vers le haut. Resserrez les omoplates et levez les deux bras de quelques centimètres, sans lever la tête. Tenez une seconde, puis reposez-les lentement.',
   array[]::text[], array['Élévation des bras en T à plat ventre', 'Rééducation de l''épaule', 'Omoplates', 'Trapèze inférieur']),
  ('7daef042-b8db-53ac-8e81-79b2398fd0c0'::uuid, 'Prone Back Extension (Hands Behind Head)',
   'Allongé sur le ventre, les mains derrière la tête, les coudes écartés. Décollez lentement le buste du sol en gardant le regard vers le sol et les jambes posées, puis redescendez en contrôlant. Arrêtez-vous avant toute douleur dans le bas du dos.',
   array[]::text[], array['Extension du dos à plat ventre', 'Mains derrière la tête', 'Lombaires', 'Renforcement du dos']),
  ('59e63cf5-e1af-54bf-afa6-4cd3356bdfe5'::uuid, 'Lateral Step-Over Hop',
   'Placez-vous de côté à côté d''un step (ou d''une marche), un pied posé dessus, l''autre au sol. Poussez et passez par-dessus le step : le pied qui était au sol se pose en premier sur le step, puis l''autre pied rejoint le sol de l''autre côté. Repartez aussitôt dans l''autre sens, genoux souples à chaque réception.',
   array[]::text[], array['Sauts latéraux par-dessus le step', 'Pliométrie', 'Retour au sport', 'Changement d''appui']),
  ('abfa070c-0eb5-5414-a5dd-c1b550fedf47'::uuid, 'Step Drop Landing (Two Feet)',
   'Debout sur un step (ou une marche basse), sautez vers l''avant et réceptionnez-vous sur les deux pieds, genoux fléchis et bien alignés au-dessus des pieds, sans qu''ils rentrent vers l''intérieur. Tenez la position stable deux secondes avant de remonter.',
   array[]::text[], array['Saut du step réception deux pieds', 'Réception stabilisée', 'Pliométrie', 'Retour au sport']),
  ('5db8dc9b-7ff0-5a23-b3cb-2e9ab0fcd6d8'::uuid, 'Step Drop Landing (Single Leg)',
   'Debout sur un step (ou une marche basse), sautez vers l''avant et réceptionnez-vous sur une seule jambe, genou légèrement fléchi et aligné au-dessus du pied, l''autre jambe pliée en arrière. Tenez l''équilibre deux secondes avant de remonter. Faites la série, puis changez de jambe.',
   array[]::text[], array['Saut du step réception une jambe', 'Réception unipodale', 'Contrôle du genou', 'Retour au sport']),
  ('97c4ebff-afba-57f7-8b16-9b278782f15a'::uuid, 'Seated External Rotation (Elbow on Knee)',
   'Assis au sol, un genou plié. Posez le coude sur le genou, droit devant l''épaule, coude plié à 90°, un petit haltère (ou une bouteille d''eau) en main, l''avant-bras à l''horizontale. Sans bouger le coude, faites pivoter l''avant-bras vers le haut jusqu''à la verticale, puis redescendez lentement.',
   array['halteres'], array['Rotation externe assis coude sur le genou', 'Coiffe des rotateurs', 'Infra-épineux', 'Rééducation de l''épaule']),
  ('f3c8010e-e22b-55de-b5d4-99276d73674f'::uuid, 'Wall Tibialis Raise',
   'Dos et fesses appuyés contre un mur, les pieds avancés d''environ deux longueurs de pied, jambes tendues, talons au sol. Relevez la pointe des pieds le plus haut possible, tenez une seconde, puis reposez-la lentement.',
   array[]::text[], array['Relevé des orteils dos au mur', 'Releveurs du pied', 'Tibial antérieur', 'Périostite'])
) as v(id, name, instructions, equipment, keywords)
where not exists (select 1 from public.exercises e where e.id = v.id or e.name = v.name);

insert into public.exercise_body_parts (exercise_id, body_part_id)
select v.id, bp.id
from (values
  ('49ea2da0-59ed-5446-bf56-3d308efaeb67'::uuid, 'cheville-pied'), -- Kneeling Calf and Hip Flexor Wall Stretch
  ('49ea2da0-59ed-5446-bf56-3d308efaeb67'::uuid, 'hanche-fessiers'),
  ('d1535814-16be-5329-96a2-401e48d3cc31'::uuid, 'hanche-fessiers'), -- Wall Lunge Hip Flexor Stretch
  ('e431a232-f3e5-5577-8234-8cab53fe1299'::uuid, 'dos-lombaires'), -- Child's Pose to Press-Up Flow
  ('7aad5c12-1fc4-5113-91b3-0085ad92e7b4'::uuid, 'dos-lombaires'), -- Seated Spinal Roll-Down
  ('051d426c-99d5-5d54-ae30-54ae89c9de73'::uuid, 'genou-jambe'), -- Standing Bent-Leg Hamstring Stretch (Table)
  ('051d426c-99d5-5d54-ae30-54ae89c9de73'::uuid, 'hanche-fessiers'),
  ('37ceee37-03a0-53fa-bb9e-f61efafbeef9'::uuid, 'hanche-fessiers'), -- Standing Lateral Pelvic Shift
  ('37ceee37-03a0-53fa-bb9e-f61efafbeef9'::uuid, 'equilibre-general'),
  ('0bad4cc6-9d79-5150-9420-dacdfe477224'::uuid, 'epaule'), -- Prone T Arm Raise (Floor)
  ('0bad4cc6-9d79-5150-9420-dacdfe477224'::uuid, 'dos-lombaires'),
  ('7daef042-b8db-53ac-8e81-79b2398fd0c0'::uuid, 'dos-lombaires'), -- Prone Back Extension (Hands Behind Head)
  ('59e63cf5-e1af-54bf-afa6-4cd3356bdfe5'::uuid, 'genou-jambe'), -- Lateral Step-Over Hop
  ('59e63cf5-e1af-54bf-afa6-4cd3356bdfe5'::uuid, 'equilibre-general'),
  ('abfa070c-0eb5-5414-a5dd-c1b550fedf47'::uuid, 'genou-jambe'), -- Step Drop Landing (Two Feet)
  ('5db8dc9b-7ff0-5a23-b3cb-2e9ab0fcd6d8'::uuid, 'genou-jambe'), -- Step Drop Landing (Single Leg)
  ('5db8dc9b-7ff0-5a23-b3cb-2e9ab0fcd6d8'::uuid, 'equilibre-general'),
  ('97c4ebff-afba-57f7-8b16-9b278782f15a'::uuid, 'epaule'), -- Seated External Rotation (Elbow on Knee)
  ('f3c8010e-e22b-55de-b5d4-99276d73674f'::uuid, 'cheville-pied') -- Wall Tibialis Raise
) as v(id, slug)
join public.body_parts bp on bp.slug = v.slug
join public.exercises e on e.id = v.id
on conflict (exercise_id, body_part_id) do nothing;

alter table public.exercise_body_parts force row level security;
alter table public.exercises force row level security;
