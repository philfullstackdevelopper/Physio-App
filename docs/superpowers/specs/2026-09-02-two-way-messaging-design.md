# Two-way patient messaging

## Purpose

`patient_messages` today is one-directional: only the instructor can send, and
`read_at` tracks whether the *patient* has read it. PRODUCT.md and CLAUDE.md
both already describe messaging as bidirectional ("patient... message their
instructor"), but the schema never allowed a patient to insert a row — this is
doc/code drift, not a new idea. This spec closes that gap: patients gain the
ability to send a message to their own instructor, and the instructor gains a
way to see which threads have something new.

No rate limiting: patients are known to their kiné (this is not an open
public inbox), so a spam guard is explicitly out of scope for this pass.

## Schema change (migration `0039_two_way_patient_messages.sql`)

Extend the existing `patient_messages` table — a new `conversations` table
would be overkill for a fixed 1:1 kiné↔patient thread (YAGNI).

```sql
alter table public.patient_messages
  add column sender text not null default 'instructor'
    check (sender in ('instructor', 'patient')),
  add column read_by_instructor_at timestamptz;
```

- `sender` — who wrote the row. Existing rows all default to `'instructor'`,
  which is correct (they could only have been instructor-authored under the
  old RLS).
- `read_by_instructor_at` — a second, independent read-marker for the
  instructor's side of the thread. The existing `read_at` column is unchanged
  in meaning: it stays the patient-side "have I seen this" marker, and its
  existing RLS policy (`patient_messages_patient_mark_read`) is untouched.

## RLS changes

Add, alongside the existing policies (none of which are removed or altered):

```sql
-- A patient may insert a message to their own instructor.
create policy patient_messages_patient_write on public.patient_messages
  for insert to authenticated
  with check (
    patient_id = auth.uid()
    and sender = 'patient'
    and instructor_id = (select instructor_id from public.patients where id = auth.uid())
  );

-- The instructor may mark a thread read on their own side, nothing else.
create policy patient_messages_instructor_mark_read on public.patient_messages
  for update to authenticated
  using (instructor_id = auth.uid())
  with check (instructor_id = auth.uid());
```

The existing `patient_messages_instructor_write` policy already constrains
who can use it (`instructor_id = auth.uid()`), but must be dropped and
recreated (RLS policies can't be altered in place) to add one clause so an
instructor can never insert a row claiming to be patient-authored:

```sql
drop policy if exists patient_messages_instructor_write on public.patient_messages;
create policy patient_messages_instructor_write on public.patient_messages
  for insert to authenticated
  with check (
    sender = 'instructor'
    and instructor_id = auth.uid()
    and exists (select 1 from public.patients p
                where p.id = patient_messages.patient_id and p.instructor_id = auth.uid())
  );
```

This is the original policy's exact condition (migration `0015`) plus the
one added `sender = 'instructor'` clause — nothing else about it changes.

`patients.instructor_id` is a stable FK set at patient creation (CLAUDE.md
§3), so the subquery above is safe and matches the pattern already used by
`patient_messages_instructor_write`.

## UI changes

**Patient side** (`app/patient/*`): the existing message thread view gains a
compose box (a plain `<form action={sendPatientMessage}>` with a textarea and
submit button, styled consistently with the rest of the patient app) below
the existing read-only list. `sendPatientMessage` mirrors the existing
`sendMessage` server action in `app/dashboard/patients/[id]/actions.ts`, but
inserts with `sender: 'patient'` and no `instructor_id` lookup needed beyond
what RLS already re-validates.

**Instructor side**: `app/dashboard/patients/[id]/page.tsx`'s existing thread
view renders `sender` to align patient-authored bubbles differently from
instructor-authored ones (e.g. left/right, like the rest of the app's
existing `.rehab-panel` conventions — no new visual language needed, just a
conditional alignment/background). Opening a patient's thread also fires a
small action that sets `read_by_instructor_at = now()` on any unread rows in
that thread (mirroring `markMessageRead`'s pattern on the patient side).

**Dashboard**: a new top section listing patients with at least one message
where `read_by_instructor_at is null and sender = 'patient'`, most recent
first — this is what the dashboard-redesign spec consumes.

## Testing

- RLS: a patient can insert only into their own thread with `sender =
  'patient'`; attempting to insert with someone else's `patient_id`,
  `instructor_id`, or `sender = 'instructor'` must be rejected server-side (not
  just hidden client-side).
- A patient cannot set `read_by_instructor_at` (only the instructor's policy
  allows that column to move).
- Existing instructor-authored rows continue to work unchanged (regression
  check on the pre-existing `sendMessage`/`markMessageRead` actions).

## Out of scope

- Any rate limiting / anti-spam.
- Push/email notifications for new messages — visibility is via the
  dashboard's unread section only, checked when the kiné opens the app.
- Multi-thread or group conversations.
