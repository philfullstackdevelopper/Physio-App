-- Physio-App — Migration 0042: consolidate overlapping exercises, English names
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run.
--
-- Follow-up to 0040/0041. Those two fixed OBJECTIVE duplicates (identical
-- rows / identical instructions). This migration is a curated pass over the
-- 49 remaining slug groups where French clinical exercises and English
-- Everkinetic exercises share one illustration — each one read individually
-- (not just name-matched) to tell genuine clinical variants (different
-- equipment, joint angle/muscle target, or named precaution) from pure
-- restatements. See conversation history for the per-cluster reasoning.
--
-- Two parts:
--  1. Rename 59 kept French exercises to English (their names only —
--     instructions stay French, matching the existing Everkinetic pattern
--     and the app's French-only UI).
--  2. Remove 76 exercises that were redundant with another entry in the
--     same movement group, repointing any séance reference to that
--     survivor first (same safe collide-then-repoint-then-delete pattern
--     as 0040/0041 — no séance loses content, only the duplicate entry).

-- ---------------------------------------------------------------------------
-- 1. Renames (by id — unambiguous).
-- ---------------------------------------------------------------------------
with renames (id, new_name) as (
  values
  ('303aa7a6-651b-4d9c-9d4e-2d9506b2a696'::uuid, 'Side-Lying Hip Abduction (Band)'::text),
  ('d153d138-3831-437d-af44-150e3faa86cd'::uuid, 'Shoulder Circles'::text),
  ('8c9a2d58-2bf6-4707-bb72-4f71f718cca2'::uuid, 'Bicep Curl (Water Bottle)'::text),
  ('79741c75-8d28-4a89-bdb5-05275559d061'::uuid, 'Quadruped Scapular Stability'::text),
  ('85a9ddcf-1a6c-4f52-b1c1-700b7d0c0b81'::uuid, 'Controlled Mini-Squat (Knee Arthritis)'::text),
  ('26954188-adfe-4e90-a9b2-6dc7288311b5'::uuid, 'Light Closed-Chain Quad Strengthening'::text),
  ('27797935-d7e1-4d74-a343-0619a7692233'::uuid, 'Limited-Range Squat (Hip)'::text),
  ('e1332bcb-6422-4f4d-9dba-e37877d959d6'::uuid, 'Assisted Partial Squat'::text),
  ('ea6ef71b-d592-4572-8e36-1d9615866b60'::uuid, 'Protected Squat (Quadriceps)'::text),
  ('e17c5465-029c-4e86-baf2-460c073a9d4e'::uuid, 'ACL-Protected Squat (Limited Range)'::text),
  ('49481313-e5d0-4e49-9548-120d098bda3f'::uuid, 'Isometric Calf Hold (Resistance)'::text),
  ('d1109048-6a7c-42f6-a2e0-333ae8e942d3'::uuid, 'Slow Bilateral Calf Raise'::text),
  ('32d4e7ec-da03-4707-9437-1b2265e8cb9c'::uuid, 'Assisted Calf Raise (Post-Achilles)'::text),
  ('bbdbc0f4-1dcb-4885-ace6-4ce79ef659df'::uuid, 'Assisted Standing Calf Raise'::text),
  ('dcff15c3-7d37-4b50-84a4-2d2fedcac5de'::uuid, 'Eccentric Calf Raise (Bent Knee, Soleus)'::text),
  ('f62a09fc-72d1-4630-bfb8-8800f288b1d6'::uuid, 'Eccentric Calf Raise (Straight Knee, Single-Leg)'::text),
  ('f469bb69-a0ae-4300-a743-adcbedaa08d4'::uuid, 'Isometric Calf Hold'::text),
  ('83dd6b2e-1e6f-4912-9cac-87d29357b03a'::uuid, 'Clamshell (Band)'::text),
  ('b76c7cc4-cb49-40db-a72b-9c7ae17c09e3'::uuid, 'Progressive Clamshell'::text),
  ('4eeb15e7-d7f2-49fd-af0a-9aa5ea486548'::uuid, 'Seated Stationary Cycling (Forward Lean)'::text),
  ('2aca580e-ef25-4295-a2b3-d215ff88b80c'::uuid, 'Stationary Cycling (No Resistance)'::text),
  ('e8618c41-c82d-49c8-b6d0-d8be803c8a4d'::uuid, 'Stationary Cycling (Low Resistance, Meniscus)'::text),
  ('def00cd6-17d1-40ec-8a2c-c0e175bc9180'::uuid, 'Limited Front Raise (Pain-Guided)'::text),
  ('30ef273b-c40f-41aa-8548-4327cbbc3a7c'::uuid, 'Assisted Front Raise'::text),
  ('b1313eb2-1513-4dc3-93c1-596c7e4d427a'::uuid, 'Front Raise (Bodyweight)'::text),
  ('7476194f-7240-4cc4-aae9-1252ebb7a578'::uuid, 'Gentle Supine Hamstring Stretch'::text),
  ('4a2ccd07-db9b-46d0-9cc7-f73880d9a628'::uuid, 'Wall Calf Stretch (Bent Knee, Soleus)'::text),
  ('af9ebe20-6f81-4a43-bd67-0a2288754bc5'::uuid, 'Lateral Lunge (Band)'::text),
  ('5607640f-0337-4ef0-87c6-d6f0ca540cef'::uuid, 'Gentle Supine Core Bracing (Hernia)'::text),
  ('6f0d89b0-0a27-41b2-86b3-8714d97f3306'::uuid, 'Dynamic Plank (Limb Movement)'::text),
  ('848846f8-42f3-4fc6-87a8-7c5b269e3599'::uuid, 'Modified Plank (Knees)'::text),
  ('c3a7f7ea-e2b2-4c93-bacf-2e92a64a99a1'::uuid, 'Postural Core Bracing'::text),
  ('7e4c997a-d926-4b0c-9381-a9108eaf8222'::uuid, 'Anti-Rotation Hold (Band)'::text),
  ('1db23eee-7bd4-493d-b8f4-a1ebf7cc1d6e'::uuid, 'Heel-Driven Glute Bridge (Hamstring Focus)'::text),
  ('84c9dd65-507d-42f1-8b22-e87278bc7733'::uuid, 'Modified Side Plank (Light)'::text),
  ('2f659211-e099-4eab-9a80-3add5d2430fb'::uuid, 'Assisted Progressive Walking'::text),
  ('db81e0fd-706c-4f04-929f-80931182a101'::uuid, 'Assisted Progressive Walking (Post-Knee-Replacement)'::text),
  ('27b5c721-d3b4-47d8-b1e7-5b2bd8f11147'::uuid, 'Progressive Walk-to-Jog (Shin Splints, Soft Terrain)'::text),
  ('7757cc23-047a-4f2c-9764-eac76a39b36b'::uuid, 'Fractionated Short Walks'::text),
  ('c3643b5b-78e2-4ad2-a290-0fc14cc3029e'::uuid, 'Forward-Leaning Walk (Short Duration)'::text),
  ('6b1544f1-36ce-4714-b432-937911d301e3'::uuid, 'Unassisted Prolonged Walking (Hip)'::text),
  ('8bbe6bf6-88fc-4895-bea7-dba5f321349e'::uuid, 'Progressive Brisk Walking'::text),
  ('a2eb0c0c-3f6e-4df8-926d-4604e6632c55'::uuid, 'Marching in Place (Warm-Up)'::text),
  ('c571fcdb-f8fc-4058-96aa-34494f8f2d10'::uuid, 'Walking on Varied Terrain'::text),
  ('e4ecad3e-c30c-4bee-a0cd-41b88d34973b'::uuid, 'Mini Wall Sit (Shallow)'::text),
  ('d60e136f-ec59-47da-8bb2-d87098190bbe'::uuid, 'Isometric Wall Sit (60 Degrees)'::text),
  ('79f6be92-a0ee-4c40-93e7-92f1ec613fe7'::uuid, 'Controlled Stair Climbing'::text),
  ('4eea1449-dd13-4106-8d7c-f8d1e3be73c6'::uuid, 'Assisted Low Step-Up (Slow)'::text),
  ('288e9b44-9a89-4e61-a3ba-bafee5484eef'::uuid, 'Wall Finger Walk (Shoulder Mobility)'::text),
  ('c556bec3-7b0a-45ac-9834-fe4832e5b306'::uuid, 'Weighted Single-Leg Glute Bridge'::text),
  ('8c9c44ba-36e3-4d24-9bb2-e9b91ba51de8'::uuid, 'Wrist Extension (Band)'::text),
  ('a256437f-6a6c-4385-95ed-179b587f8b82'::uuid, 'Wrist Extension (Light Dumbbell)'::text),
  ('4fbe1504-df6c-436e-8f6a-b4301bbad7fe'::uuid, 'Eccentric Wrist Extension'::text),
  ('6e7644dc-724e-4a3b-ba28-952b326e545e'::uuid, 'Isometric Wrist Extension'::text),
  ('70717aac-6227-4f89-a247-23898294cc90'::uuid, 'Wrist Curl (Light Dumbbell)'::text),
  ('86f800c4-3ed8-456f-895c-cd0052e7c3c2'::uuid, 'Eccentric Wrist Curl'::text),
  ('600234ee-857e-4028-9002-4eb2fa256b2e'::uuid, 'Single-Leg Romanian Deadlift (Light, Bodyweight)'::text),
  ('0109fbe3-c5fe-4077-b81f-4ec6e8049221'::uuid, 'Lying Torso Rotation'::text),
  ('25d04886-760c-4862-80d7-5483ee0f630c'::uuid, 'Controlled Lateral Jump (Hip/Knee Alignment)'::text)
)
update public.exercises e
set name = r.new_name
from renames r
where e.id = r.id;

-- ---------------------------------------------------------------------------
-- 2a. Where a séance already lists both the drop-id and its designated
--     survivor, just remove the drop-id row from that séance.
-- ---------------------------------------------------------------------------
with pairs (drop_id, keep_id) as (
  values
  ('36da63db-64b7-4a4d-bf36-89f91f793aab'::uuid, 'ed5283a9-4170-4115-b77d-db0dd086d47a'::uuid),
  ('892a2864-dd88-4895-9153-9bd6bfb8b3e4'::uuid, 'ed5283a9-4170-4115-b77d-db0dd086d47a'::uuid),
  ('848af0ff-91e3-4f38-b4d6-ab941c26bb7f'::uuid, 'fef1229f-5858-44b0-a36e-082e05c73aa3'::uuid),
  ('13b108db-f802-4203-a329-7951f678146d'::uuid, 'a4185d4b-cf20-46e6-b3b4-2b7837999fa4'::uuid),
  ('2a9aa3d0-ad18-4bf9-8f71-74c45106ca8c'::uuid, 'a4185d4b-cf20-46e6-b3b4-2b7837999fa4'::uuid),
  ('a8047426-20d2-4ffc-8ddc-77524b0c13fe'::uuid, '82e85e8b-046e-4680-8f6e-e50da1481ad3'::uuid),
  ('9725d1ed-faf6-4229-849d-a8e09d03ac69'::uuid, '0ab86962-cd40-43f1-8ff2-5a95814bf394'::uuid),
  ('3665e570-77a4-43dd-bac1-4a1624acee3a'::uuid, '4258d669-83b8-4f94-8db6-7fe8f5c219b4'::uuid),
  ('a87b0212-81ea-4e80-aa0e-84f21d2de966'::uuid, '4258d669-83b8-4f94-8db6-7fe8f5c219b4'::uuid),
  ('8a49f5b5-b449-4f90-8fd0-336e4a93b280'::uuid, '4258d669-83b8-4f94-8db6-7fe8f5c219b4'::uuid),
  ('9c7ad347-15d4-4c7d-a4a7-bab00a5e35e7'::uuid, '4258d669-83b8-4f94-8db6-7fe8f5c219b4'::uuid),
  ('6b878625-1c41-4084-b5e0-a448f4b03fda'::uuid, '31fb5334-6049-453d-888f-a1009c47407c'::uuid),
  ('ea540b4c-344c-4b04-8662-f7727457cf19'::uuid, '31fb5334-6049-453d-888f-a1009c47407c'::uuid),
  ('ae408177-a571-45b2-b9a6-785f04f2f5b6'::uuid, '31fb5334-6049-453d-888f-a1009c47407c'::uuid),
  ('4f891219-97a2-4f78-b3f8-eb3012fce7ed'::uuid, 'af57db77-22a8-42a0-9a73-406e930c0e36'::uuid),
  ('77074a27-9e1b-4412-af04-f31439a89040'::uuid, '48aa1405-e0ac-42c1-a7ac-1ba17e88a09c'::uuid),
  ('25dab058-7ca6-465d-8f19-8ccf8a5c293f'::uuid, '48aa1405-e0ac-42c1-a7ac-1ba17e88a09c'::uuid),
  ('3fa5add6-b833-478e-a108-cd5c20681a87'::uuid, '6315517e-eb83-450a-a17a-0ec926a33ee8'::uuid),
  ('e8c7ebe3-a81d-4544-adc3-f8a2ade323be'::uuid, '6315517e-eb83-450a-a17a-0ec926a33ee8'::uuid),
  ('e4b6f240-8598-46e9-87aa-c1f75099c4c9'::uuid, '6315517e-eb83-450a-a17a-0ec926a33ee8'::uuid),
  ('811e2c11-4668-408a-821c-2056600ef5e8'::uuid, '4c93055b-6a25-4e02-b2f7-79a4696d696c'::uuid),
  ('647d91e5-08f9-4ef6-b4c7-625be0108af9'::uuid, 'fd622b97-312e-4843-bf5f-a2382af8709f'::uuid),
  ('3590baed-97dc-4827-9f8c-6bccbd080349'::uuid, 'fd622b97-312e-4843-bf5f-a2382af8709f'::uuid),
  ('f9c10ddb-5cd2-4cea-b2fa-d45017e672ca'::uuid, '196c3cde-1afb-4c9f-b092-eced815babc0'::uuid),
  ('d6eadc49-10ef-45a3-98d0-4d7498b9cbba'::uuid, '52207c5a-5057-4a19-ba0a-29a45de976d0'::uuid),
  ('c4606947-ce9c-46d5-ac63-373066bcac70'::uuid, 'e479b2f5-a0dd-4c6a-ab3a-3b2c86813b37'::uuid),
  ('fc21dcf3-5888-4239-a1aa-561f68c0401c'::uuid, '53e61d8d-450a-4344-84db-c3773363f23b'::uuid),
  ('8aa4684c-d9e3-45f5-9481-272221efebc7'::uuid, '095ddec9-8ddd-415e-90f9-f2f511c90d3f'::uuid),
  ('80524e55-49bf-4ed8-9db4-6c4ebb332638'::uuid, 'e614adb7-64ab-4a7d-ba44-d270d6c58553'::uuid),
  ('b813d748-a8d7-46ac-8523-b5ad58c7f6dc'::uuid, 'e614adb7-64ab-4a7d-ba44-d270d6c58553'::uuid),
  ('fcc7331d-6898-44b5-92c5-2d42de487a43'::uuid, 'b05f9018-bb26-443e-9a16-ec9d9e7eff54'::uuid),
  ('242c6159-2f8f-442e-b7a5-6cf03ed76b5c'::uuid, 'b05f9018-bb26-443e-9a16-ec9d9e7eff54'::uuid),
  ('963c2b3b-837c-4f50-b51c-ac8f224f8e91'::uuid, 'b05f9018-bb26-443e-9a16-ec9d9e7eff54'::uuid),
  ('b6dd7dba-d542-4d31-9ee9-bf50a38883c2'::uuid, 'b05f9018-bb26-443e-9a16-ec9d9e7eff54'::uuid),
  ('23b4f60b-84de-4f4c-aa03-4c1b2bf787d3'::uuid, 'b05f9018-bb26-443e-9a16-ec9d9e7eff54'::uuid),
  ('36766220-182b-4e24-8439-ee4276f19879'::uuid, '61bbbd24-b9f3-4c74-bda9-6e91af7fa279'::uuid),
  ('dbbd1d4a-e513-4d17-b17b-d5cf81eda790'::uuid, '2445312f-705d-4190-9bcb-38ebb00d1f24'::uuid),
  ('730309b6-0bba-4468-82fc-89f174b15436'::uuid, '2445312f-705d-4190-9bcb-38ebb00d1f24'::uuid),
  ('a69aeaec-2732-4650-90bb-c3144f51ba01'::uuid, '31bd9c62-b8c5-484f-8d9c-6cfaa1bb74cd'::uuid),
  ('b010e629-49bb-429d-9f00-1b3280c708bd'::uuid, '49e7aee4-551a-4504-b225-dd09a19e0741'::uuid),
  ('aa778018-776d-4a23-9b0e-d02b31c370af'::uuid, '49e7aee4-551a-4504-b225-dd09a19e0741'::uuid),
  ('a83ac163-ce97-4005-8532-85773cd36e67'::uuid, '49e7aee4-551a-4504-b225-dd09a19e0741'::uuid),
  ('b0d77d55-e3d5-4e95-954d-ea77ccfc1834'::uuid, '49e7aee4-551a-4504-b225-dd09a19e0741'::uuid),
  ('358df524-c85b-469e-a973-f718b2b5f267'::uuid, '49e7aee4-551a-4504-b225-dd09a19e0741'::uuid),
  ('bef86e63-4016-4cc8-976d-e7c4fa4d3925'::uuid, '49e7aee4-551a-4504-b225-dd09a19e0741'::uuid),
  ('2d58d0b0-d47c-47c5-8d9d-8f86c1b1e155'::uuid, '49e7aee4-551a-4504-b225-dd09a19e0741'::uuid),
  ('0700a956-9015-47e1-80d5-33343ae43ad3'::uuid, 'f348703e-b281-4186-9825-9243370810f0'::uuid),
  ('74561a3a-ceaa-400e-967f-593cf6bc4437'::uuid, 'f8c614c4-5945-4947-becd-eb2e3f24a2cc'::uuid),
  ('ea6134cf-934e-469f-a364-70ad86cbac2c'::uuid, 'ae0984c9-2fdb-4450-9c7d-56597deb444d'::uuid),
  ('5266ed59-473a-42fa-af31-c8ef08bd362a'::uuid, 'ae0984c9-2fdb-4450-9c7d-56597deb444d'::uuid),
  ('882e4e52-ceb3-43f0-9097-ca25e2b7a9d4'::uuid, 'a2e1d1a3-b4ee-48d3-98b9-bfb9534f5345'::uuid),
  ('6a658714-4f61-44a6-b43c-83506ca12790'::uuid, 'a2e1d1a3-b4ee-48d3-98b9-bfb9534f5345'::uuid),
  ('5245b61a-b105-450d-b0a9-9a7e7ffaff07'::uuid, 'a2e1d1a3-b4ee-48d3-98b9-bfb9534f5345'::uuid),
  ('191b9ef7-619b-4146-9386-ce1c78893905'::uuid, 'e466cece-d226-434c-aa80-978e494c27f3'::uuid),
  ('b4a556b6-f8fb-4882-8f6c-f1cd91d87036'::uuid, 'e466cece-d226-434c-aa80-978e494c27f3'::uuid),
  ('3627b81c-1f05-4669-94f2-2c8a9d81cfc3'::uuid, 'e466cece-d226-434c-aa80-978e494c27f3'::uuid),
  ('b868c0cf-dc34-4f4d-b25f-0516d95b07c9'::uuid, 'e466cece-d226-434c-aa80-978e494c27f3'::uuid),
  ('c6271cc7-8c2b-47d0-9123-dc6d1e2ed1cc'::uuid, 'ebe83c21-b997-4bc5-95a0-bd573ddcf064'::uuid),
  ('980d9260-e5d4-493b-9c05-f687f942a7e4'::uuid, '99be8779-0525-4a1d-854d-dbe8d1f08267'::uuid),
  ('8bae0ee4-b8d5-4f33-9f0f-0acb550cc328'::uuid, '4b5d8a3d-6240-4cab-be9a-223d7e9c8505'::uuid),
  ('917d2b90-22ef-4a87-a126-ad85d29165ad'::uuid, '92e2af84-5bea-4b7d-854d-11a701eda009'::uuid),
  ('a4d02b7e-b8b5-4fe7-93c0-4aff9f9b7968'::uuid, 'b474f557-b996-4736-aab5-177334b50878'::uuid),
  ('b5a21592-946c-4d62-8f45-d438cb31c0dd'::uuid, 'b474f557-b996-4736-aab5-177334b50878'::uuid),
  ('4e9ce88c-8330-44d1-8db0-972974414d28'::uuid, 'b474f557-b996-4736-aab5-177334b50878'::uuid),
  ('1f1aec3a-6a72-46d8-8419-3f2f89c56393'::uuid, 'b474f557-b996-4736-aab5-177334b50878'::uuid),
  ('0d439a38-08a5-4962-b602-a72deaf56901'::uuid, 'b474f557-b996-4736-aab5-177334b50878'::uuid),
  ('71df6835-ecc3-4271-ac43-397007a5d7cd'::uuid, '6786ac6a-e359-4b15-bfce-b3cc61998636'::uuid),
  ('00a159ab-fbbc-449f-88ee-9672b4a0e0a6'::uuid, '4ec44ea0-4a60-40bc-ad2e-0ca4efa04962'::uuid),
  ('919f380f-273f-4ea1-a545-356f6e027c73'::uuid, '4ec44ea0-4a60-40bc-ad2e-0ca4efa04962'::uuid),
  ('111a6af2-7ff4-4065-9f43-27628a730827'::uuid, '4ec44ea0-4a60-40bc-ad2e-0ca4efa04962'::uuid),
  ('f6c5550e-5efe-48b8-a8ea-ed5186f0f51d'::uuid, 'f0d912cf-2189-409c-94f1-49b0387f30b2'::uuid),
  ('77a52a12-ad1c-4cce-8ea3-a04fffecf38f'::uuid, 'f0d912cf-2189-409c-94f1-49b0387f30b2'::uuid),
  ('6e08b167-4a69-4a2f-abbf-9f9632071d15'::uuid, 'db6003ea-82cd-4738-b61c-4d14a17b6618'::uuid),
  ('ffdada99-621e-4390-b75f-211ced7db149'::uuid, 'db6003ea-82cd-4738-b61c-4d14a17b6618'::uuid),
  ('d5cdea4c-c51a-4fb7-bd3b-4f0179879a7c'::uuid, '858ae748-1158-4544-bdd0-3809c96f1a6e'::uuid),
  -- The FR "Squat" here is a plain bodyweight squat, not the EN "Squat" in
  -- this same slug (which is barbell-loaded) — repoints to Bodyweight Squat
  -- instead, the exercise it actually duplicates.
  ('8340cba5-43a8-4206-b782-906dd2e7ba50'::uuid, '4258d669-83b8-4f94-8db6-7fe8f5c219b4'::uuid)
)
delete from public.workout_exercises we
using pairs p
where we.exercise_id = p.drop_id
  and exists (
    select 1 from public.workout_exercises we2
    where we2.workout_id = we.workout_id and we2.exercise_id = p.keep_id
  );

-- ---------------------------------------------------------------------------
-- 2b. Any remaining reference to a drop-id gets repointed to its survivor.
-- ---------------------------------------------------------------------------
with pairs (drop_id, keep_id) as (
  values
  ('36da63db-64b7-4a4d-bf36-89f91f793aab'::uuid, 'ed5283a9-4170-4115-b77d-db0dd086d47a'::uuid),
  ('892a2864-dd88-4895-9153-9bd6bfb8b3e4'::uuid, 'ed5283a9-4170-4115-b77d-db0dd086d47a'::uuid),
  ('848af0ff-91e3-4f38-b4d6-ab941c26bb7f'::uuid, 'fef1229f-5858-44b0-a36e-082e05c73aa3'::uuid),
  ('13b108db-f802-4203-a329-7951f678146d'::uuid, 'a4185d4b-cf20-46e6-b3b4-2b7837999fa4'::uuid),
  ('2a9aa3d0-ad18-4bf9-8f71-74c45106ca8c'::uuid, 'a4185d4b-cf20-46e6-b3b4-2b7837999fa4'::uuid),
  ('a8047426-20d2-4ffc-8ddc-77524b0c13fe'::uuid, '82e85e8b-046e-4680-8f6e-e50da1481ad3'::uuid),
  ('9725d1ed-faf6-4229-849d-a8e09d03ac69'::uuid, '0ab86962-cd40-43f1-8ff2-5a95814bf394'::uuid),
  ('3665e570-77a4-43dd-bac1-4a1624acee3a'::uuid, '4258d669-83b8-4f94-8db6-7fe8f5c219b4'::uuid),
  ('a87b0212-81ea-4e80-aa0e-84f21d2de966'::uuid, '4258d669-83b8-4f94-8db6-7fe8f5c219b4'::uuid),
  ('8a49f5b5-b449-4f90-8fd0-336e4a93b280'::uuid, '4258d669-83b8-4f94-8db6-7fe8f5c219b4'::uuid),
  ('9c7ad347-15d4-4c7d-a4a7-bab00a5e35e7'::uuid, '4258d669-83b8-4f94-8db6-7fe8f5c219b4'::uuid),
  ('6b878625-1c41-4084-b5e0-a448f4b03fda'::uuid, '31fb5334-6049-453d-888f-a1009c47407c'::uuid),
  ('ea540b4c-344c-4b04-8662-f7727457cf19'::uuid, '31fb5334-6049-453d-888f-a1009c47407c'::uuid),
  ('ae408177-a571-45b2-b9a6-785f04f2f5b6'::uuid, '31fb5334-6049-453d-888f-a1009c47407c'::uuid),
  ('4f891219-97a2-4f78-b3f8-eb3012fce7ed'::uuid, 'af57db77-22a8-42a0-9a73-406e930c0e36'::uuid),
  ('77074a27-9e1b-4412-af04-f31439a89040'::uuid, '48aa1405-e0ac-42c1-a7ac-1ba17e88a09c'::uuid),
  ('25dab058-7ca6-465d-8f19-8ccf8a5c293f'::uuid, '48aa1405-e0ac-42c1-a7ac-1ba17e88a09c'::uuid),
  ('3fa5add6-b833-478e-a108-cd5c20681a87'::uuid, '6315517e-eb83-450a-a17a-0ec926a33ee8'::uuid),
  ('e8c7ebe3-a81d-4544-adc3-f8a2ade323be'::uuid, '6315517e-eb83-450a-a17a-0ec926a33ee8'::uuid),
  ('e4b6f240-8598-46e9-87aa-c1f75099c4c9'::uuid, '6315517e-eb83-450a-a17a-0ec926a33ee8'::uuid),
  ('811e2c11-4668-408a-821c-2056600ef5e8'::uuid, '4c93055b-6a25-4e02-b2f7-79a4696d696c'::uuid),
  ('647d91e5-08f9-4ef6-b4c7-625be0108af9'::uuid, 'fd622b97-312e-4843-bf5f-a2382af8709f'::uuid),
  ('3590baed-97dc-4827-9f8c-6bccbd080349'::uuid, 'fd622b97-312e-4843-bf5f-a2382af8709f'::uuid),
  ('f9c10ddb-5cd2-4cea-b2fa-d45017e672ca'::uuid, '196c3cde-1afb-4c9f-b092-eced815babc0'::uuid),
  ('d6eadc49-10ef-45a3-98d0-4d7498b9cbba'::uuid, '52207c5a-5057-4a19-ba0a-29a45de976d0'::uuid),
  ('c4606947-ce9c-46d5-ac63-373066bcac70'::uuid, 'e479b2f5-a0dd-4c6a-ab3a-3b2c86813b37'::uuid),
  ('fc21dcf3-5888-4239-a1aa-561f68c0401c'::uuid, '53e61d8d-450a-4344-84db-c3773363f23b'::uuid),
  ('8aa4684c-d9e3-45f5-9481-272221efebc7'::uuid, '095ddec9-8ddd-415e-90f9-f2f511c90d3f'::uuid),
  ('80524e55-49bf-4ed8-9db4-6c4ebb332638'::uuid, 'e614adb7-64ab-4a7d-ba44-d270d6c58553'::uuid),
  ('b813d748-a8d7-46ac-8523-b5ad58c7f6dc'::uuid, 'e614adb7-64ab-4a7d-ba44-d270d6c58553'::uuid),
  ('fcc7331d-6898-44b5-92c5-2d42de487a43'::uuid, 'b05f9018-bb26-443e-9a16-ec9d9e7eff54'::uuid),
  ('242c6159-2f8f-442e-b7a5-6cf03ed76b5c'::uuid, 'b05f9018-bb26-443e-9a16-ec9d9e7eff54'::uuid),
  ('963c2b3b-837c-4f50-b51c-ac8f224f8e91'::uuid, 'b05f9018-bb26-443e-9a16-ec9d9e7eff54'::uuid),
  ('b6dd7dba-d542-4d31-9ee9-bf50a38883c2'::uuid, 'b05f9018-bb26-443e-9a16-ec9d9e7eff54'::uuid),
  ('23b4f60b-84de-4f4c-aa03-4c1b2bf787d3'::uuid, 'b05f9018-bb26-443e-9a16-ec9d9e7eff54'::uuid),
  ('36766220-182b-4e24-8439-ee4276f19879'::uuid, '61bbbd24-b9f3-4c74-bda9-6e91af7fa279'::uuid),
  ('dbbd1d4a-e513-4d17-b17b-d5cf81eda790'::uuid, '2445312f-705d-4190-9bcb-38ebb00d1f24'::uuid),
  ('730309b6-0bba-4468-82fc-89f174b15436'::uuid, '2445312f-705d-4190-9bcb-38ebb00d1f24'::uuid),
  ('a69aeaec-2732-4650-90bb-c3144f51ba01'::uuid, '31bd9c62-b8c5-484f-8d9c-6cfaa1bb74cd'::uuid),
  ('b010e629-49bb-429d-9f00-1b3280c708bd'::uuid, '49e7aee4-551a-4504-b225-dd09a19e0741'::uuid),
  ('aa778018-776d-4a23-9b0e-d02b31c370af'::uuid, '49e7aee4-551a-4504-b225-dd09a19e0741'::uuid),
  ('a83ac163-ce97-4005-8532-85773cd36e67'::uuid, '49e7aee4-551a-4504-b225-dd09a19e0741'::uuid),
  ('b0d77d55-e3d5-4e95-954d-ea77ccfc1834'::uuid, '49e7aee4-551a-4504-b225-dd09a19e0741'::uuid),
  ('358df524-c85b-469e-a973-f718b2b5f267'::uuid, '49e7aee4-551a-4504-b225-dd09a19e0741'::uuid),
  ('bef86e63-4016-4cc8-976d-e7c4fa4d3925'::uuid, '49e7aee4-551a-4504-b225-dd09a19e0741'::uuid),
  ('2d58d0b0-d47c-47c5-8d9d-8f86c1b1e155'::uuid, '49e7aee4-551a-4504-b225-dd09a19e0741'::uuid),
  ('0700a956-9015-47e1-80d5-33343ae43ad3'::uuid, 'f348703e-b281-4186-9825-9243370810f0'::uuid),
  ('74561a3a-ceaa-400e-967f-593cf6bc4437'::uuid, 'f8c614c4-5945-4947-becd-eb2e3f24a2cc'::uuid),
  ('ea6134cf-934e-469f-a364-70ad86cbac2c'::uuid, 'ae0984c9-2fdb-4450-9c7d-56597deb444d'::uuid),
  ('5266ed59-473a-42fa-af31-c8ef08bd362a'::uuid, 'ae0984c9-2fdb-4450-9c7d-56597deb444d'::uuid),
  ('882e4e52-ceb3-43f0-9097-ca25e2b7a9d4'::uuid, 'a2e1d1a3-b4ee-48d3-98b9-bfb9534f5345'::uuid),
  ('6a658714-4f61-44a6-b43c-83506ca12790'::uuid, 'a2e1d1a3-b4ee-48d3-98b9-bfb9534f5345'::uuid),
  ('5245b61a-b105-450d-b0a9-9a7e7ffaff07'::uuid, 'a2e1d1a3-b4ee-48d3-98b9-bfb9534f5345'::uuid),
  ('191b9ef7-619b-4146-9386-ce1c78893905'::uuid, 'e466cece-d226-434c-aa80-978e494c27f3'::uuid),
  ('b4a556b6-f8fb-4882-8f6c-f1cd91d87036'::uuid, 'e466cece-d226-434c-aa80-978e494c27f3'::uuid),
  ('3627b81c-1f05-4669-94f2-2c8a9d81cfc3'::uuid, 'e466cece-d226-434c-aa80-978e494c27f3'::uuid),
  ('b868c0cf-dc34-4f4d-b25f-0516d95b07c9'::uuid, 'e466cece-d226-434c-aa80-978e494c27f3'::uuid),
  ('c6271cc7-8c2b-47d0-9123-dc6d1e2ed1cc'::uuid, 'ebe83c21-b997-4bc5-95a0-bd573ddcf064'::uuid),
  ('980d9260-e5d4-493b-9c05-f687f942a7e4'::uuid, '99be8779-0525-4a1d-854d-dbe8d1f08267'::uuid),
  ('8bae0ee4-b8d5-4f33-9f0f-0acb550cc328'::uuid, '4b5d8a3d-6240-4cab-be9a-223d7e9c8505'::uuid),
  ('917d2b90-22ef-4a87-a126-ad85d29165ad'::uuid, '92e2af84-5bea-4b7d-854d-11a701eda009'::uuid),
  ('a4d02b7e-b8b5-4fe7-93c0-4aff9f9b7968'::uuid, 'b474f557-b996-4736-aab5-177334b50878'::uuid),
  ('b5a21592-946c-4d62-8f45-d438cb31c0dd'::uuid, 'b474f557-b996-4736-aab5-177334b50878'::uuid),
  ('4e9ce88c-8330-44d1-8db0-972974414d28'::uuid, 'b474f557-b996-4736-aab5-177334b50878'::uuid),
  ('1f1aec3a-6a72-46d8-8419-3f2f89c56393'::uuid, 'b474f557-b996-4736-aab5-177334b50878'::uuid),
  ('0d439a38-08a5-4962-b602-a72deaf56901'::uuid, 'b474f557-b996-4736-aab5-177334b50878'::uuid),
  ('71df6835-ecc3-4271-ac43-397007a5d7cd'::uuid, '6786ac6a-e359-4b15-bfce-b3cc61998636'::uuid),
  ('00a159ab-fbbc-449f-88ee-9672b4a0e0a6'::uuid, '4ec44ea0-4a60-40bc-ad2e-0ca4efa04962'::uuid),
  ('919f380f-273f-4ea1-a545-356f6e027c73'::uuid, '4ec44ea0-4a60-40bc-ad2e-0ca4efa04962'::uuid),
  ('111a6af2-7ff4-4065-9f43-27628a730827'::uuid, '4ec44ea0-4a60-40bc-ad2e-0ca4efa04962'::uuid),
  ('f6c5550e-5efe-48b8-a8ea-ed5186f0f51d'::uuid, 'f0d912cf-2189-409c-94f1-49b0387f30b2'::uuid),
  ('77a52a12-ad1c-4cce-8ea3-a04fffecf38f'::uuid, 'f0d912cf-2189-409c-94f1-49b0387f30b2'::uuid),
  ('6e08b167-4a69-4a2f-abbf-9f9632071d15'::uuid, 'db6003ea-82cd-4738-b61c-4d14a17b6618'::uuid),
  ('ffdada99-621e-4390-b75f-211ced7db149'::uuid, 'db6003ea-82cd-4738-b61c-4d14a17b6618'::uuid),
  ('d5cdea4c-c51a-4fb7-bd3b-4f0179879a7c'::uuid, '858ae748-1158-4544-bdd0-3809c96f1a6e'::uuid),
  ('8340cba5-43a8-4206-b782-906dd2e7ba50'::uuid, '4258d669-83b8-4f94-8db6-7fe8f5c219b4'::uuid)
)
update public.workout_exercises we
set exercise_id = p.keep_id
from pairs p
where we.exercise_id = p.drop_id;

-- ---------------------------------------------------------------------------
-- 2c. Delete the now-unreferenced rows. Cascades to exercise_body_parts —
--     harmless, the surviving exercise already carries equivalent tags.
-- ---------------------------------------------------------------------------
with pairs (drop_id, keep_id) as (
  values
  ('36da63db-64b7-4a4d-bf36-89f91f793aab'::uuid, 'ed5283a9-4170-4115-b77d-db0dd086d47a'::uuid),
  ('892a2864-dd88-4895-9153-9bd6bfb8b3e4'::uuid, 'ed5283a9-4170-4115-b77d-db0dd086d47a'::uuid),
  ('848af0ff-91e3-4f38-b4d6-ab941c26bb7f'::uuid, 'fef1229f-5858-44b0-a36e-082e05c73aa3'::uuid),
  ('13b108db-f802-4203-a329-7951f678146d'::uuid, 'a4185d4b-cf20-46e6-b3b4-2b7837999fa4'::uuid),
  ('2a9aa3d0-ad18-4bf9-8f71-74c45106ca8c'::uuid, 'a4185d4b-cf20-46e6-b3b4-2b7837999fa4'::uuid),
  ('a8047426-20d2-4ffc-8ddc-77524b0c13fe'::uuid, '82e85e8b-046e-4680-8f6e-e50da1481ad3'::uuid),
  ('9725d1ed-faf6-4229-849d-a8e09d03ac69'::uuid, '0ab86962-cd40-43f1-8ff2-5a95814bf394'::uuid),
  ('3665e570-77a4-43dd-bac1-4a1624acee3a'::uuid, '4258d669-83b8-4f94-8db6-7fe8f5c219b4'::uuid),
  ('a87b0212-81ea-4e80-aa0e-84f21d2de966'::uuid, '4258d669-83b8-4f94-8db6-7fe8f5c219b4'::uuid),
  ('8a49f5b5-b449-4f90-8fd0-336e4a93b280'::uuid, '4258d669-83b8-4f94-8db6-7fe8f5c219b4'::uuid),
  ('9c7ad347-15d4-4c7d-a4a7-bab00a5e35e7'::uuid, '4258d669-83b8-4f94-8db6-7fe8f5c219b4'::uuid),
  ('6b878625-1c41-4084-b5e0-a448f4b03fda'::uuid, '31fb5334-6049-453d-888f-a1009c47407c'::uuid),
  ('ea540b4c-344c-4b04-8662-f7727457cf19'::uuid, '31fb5334-6049-453d-888f-a1009c47407c'::uuid),
  ('ae408177-a571-45b2-b9a6-785f04f2f5b6'::uuid, '31fb5334-6049-453d-888f-a1009c47407c'::uuid),
  ('4f891219-97a2-4f78-b3f8-eb3012fce7ed'::uuid, 'af57db77-22a8-42a0-9a73-406e930c0e36'::uuid),
  ('77074a27-9e1b-4412-af04-f31439a89040'::uuid, '48aa1405-e0ac-42c1-a7ac-1ba17e88a09c'::uuid),
  ('25dab058-7ca6-465d-8f19-8ccf8a5c293f'::uuid, '48aa1405-e0ac-42c1-a7ac-1ba17e88a09c'::uuid),
  ('3fa5add6-b833-478e-a108-cd5c20681a87'::uuid, '6315517e-eb83-450a-a17a-0ec926a33ee8'::uuid),
  ('e8c7ebe3-a81d-4544-adc3-f8a2ade323be'::uuid, '6315517e-eb83-450a-a17a-0ec926a33ee8'::uuid),
  ('e4b6f240-8598-46e9-87aa-c1f75099c4c9'::uuid, '6315517e-eb83-450a-a17a-0ec926a33ee8'::uuid),
  ('811e2c11-4668-408a-821c-2056600ef5e8'::uuid, '4c93055b-6a25-4e02-b2f7-79a4696d696c'::uuid),
  ('647d91e5-08f9-4ef6-b4c7-625be0108af9'::uuid, 'fd622b97-312e-4843-bf5f-a2382af8709f'::uuid),
  ('3590baed-97dc-4827-9f8c-6bccbd080349'::uuid, 'fd622b97-312e-4843-bf5f-a2382af8709f'::uuid),
  ('f9c10ddb-5cd2-4cea-b2fa-d45017e672ca'::uuid, '196c3cde-1afb-4c9f-b092-eced815babc0'::uuid),
  ('d6eadc49-10ef-45a3-98d0-4d7498b9cbba'::uuid, '52207c5a-5057-4a19-ba0a-29a45de976d0'::uuid),
  ('c4606947-ce9c-46d5-ac63-373066bcac70'::uuid, 'e479b2f5-a0dd-4c6a-ab3a-3b2c86813b37'::uuid),
  ('fc21dcf3-5888-4239-a1aa-561f68c0401c'::uuid, '53e61d8d-450a-4344-84db-c3773363f23b'::uuid),
  ('8aa4684c-d9e3-45f5-9481-272221efebc7'::uuid, '095ddec9-8ddd-415e-90f9-f2f511c90d3f'::uuid),
  ('80524e55-49bf-4ed8-9db4-6c4ebb332638'::uuid, 'e614adb7-64ab-4a7d-ba44-d270d6c58553'::uuid),
  ('b813d748-a8d7-46ac-8523-b5ad58c7f6dc'::uuid, 'e614adb7-64ab-4a7d-ba44-d270d6c58553'::uuid),
  ('fcc7331d-6898-44b5-92c5-2d42de487a43'::uuid, 'b05f9018-bb26-443e-9a16-ec9d9e7eff54'::uuid),
  ('242c6159-2f8f-442e-b7a5-6cf03ed76b5c'::uuid, 'b05f9018-bb26-443e-9a16-ec9d9e7eff54'::uuid),
  ('963c2b3b-837c-4f50-b51c-ac8f224f8e91'::uuid, 'b05f9018-bb26-443e-9a16-ec9d9e7eff54'::uuid),
  ('b6dd7dba-d542-4d31-9ee9-bf50a38883c2'::uuid, 'b05f9018-bb26-443e-9a16-ec9d9e7eff54'::uuid),
  ('23b4f60b-84de-4f4c-aa03-4c1b2bf787d3'::uuid, 'b05f9018-bb26-443e-9a16-ec9d9e7eff54'::uuid),
  ('36766220-182b-4e24-8439-ee4276f19879'::uuid, '61bbbd24-b9f3-4c74-bda9-6e91af7fa279'::uuid),
  ('dbbd1d4a-e513-4d17-b17b-d5cf81eda790'::uuid, '2445312f-705d-4190-9bcb-38ebb00d1f24'::uuid),
  ('730309b6-0bba-4468-82fc-89f174b15436'::uuid, '2445312f-705d-4190-9bcb-38ebb00d1f24'::uuid),
  ('a69aeaec-2732-4650-90bb-c3144f51ba01'::uuid, '31bd9c62-b8c5-484f-8d9c-6cfaa1bb74cd'::uuid),
  ('b010e629-49bb-429d-9f00-1b3280c708bd'::uuid, '49e7aee4-551a-4504-b225-dd09a19e0741'::uuid),
  ('aa778018-776d-4a23-9b0e-d02b31c370af'::uuid, '49e7aee4-551a-4504-b225-dd09a19e0741'::uuid),
  ('a83ac163-ce97-4005-8532-85773cd36e67'::uuid, '49e7aee4-551a-4504-b225-dd09a19e0741'::uuid),
  ('b0d77d55-e3d5-4e95-954d-ea77ccfc1834'::uuid, '49e7aee4-551a-4504-b225-dd09a19e0741'::uuid),
  ('358df524-c85b-469e-a973-f718b2b5f267'::uuid, '49e7aee4-551a-4504-b225-dd09a19e0741'::uuid),
  ('bef86e63-4016-4cc8-976d-e7c4fa4d3925'::uuid, '49e7aee4-551a-4504-b225-dd09a19e0741'::uuid),
  ('2d58d0b0-d47c-47c5-8d9d-8f86c1b1e155'::uuid, '49e7aee4-551a-4504-b225-dd09a19e0741'::uuid),
  ('0700a956-9015-47e1-80d5-33343ae43ad3'::uuid, 'f348703e-b281-4186-9825-9243370810f0'::uuid),
  ('74561a3a-ceaa-400e-967f-593cf6bc4437'::uuid, 'f8c614c4-5945-4947-becd-eb2e3f24a2cc'::uuid),
  ('ea6134cf-934e-469f-a364-70ad86cbac2c'::uuid, 'ae0984c9-2fdb-4450-9c7d-56597deb444d'::uuid),
  ('5266ed59-473a-42fa-af31-c8ef08bd362a'::uuid, 'ae0984c9-2fdb-4450-9c7d-56597deb444d'::uuid),
  ('882e4e52-ceb3-43f0-9097-ca25e2b7a9d4'::uuid, 'a2e1d1a3-b4ee-48d3-98b9-bfb9534f5345'::uuid),
  ('6a658714-4f61-44a6-b43c-83506ca12790'::uuid, 'a2e1d1a3-b4ee-48d3-98b9-bfb9534f5345'::uuid),
  ('5245b61a-b105-450d-b0a9-9a7e7ffaff07'::uuid, 'a2e1d1a3-b4ee-48d3-98b9-bfb9534f5345'::uuid),
  ('191b9ef7-619b-4146-9386-ce1c78893905'::uuid, 'e466cece-d226-434c-aa80-978e494c27f3'::uuid),
  ('b4a556b6-f8fb-4882-8f6c-f1cd91d87036'::uuid, 'e466cece-d226-434c-aa80-978e494c27f3'::uuid),
  ('3627b81c-1f05-4669-94f2-2c8a9d81cfc3'::uuid, 'e466cece-d226-434c-aa80-978e494c27f3'::uuid),
  ('b868c0cf-dc34-4f4d-b25f-0516d95b07c9'::uuid, 'e466cece-d226-434c-aa80-978e494c27f3'::uuid),
  ('c6271cc7-8c2b-47d0-9123-dc6d1e2ed1cc'::uuid, 'ebe83c21-b997-4bc5-95a0-bd573ddcf064'::uuid),
  ('980d9260-e5d4-493b-9c05-f687f942a7e4'::uuid, '99be8779-0525-4a1d-854d-dbe8d1f08267'::uuid),
  ('8bae0ee4-b8d5-4f33-9f0f-0acb550cc328'::uuid, '4b5d8a3d-6240-4cab-be9a-223d7e9c8505'::uuid),
  ('917d2b90-22ef-4a87-a126-ad85d29165ad'::uuid, '92e2af84-5bea-4b7d-854d-11a701eda009'::uuid),
  ('a4d02b7e-b8b5-4fe7-93c0-4aff9f9b7968'::uuid, 'b474f557-b996-4736-aab5-177334b50878'::uuid),
  ('b5a21592-946c-4d62-8f45-d438cb31c0dd'::uuid, 'b474f557-b996-4736-aab5-177334b50878'::uuid),
  ('4e9ce88c-8330-44d1-8db0-972974414d28'::uuid, 'b474f557-b996-4736-aab5-177334b50878'::uuid),
  ('1f1aec3a-6a72-46d8-8419-3f2f89c56393'::uuid, 'b474f557-b996-4736-aab5-177334b50878'::uuid),
  ('0d439a38-08a5-4962-b602-a72deaf56901'::uuid, 'b474f557-b996-4736-aab5-177334b50878'::uuid),
  ('71df6835-ecc3-4271-ac43-397007a5d7cd'::uuid, '6786ac6a-e359-4b15-bfce-b3cc61998636'::uuid),
  ('00a159ab-fbbc-449f-88ee-9672b4a0e0a6'::uuid, '4ec44ea0-4a60-40bc-ad2e-0ca4efa04962'::uuid),
  ('919f380f-273f-4ea1-a545-356f6e027c73'::uuid, '4ec44ea0-4a60-40bc-ad2e-0ca4efa04962'::uuid),
  ('111a6af2-7ff4-4065-9f43-27628a730827'::uuid, '4ec44ea0-4a60-40bc-ad2e-0ca4efa04962'::uuid),
  ('f6c5550e-5efe-48b8-a8ea-ed5186f0f51d'::uuid, 'f0d912cf-2189-409c-94f1-49b0387f30b2'::uuid),
  ('77a52a12-ad1c-4cce-8ea3-a04fffecf38f'::uuid, 'f0d912cf-2189-409c-94f1-49b0387f30b2'::uuid),
  ('6e08b167-4a69-4a2f-abbf-9f9632071d15'::uuid, 'db6003ea-82cd-4738-b61c-4d14a17b6618'::uuid),
  ('ffdada99-621e-4390-b75f-211ced7db149'::uuid, 'db6003ea-82cd-4738-b61c-4d14a17b6618'::uuid),
  ('d5cdea4c-c51a-4fb7-bd3b-4f0179879a7c'::uuid, '858ae748-1158-4544-bdd0-3809c96f1a6e'::uuid),
  ('8340cba5-43a8-4206-b782-906dd2e7ba50'::uuid, '4258d669-83b8-4f94-8db6-7fe8f5c219b4'::uuid)
)
delete from public.exercises e
using pairs p
where e.id = p.drop_id;
