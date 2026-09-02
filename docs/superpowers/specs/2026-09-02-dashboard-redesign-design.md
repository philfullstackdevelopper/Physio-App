# Dashboard redesign

## Purpose

Today's dashboard (`app/dashboard/page.tsx`) is a pure triage inbox: patients
with concerning pain/difficulty feedback, and patients with no recent
session. Most days both lists are empty, so the one screen every login lands
on is often just a greeting. Redefined purpose: a **"danger + fix it" triage
feed** — ordered by urgency, and every item points at a concrete next step,
not just a link to go read more elsewhere.

Depends on the two-way-messaging spec (`2026-09-02-two-way-messaging-design.md`)
for its first section — build messaging first.

## Content, in order

### 1. Unread messages (new)

Patients with at least one row where `sender = 'patient' and
read_by_instructor_at is null`, most recent message first. Each row: patient
name, message preview (truncated to one line), relative timestamp → links to
`/dashboard/patients/{id}` (the thread view). Deliberately kept as a plain
link-list matching the existing alert idiom — no inline compose box on the
dashboard itself; that would turn a triage view into an inbox, which is more
than this screen's job.

### 2. Programs to reconsider (enriches today's "patients à surveiller")

Same underlying signal as today (`assessSignals` in
`lib/exercise/stageProgress.ts` — pain/difficulty averages over recent
`patient_feedback` rows), with one addition: attribute the concerning signal
to the specific séance responsible, using the `workout_id` column
`patient_feedback` already has.

Algorithm: among the `patient_feedback` rows that fed a "concerning"/"severe"
verdict (the same rows already queried for `painScores`/`difficulties`),
group by `workout_id` and find the one with the most qualifying bad ratings
(`pain_score >= PAIN_HOLD` or `difficulty >= DIFF_HOLD`, the existing
constants). If one séance clearly stands out, resolve its name and render the
row as e.g. *"Marie B. — douleur élevée (7.5/10) sur « Réveil lombaire »"*,
linking primarily to `/dashboard/seances/{workout_id}` (edit that séance) with
a secondary, smaller link to the patient profile for context. If the bad
ratings are spread across several different séances with no single
standout (e.g. top two workouts are within one rating of each other), fall
back to today's behavior: link only to the patient profile, no attribution
claimed. Never guess a séance attribution the data doesn't support.

### 3. Inactive patients, with a one-click encouragement action (enriched)

Same list as today (no session in 7+ days, account older than a week). Each
row gains a secondary "Encourager" button next to the existing patient link.

- **Message**: fixed, not editable — one good default, personalized with the
  patient's first name, e.g.:
  > "Bonjour {firstName}, ça fait quelques jours qu'on ne vous a pas vu·e sur
  > vos exercices. Une petite séance aujourd'hui vous ferait sûrement du
  > bien !"
- **Action**: a new server action `sendEncouragement` (co-located with the
  dashboard, e.g. `app/dashboard/actions.ts`) that inserts a `patient_messages`
  row (`sender: 'instructor'`, the fixed body above) for the given
  `patient_id`, re-validated by RLS exactly like the existing `sendMessage`
  action. Unlike the plain `(formData) => void` actions used elsewhere in the
  app (which redirect and are called directly as a form's `action`), this one
  is driven through `useActionState` and so needs that hook's signature:
  `sendEncouragement(prevState: { sent: boolean } | null, formData: FormData):
  Promise<{ sent: boolean } | { error: string }>` — it returns state instead of
  redirecting, since the dashboard should not navigate away on send.
- **Feedback, no new dependency**: no toast library is installed and one
  button doesn't justify adding Sonner. A small client component
  `EncourageButton` calls `useActionState(sendEncouragement, null)`, passes
  the returned `formAction` to the form, and reads `pending`/`state` from the
  hook to show "Encourager" at rest, "Envoi…" while pending (matching the
  `SubmitButton` pattern already built), and "Envoyé ✓" (disabled) once
  `state?.sent` is true — entirely inline, no page navigation, no toast.
- Does **not** remove the underlying inactive-patient from the list on send
  (they're still inactive until they train again) — only the button's own
  state changes, so re-sending isn't blocked if the kiné visits again days
  later and they're still inactive.

### Unchanged

The small stats line (patient count / active this week / sessions this
week) stays as a lightweight header.

## Data flow

`app/dashboard/page.tsx` (server component) gains two more queries alongside
its existing `Promise.all` batch:
- unread patient-authored messages (join `patients` for name)
- `patient_feedback` rows already queried for `assessSignals`, now also
  selecting `workout_id`, plus one query to resolve the standout workout's
  `name` for rows that need it

No new tables beyond the messaging migration; this page reads what that
migration adds.

## Testing

- Attribution: a patient with bad ratings concentrated on one séance shows
  that séance's name and links to it; a patient with bad ratings spread
  across several séances falls back to the patient-profile link, not a wrong
  guess.
- Unread-messages section reflects `read_by_instructor_at`, and disappears
  once the instructor opens that thread (per the messaging spec's read-marker
  action).
- `EncourageButton`: pending → sent state transition, re-sendable on a later
  visit, RLS still enforced server-side (can't encourage another
  instructor's patient).

## Out of scope

- Any new charts/analytics/trend view (PRODUCT.md explicitly excludes this).
- Editable or multi-template encouragement messages.
- Removing a patient from "inactive" immediately after encouraging them.
