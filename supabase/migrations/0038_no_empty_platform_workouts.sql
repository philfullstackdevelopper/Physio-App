-- Physio-App — Migration 0038: platform template workouts must have exercises
--
-- Rule: a platform template workout (created_by is null) with zero exercises
-- is not a usable séance — it offers an instructor nothing to duplicate. This
-- deliberately does NOT apply to instructor-owned workouts ("mine"): those
-- are created empty on purpose by the "Créer et composer" flow (create the
-- workout row, then redirect the instructor to add exercises to it), so an
-- instructor's own in-progress séance must be allowed to sit at 0 exercises
-- indefinitely.
--
-- 1. One-time cleanup: of 202 currently-empty workouts (live count at
--    authoring time), 196 are platform templates with no patient history.
--    The other 6 are excluded on purpose:
--      - 4 are instructor-owned ("mine") — never touched by this rule.
--      - 2 are platform templates that DO have real workout_logs rows
--        attached (patients who completed a session before its exercises
--        got orphaned by an earlier cleanup) — deleting the workout would
--        cascade-delete that patient history, which nobody asked for.
--        Left alone; needs a human decision (re-populate exercises, or
--        decide the log/workout can go), not an automatic delete.
--
-- 2. Going forward: a trigger enforces the same rule automatically whenever
--    a workout_exercises row is deleted (e.g. an exercise gets dropped
--    upstream and cascades) — if that leaves a platform template at 0
--    exercises AND it still has no workout_logs, the now-empty template is
--    removed. Same collateral-damage guard as the one-time cleanup: a
--    platform template with real patient history is never auto-deleted.

-- ---------------------------------------------------------------------------
-- 1. One-time cleanup — delete the 196 empty, log-free platform templates.
-- ---------------------------------------------------------------------------

delete from public.workouts where id in (
  '00685945-4a57-473d-a6c3-409d38ea85fb',
  '009b424f-395b-4be2-85b9-1c5a45bb628f',
  '021dc1ad-4d96-48d5-80cc-5adbf3f63b77',
  '02a7fe63-2d2b-49cb-af2c-11ebdc9e2abd',
  '05867e36-a726-4583-88c6-6f825ee819a9',
  '086bc27c-2ea0-4620-8404-1d88e53ec63b',
  '093e3724-419d-4f25-b57c-8cb9f329d757',
  '0a530ece-b68b-49a5-a3e2-df9a2d2aca1c',
  '0b23654b-b252-4342-ac88-b062a4a346e1',
  '0bf4d41d-6df2-4a6d-ad8f-e685f90dd887',
  '0d53942c-d425-4eee-88fb-1575b535a441',
  '1734739c-9f0c-475a-ad50-c8f17d658445',
  '1c41d292-9650-4481-b6e1-cfe3b05ace94',
  '1def446c-c26d-4e83-ba7e-85953b679308',
  '1e6b6d25-2d61-4284-8bf7-66708913b766',
  '2032a78a-553d-4912-8291-230e1e064e7b',
  '2058a391-6104-4311-badd-a8146d166df3',
  '23737cc6-92e6-43b9-89da-b1b0d290a5d2',
  '243bad44-7163-436f-b4af-e89b3876d7fc',
  '293d817a-b4b0-42c2-9676-2a896d491601',
  '29cc7795-fae9-4985-96d6-bb8d0a34047b',
  '2b75bc6a-4de3-434d-ba32-2e34cbec4086',
  '2ba36099-da73-46b1-9457-231f8546ea6f',
  '2cf63c1b-8382-4745-88b3-816fa495b79a',
  '2da56789-d2b9-4b51-b196-7e3ed74e7787',
  '2dcd4b47-311e-4537-b7bb-25d8fcd2e495',
  '304ce8ac-0eca-4aa4-9254-32832759d1d4',
  '330a94c3-f159-43c2-9720-5a8ec552b019',
  '336f55c0-3532-4a3f-a852-9208e282d9d6',
  '34436993-fd96-409d-bed9-196a1be2af06',
  '38775ded-e024-496e-a882-83d87a476e28',
  '38995e01-2bcd-4914-a357-2d60462da11c',
  '3c8ef8cf-f022-4500-a8de-9a8ad8eafc83',
  '3cc943ab-d2bc-4c21-95ca-a89736974ff1',
  '3deb2aff-347e-422d-a5f0-556c8b7791f8',
  '3e152d70-8222-478e-9f76-bec10bc35096',
  '3e53c98b-8ca0-4321-8c9c-a18268cc7dc2',
  '3eb7aaee-53dd-44bb-9006-7aca6918bce7',
  '3f0fc5e7-2906-4425-9c49-ef3fd4a36d32',
  '3fb7e609-d6bf-49f6-a8f4-d5b2f395b65d',
  '405f3897-e8e8-4b60-8d6b-8a3c6958b15b',
  '430bb0bf-f172-4833-8e80-b58e314002e6',
  '46564d76-1c26-4187-8a02-bb9d2c08c3b0',
  '485b059d-c469-4892-8235-4e6d7e73ef23',
  '4887e2de-eb1b-4eb6-802d-930dd8783839',
  '491b2c2f-a4b2-4ece-b8ab-44321e02969d',
  '4b9f83d6-6857-4be2-8520-86dc42bdbcc4',
  '4d0b1dab-8902-453d-a1b5-b1a656c924da',
  '4d2a5a4b-ec26-492f-9fca-9ed95bcea4ec',
  '4f74856b-34c5-404b-9b7c-ec1af14997fb',
  '5030239f-6daf-4eda-bb43-29e3747ea33c',
  '52666491-5bf7-443a-8b6c-25ec918f7004',
  '5316597c-92ba-42e7-93b3-8b862fa00298',
  '56074dc7-9f0e-48d2-8eeb-6abe7e66d03a',
  '568adef7-8cc7-4347-8d00-682da0963a6c',
  '56c6a862-c97d-40d1-a24a-6d4f3df20fda',
  '57925bcf-854e-4ed1-9c1b-7b7195e7eed2',
  '587671a4-b7c3-4d78-bf72-018d01f19432',
  '5900cbf1-7d80-4957-9863-b78e40f016a9',
  '5927c6db-101b-4cfe-a9e2-dbe79f8dc4de',
  '5b93c9ef-ae58-4d6d-bcb6-2525dcaf0ea0',
  '5bbce760-223e-4792-b6b2-3e44a17ad75b',
  '5d183e5b-07f4-4487-92a9-5cc355e32a15',
  '5d89af36-b342-480d-94cc-f41a691f26c0',
  '5f2cfe0c-f2ff-48ed-b2fe-903da5649a93',
  '5f999256-0daa-40a7-a6a7-4edfd18f0bfb',
  '6231117b-e8b5-4f52-ad5f-fe7722f13462',
  '6248e380-abdd-41a5-9c95-dc1a61d4f4c8',
  '624bd7b4-4b3c-4804-be27-bbf32a8ff310',
  '6458f532-97ee-460d-a270-0aa71230f7d4',
  '6460eb7c-2898-4276-ab01-82756948f979',
  '64709aa8-2a4a-4f98-b451-b997cefcab66',
  '6534dce4-4b62-4c1e-af78-32d6080c6dec',
  '65de37f1-589d-44b2-8d8c-a472908bfa44',
  '663be2e0-a354-426d-842e-7bb1b73010cf',
  '683c3a2e-cac6-47d2-ba91-e00140d2e478',
  '686c3a5c-5f04-4ea8-aecb-3d2767152738',
  '6adba12e-d879-4d96-96b9-c724f8abc5cd',
  '6affdc92-5b58-4689-9b6b-4c764e0ca511',
  '6b78481a-c070-4f67-933d-19e4d9cf5fa3',
  '6b9a334d-776d-47e3-bb58-8b35a72ea0a4',
  '6c995753-9eaa-4569-8b84-fc9d65fc2de7',
  '6caf0354-c109-4e77-b3d3-a3ea9b8f4274',
  '6d4cebd0-cf2c-4a84-b18c-e802bcadbc3e',
  '6e61d584-f1de-4102-9b5b-4805ff6f5013',
  '7400b086-ca1f-4818-9eab-fb85c67ac3e0',
  '74f2776d-e7c2-47ca-9c55-1fd1f2745dad',
  '752c83f8-695d-4eb7-af84-fa8abe53c6a2',
  '75d43b04-1b06-4724-87df-6bc699424c8f',
  '77911377-e871-4ddd-af2f-6b79cf152bc0',
  '779450e1-4634-41d1-a46f-62fd5d8b3f84',
  '790b4702-21c6-4d3e-bc7f-0891727ad944',
  '79438a61-b1e2-45c5-bfa7-11ef89fb26bc',
  '79e6f0f3-9f16-49b5-8a37-558f163e89f3',
  '7c229137-fe58-40f1-a4c8-3332fb849047',
  '7cfa392d-aede-4327-a7ee-f3d04b238a46',
  '7e103306-41fb-4d78-b792-06f304cb5b06',
  '8022d4e8-c36d-4964-af14-952a75ade42c',
  '80818146-c64e-41d2-90fe-2a861d75de6d',
  '80dbaeb1-aa16-4f5c-9dd3-b01704427974',
  '825593eb-5aaa-471c-9848-a4d7b7ec011a',
  '82ead172-5f6d-45c7-a317-e4b4a1b431cb',
  '83248b53-117e-4329-92dd-f53d0c49a6d8',
  '84668f47-8252-4485-9af2-1d3653de5223',
  '84a8fd4e-5600-47d4-b00b-3e7491b756a4',
  '855da264-e289-4076-b538-e4d9cbbdac4d',
  '88ffb84e-0d9b-4111-8e0d-518c5609f24e',
  '89deb483-9473-46ec-96d5-f4fd363101e3',
  '8a43c9a2-e394-4543-b3e7-6727bb815355',
  '8a634c6c-ad7a-4a70-8961-17b41803d15d',
  '8ae92813-27d6-418f-b7c6-1469386b4f0f',
  '8c7bb134-d49c-43ae-8b72-a2e7d794af80',
  '8f570a71-87b0-4960-b73a-3f12c1d0a47a',
  '8fda53e8-4f08-4a6a-9da5-957c60ccb83d',
  '90ead7c7-c873-4daf-b677-9a84c0014f1e',
  '93a17b0a-ab9f-493a-a213-ae5e39822de0',
  '94fbbfe0-ea5c-4bb8-8d34-56791a017d8c',
  '96b7b421-37d2-4946-8dfd-05c51fb60304',
  '98fa71ed-975e-47b1-9a8a-a699578db82d',
  '9a47f202-a356-4501-a3c4-7fee5da1f456',
  '9a5d4f95-8057-4527-a283-3bb2749373f6',
  '9a992678-a697-4483-882f-a6b3fa3b2a18',
  '9b50946c-1346-4cc5-80fd-99df29dbd465',
  '9d610298-762f-48ae-8052-a373d10edba4',
  'a0fde3eb-4799-43c0-935d-d78616ab18a4',
  'a1b07edf-9d69-4569-8c68-fbc7da18c097',
  'a220cfb7-e263-49ae-85a1-8f5a5ac974ef',
  'a37bf561-6a96-49a3-a998-dec36780852c',
  'a4b89017-f135-4e08-96ed-92c33c1bc619',
  'a8d245b9-643b-4b62-b2d7-ecf1f1a92fe5',
  'a927a5c6-1194-42c5-847c-b13984f10335',
  'aa42cc20-c83f-4d5f-871d-0c6b309e4262',
  'aa6e51d0-af14-43f1-9e85-e93fb81f8b32',
  'ac3bbf8e-92f2-4de8-91dd-b55d950dc58c',
  'ada4a494-faba-4682-85b0-ad15c660894b',
  'ae0c75a9-53d8-45aa-b4ee-6be73d667e86',
  'aefbc3f1-832e-4abd-aa47-3524503f40df',
  'b0a4692f-520a-4cda-b136-896af55ddfac',
  'b139d29e-cf57-4405-95aa-780d49511dbe',
  'b8687d1e-08ba-4640-8761-2e8c363ae721',
  'b932ae75-c921-4f06-b4e7-0f9d5a7e1b2a',
  'ba00c4f1-d5aa-43ac-97d4-2b9b274b00c5',
  'ba0accbe-5d8d-497b-bcef-99c936a55aa4',
  'bba53b2b-cf7b-4f86-8ff5-3d2d84fe40e1',
  'bc2d6ae0-09c1-42cb-92e5-386b07f8ca78',
  'bceebb61-2037-4b68-b085-637d757f479d',
  'bdef4445-fdf4-42d5-be30-3823ab55d0ee',
  'c22d5eda-fb7c-4917-a660-9cd153a24bac',
  'c27894f8-c92a-4ae2-a069-6e71c062f8c0',
  'c294c6ef-ceee-4dfc-b2e2-db9531b55eb2',
  'c4254443-aea5-4797-97c2-8badc39fed16',
  'c4eb219b-10b3-4869-a7c0-bc5f9b603652',
  'c53adbd3-045b-421f-99eb-d1587f11e897',
  'caadf23a-5902-47e3-9e65-6820c0d977aa',
  'cd527e7c-9dc6-4d43-b9cc-1c21d338c64a',
  'cd5bf49c-95d4-4e3f-9279-cc969dfd5c70',
  'cd5fc1e4-6d2a-45e4-bb15-2a7ccdf0b349',
  'cdda6b6b-bc7e-4762-8aa4-623bfcbbf3c3',
  'ce7975a6-9fec-4e0c-a171-a3fb063db54f',
  'cf79b134-455a-4427-b023-dc0514abea3a',
  'd010dc10-0c89-4e8d-8b34-663328d5b377',
  'd1f5c6ed-ba50-456a-a637-d3c8915728ee',
  'd20304d4-2bf6-4347-aa96-33f3c899a9e8',
  'd26973f4-8103-4ea8-9636-d4532fbaa780',
  'd4c7de08-4786-4a2c-bd4c-c587af969afb',
  'd5232cbc-3877-49ec-bb6b-943ef0fab048',
  'd8804753-5e5b-430c-b3fa-6544d971490d',
  'd99b9aa3-1b61-4039-bca6-acf4f0d3fa37',
  'dab72e70-5c6c-401a-bb55-20937c09d53f',
  'dbd4a547-c790-4ccd-9832-4e42e2c09881',
  'dd03675f-deaa-4662-b4b2-8dba1e986975',
  'df444956-9463-49b6-833e-a6eb7a14834c',
  'df6f0989-8b4d-441c-a04d-ae51550141c0',
  'e423b922-4863-4e60-8741-1f8e19f9bd8a',
  'e6605809-b2b6-4dc9-b889-1c552b2aa8a1',
  'e817f479-54ba-4bca-92e6-6ca170e679b8',
  'e84a4173-2e0e-4101-88b1-3573e293b955',
  'e869f489-4ad1-4c42-ac20-03011ab8fc42',
  'eac72231-ceb7-4737-9ee3-8bf07ab0a364',
  'eafbde4b-4f89-49ac-b50e-ffedfc4b5e65',
  'eb4173e7-4ddf-4994-add7-3678c8380e8a',
  'ebaa9285-0062-4184-ad68-680d59063229',
  'ee33d355-8628-464a-9186-9bea5b29937f',
  'f0d7548f-ec0a-43a8-8ff7-da94fef4253b',
  'f3c4bb2c-c552-42bc-8fd6-9d50ed402148',
  'f5e7d2ce-da0d-46c1-911c-0d1759056082',
  'f5f1a3de-4be0-4e76-b456-c6750bfd4398',
  'f68ca9c0-8ab4-49bc-a120-cc49e3c7c94d',
  'f6b1d5f3-af96-4ec8-a014-efbd6ac2e102',
  'f739c4fa-03f8-44df-83d3-9d43ba79182d',
  'f7deb42f-f03f-4afe-b9ac-c90c0fbb02df',
  'fb223bf2-599c-41d9-809d-76c60e915394',
  'feb22eb6-58f0-4d52-a1bc-603d9693126a',
  'fec98dcd-4a87-467c-bc7d-1c6e469d6f8a',
  'ff3c63ad-092e-4bae-bb90-2c6461ce5d71',
  'ffb90935-f3b7-4926-993c-912bcc787e6f'
);

-- ---------------------------------------------------------------------------
-- 2. Going forward: enforce it automatically.
-- ---------------------------------------------------------------------------

create or replace function public.cleanup_empty_platform_workout()
returns trigger
language plpgsql
as $$
begin
  -- Only platform templates (created_by is null) are auto-removed when
  -- empty. Instructor-owned workouts intentionally start empty during the
  -- "créer et composer" flow and must never be touched here. A platform
  -- template with real patient history (workout_logs) is also left alone —
  -- that needs a human decision, not a silent delete.
  delete from public.workouts w
  where w.id = old.workout_id
    and w.created_by is null
    and not exists (select 1 from public.workout_exercises we where we.workout_id = w.id)
    and not exists (select 1 from public.workout_logs wl where wl.workout_id = w.id);
  return old;
end;
$$;

drop trigger if exists trg_cleanup_empty_platform_workout on public.workout_exercises;
create trigger trg_cleanup_empty_platform_workout
after delete on public.workout_exercises
for each row
execute function public.cleanup_empty_platform_workout();
