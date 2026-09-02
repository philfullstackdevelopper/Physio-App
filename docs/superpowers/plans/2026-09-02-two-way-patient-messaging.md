# Two-Way Patient Messaging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a patient send a message to their own instructor (today only the instructor can send), and let the instructor see which threads have something new — closing the doc/code drift where messaging was already described as bidirectional but the schema never allowed it.

**Architecture:** Extend the existing `patient_messages` table with a `sender` column and a second, independent `read_by_instructor_at` marker (no new tables — one fixed 1:1 thread per patient). Add one RLS policy letting a patient insert into their own thread, and tighten the existing instructor-insert policy so it can't be misused to fake a patient-authored row. Both existing pages (patient home, instructor's patient-detail page) already render a message list; this plan extends each to be a real two-way thread (sender-aligned bubbles) and adds a compose box on the patient side. A small standalone query helper is added for the dashboard to consume later — it is not wired into the dashboard in this plan.

**Tech Stack:** Next.js 16 App Router (Server Components + Server Actions), Supabase Postgres + RLS, TypeScript, Tailwind CSS.

**Spec:** `docs/superpowers/specs/2026-09-02-two-way-messaging-design.md`

## Global Constraints

- No rate limiting / anti-spam on patient-sent messages (explicit in the spec).
- Never weaken an existing RLS policy — only add new ones or add a clause to the existing instructor-insert policy. The existing `read_at` column's meaning and policy are untouched.
- All UI text is French (CLAUDE.md project-wide rule).
- This repo has **no automated test runner** (`package.json` has no `test` script, no test files exist). Verification in this plan is: `npx tsc --noEmit` for type safety, `npx eslint <file>` for lint, an explicit set of manual SQL checks run in Supabase's SQL editor for RLS correctness (matching how every prior migration in this repo has been applied — `scripts/migrate.mjs` is explicitly "NOT YET USABLE" per its own header comment), and a manual browser click-through for UI. Do not invent a test framework or fabricate test files this project doesn't have.
- **Migration 0039 is written and committed by this plan, but applying it to the real Supabase database is a manual step for Philippe** (paste into Supabase Studio's SQL editor, matching every prior migration's documented method) — or, only with his explicit go-ahead in the moment, via the Supabase MCP `apply_migration` tool. Do not call `apply_migration` autonomously; this touches production data isolation (RLS) and is exactly the kind of action that needs a live confirmation, not a plan-level assumption.

---

### Task 1: Migration 0039 — schema + RLS

**Files:**
- Create: `supabase/migrations/0039_two_way_patient_messages.sql`

**Interfaces:**
- Produces: `patient_messages.sender` (`'instructor' | 'patient'`, not null, default `'instructor'`), `patient_messages.read_by_instructor_at` (nullable timestamptz). Both are consumed by every later task in this plan.

- [ ] **Step 1: Write the migration file**

```sql
-- Physio-App — Migration 0039: two-way patient messaging
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run. Safe to re-run.
--
-- ADDITIVE — extends patient_messages (migration 0015) so a patient can send
-- to their own instructor, not just receive. No new table: a patient has
-- exactly one instructor, so one thread per patient is all this ever needs.

alter table public.patient_messages
  add column if not exists sender text not null default 'instructor'
    check (sender in ('instructor', 'patient')),
  add column if not exists read_by_instructor_at timestamptz;

-- A patient may insert a message to their own instructor only.
drop policy if exists patient_messages_patient_write on public.patient_messages;
create policy patient_messages_patient_write on public.patient_messages
  for insert to authenticated
  with check (
    patient_id = auth.uid()
    and sender = 'patient'
    and instructor_id = (select instructor_id from public.patients where id = auth.uid())
  );

-- The instructor may mark a thread read on their own side only. This is a
-- new, separate policy from the existing patient_messages_patient_mark_read
-- (migration 0015), which is untouched and still governs the patient's own
-- read_at column.
drop policy if exists patient_messages_instructor_mark_read on public.patient_messages;
create policy patient_messages_instructor_mark_read on public.patient_messages
  for update to authenticated
  using (instructor_id = auth.uid())
  with check (instructor_id = auth.uid());

-- Re-create the existing instructor-insert policy (migration 0015) with one
-- added clause, so an instructor can never insert a row claiming to be
-- patient-authored. Everything else about this policy is unchanged.
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

- [ ] **Step 2: Self-check the SQL reads correctly**

Read the file back once. Confirm: the `alter table` uses `if not exists` on both columns (safe to re-run), every `drop policy if exists` is immediately followed by the matching `create policy` (never left dropped), and the check constraint on `sender` only allows the two documented values.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0039_two_way_patient_messages.sql
git commit -m "$(cat <<'EOF'
Add sender + read_by_instructor_at to patient_messages

Lets a patient insert into their own thread (RLS-checked against their
own instructor_id) and gives the instructor an independent read-marker,
without touching the existing patient-side read_at column or policy.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_011JRGK1q9vP21g7m98MeEx7
EOF
)"
```

- [ ] **Step 4: Apply the migration (Philippe only — not autonomous)**

Stop here and hand this file to Philippe to paste into Supabase Studio's SQL editor (Dashboard → SQL Editor → New query → paste the file's contents → Run), exactly like every prior migration in this repo. Do not call the Supabase MCP `apply_migration` tool without him explicitly asking for it in that moment.

- [ ] **Step 5: Manual RLS verification (run these in the SQL editor after applying, as the project owner)**

```sql
-- Existing rows must all have become sender='instructor' (the column default).
select count(*) from public.patient_messages where sender <> 'instructor';
-- Expected: 0

-- Confirm both new columns exist with the right types.
select column_name, data_type, is_nullable
from information_schema.columns
where table_name = 'patient_messages' and column_name in ('sender', 'read_by_instructor_at');
-- Expected: sender | text | NO, read_by_instructor_at | timestamp with time zone | YES

-- Confirm all four insert/update policies exist on the table.
select policyname, cmd from pg_policies where tablename = 'patient_messages' order by policyname;
-- Expected: patient_messages_instructor_mark_read (UPDATE), patient_messages_instructor_read (SELECT),
--           patient_messages_instructor_write (INSERT), patient_messages_patient_mark_read (UPDATE),
--           patient_messages_patient_read (SELECT), patient_messages_patient_write (INSERT)
```

---

### Task 2: Patient-side send action

**Files:**
- Modify: `app/patient/actions.ts`

**Interfaces:**
- Consumes: `patient_messages.sender`, `patients.instructor_id` (Task 1's schema).
- Produces: `sendPatientMessage(formData: FormData): Promise<void>` — a redirect-based server action, same calling convention as this file's existing `completeWorkout`/`markMessageRead`.

- [ ] **Step 1: Write the action**

Add to `app/patient/actions.ts` (after the existing `markMessageRead`):

```ts
// Patient sends a message to their own instructor. No rate limiting: patients
// are known to their kiné, this is not an open public inbox.
export async function sendPatientMessage(formData: FormData) {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const body = String(formData.get("body") ?? "").trim();
  if (!body) redirect(`/patient?error=${encodeURIComponent("Le message ne peut pas être vide.")}`);

  const { data: patient } = await supabase
    .from("patients")
    .select("instructor_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!patient?.instructor_id) {
    redirect(`/patient?error=${encodeURIComponent("Kiné introuvable.")}`);
  }

  const { error } = await supabase.from("patient_messages").insert({
    patient_id: user.id,
    instructor_id: patient!.instructor_id,
    sender: "patient",
    body,
  });
  if (error) redirect(`/patient?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/patient");
  redirect("/patient");
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors mentioning `app/patient/actions.ts` (pre-existing unrelated errors elsewhere in the repo are fine — see the messaging spec's own note that a handful of pre-existing errors are out of scope).

- [ ] **Step 3: Lint**

Run: `npx eslint app/patient/actions.ts`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add app/patient/actions.ts
git commit -m "$(cat <<'EOF'
Add sendPatientMessage server action

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_011JRGK1q9vP21g7m98MeEx7
EOF
)"
```

---

### Task 3: Patient-side compose UI + sender-aware bubbles

**Files:**
- Modify: `app/patient/page.tsx:1-8` (import), `app/patient/page.tsx:60-66` (message query), `app/patient/page.tsx:169-201` (message section)

**Interfaces:**
- Consumes: `sendPatientMessage` (Task 2), `patient_messages.sender` (Task 1).
- Produces: nothing new consumed elsewhere — this is a leaf UI change.

- [ ] **Step 1: Add the import**

In `app/patient/page.tsx`, change:

```ts
import { markMessageRead } from "./actions";
```

to:

```ts
import { markMessageRead, sendPatientMessage } from "./actions";
```

- [ ] **Step 2: Select `sender` in the message query**

Change (around line 62):

```ts
    .select("id, body, created_at, read_at")
```

to:

```ts
    .select("id, body, created_at, read_at, sender")
```

- [ ] **Step 3: Replace the message section**

Replace the whole block from `{messages && messages.length > 0 && (` through its closing `)}` (currently lines 169-201) with:

```tsx
        {messages && messages.length > 0 && (
          <section className="mt-6 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
              <MessageCircle className="h-4 w-4 text-blue-600" strokeWidth={1.75} />
              Messages avec votre kiné
            </h2>
            <ul className="mt-3 flex flex-col gap-2">
              {[...messages].reverse().map((m) => {
                const mine = m.sender === "patient";
                return (
                  <li key={m.id as string} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                        mine
                          ? "rounded-br-md bg-blue-600 text-white"
                          : !m.read_at
                            ? "rounded-bl-md border-l-2 border-l-blue-600 bg-slate-50 font-medium text-slate-900"
                            : "rounded-bl-md bg-slate-50 text-slate-500"
                      }`}
                    >
                      <p>{m.body as string}</p>
                      <div className="mt-1 flex items-center justify-between gap-3">
                        <span className={`text-xs ${mine ? "text-blue-100" : "text-slate-400"}`}>
                          {new Date(m.created_at as string).toLocaleString("fr-FR")}
                        </span>
                        {!mine && !m.read_at && (
                          <form action={markMessageRead}>
                            <input type="hidden" name="message_id" value={m.id as string} />
                            <button type="submit" className="text-xs font-medium text-blue-700 hover:underline">
                              Marquer comme lu
                            </button>
                          </form>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            <form action={sendPatientMessage} className="mt-3 flex gap-2">
              <input
                name="body"
                required
                placeholder="Écrire un message…"
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 active:scale-95"
              >
                Envoyer
              </button>
            </form>
          </section>
        )}
```

Note: the query orders `created_at` descending (most recent first, for the `.limit(10)` to keep the last 10), but a message thread reads naturally oldest-to-newest top-to-bottom — hence `[...messages].reverse()` at render time rather than changing the query's `order`/`limit` semantics.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors mentioning `app/patient/page.tsx`.

- [ ] **Step 5: Lint**

Run: `npx eslint app/patient/page.tsx`
Expected: clean.

- [ ] **Step 6: Manual verification**

Log in as a patient (or use an existing dev session), open `/patient`. Confirm: existing instructor-sent messages still render (left-aligned), the compose box appears below them, typing a message and pressing "Envoyer" adds it right-aligned in blue, and the page doesn't error if `messages` is empty (the whole section only renders `messages && messages.length > 0`, unchanged from before — a patient with zero messages still sees no section, which is existing behavior this plan doesn't change).

- [ ] **Step 7: Commit**

```bash
git add app/patient/page.tsx
git commit -m "$(cat <<'EOF'
Add compose box and sender-aligned bubbles to patient messages

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_011JRGK1q9vP21g7m98MeEx7
EOF
)"
```

---

### Task 4: Instructor-side read-marking + sender-aware bubbles

**Files:**
- Modify: `app/dashboard/patients/[id]/page.tsx:69-74` (message query + inline read-mark), `app/dashboard/patients/[id]/page.tsx:374-407` (message section)

**Interfaces:**
- Consumes: `patient_messages.sender`, `patient_messages.read_by_instructor_at` (Task 1).
- Produces: nothing new consumed elsewhere — this is a leaf UI change.

- [ ] **Step 1: Select the new columns and mark the thread read inline**

Replace the existing message query (lines 68-74):

```ts
  // Messages already sent to this patient (most recent first).
  const { data: messages } = await supabase
    .from("patient_messages")
    .select("id, body, created_at, read_at")
    .eq("patient_id", id)
    .order("created_at", { ascending: false })
    .limit(10);
```

with:

```ts
  // Messages already sent to this patient (most recent first).
  const { data: messages } = await supabase
    .from("patient_messages")
    .select("id, body, created_at, read_at, read_by_instructor_at, sender")
    .eq("patient_id", id)
    .order("created_at", { ascending: false })
    .limit(10);

  // Opening this page is what "reading" the thread means for the instructor
  // — mark any patient-authored messages read right here, rather than adding
  // a separate button/action for it. This page is already fully dynamic
  // (auth-gated, no caching), so a write during the GET is a deliberate,
  // low-stakes simplification, not a caching hazard.
  const unreadFromPatient = (messages ?? []).filter((m) => m.sender === "patient" && !m.read_by_instructor_at);
  if (unreadFromPatient.length > 0) {
    await supabase
      .from("patient_messages")
      .update({ read_by_instructor_at: new Date().toISOString() })
      .eq("patient_id", id)
      .eq("instructor_id", user.id)
      .eq("sender", "patient")
      .is("read_by_instructor_at", null);
  }
```

- [ ] **Step 2: Replace the message section**

Replace the whole block from the `<h2>` at line ~374 (`<MessageCircle ... /> Messages`) down to its section's closing `</section>` (the block currently at lines 374-407, i.e. the `<h2>`, the send `<form>`, and the `{messages && ... }` list) with:

```tsx
          <h2 className="flex items-center gap-1.5 font-medium text-[color:var(--ink)]">
            <MessageCircle className="h-4 w-4 text-[color:var(--ink-muted)]" strokeWidth={1.5} />
            Messages
          </h2>
          {messages && messages.length > 0 && (
            <ul className="mt-3 flex max-h-56 flex-col gap-2 overflow-y-auto">
              {[...messages].reverse().map((m) => {
                const mine = m.sender === "instructor";
                return (
                  <li key={m.id as string} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                        mine
                          ? "rounded-br-md bg-[color:var(--ink-accent)] text-white"
                          : "rounded-bl-md bg-[color:var(--surface-muted)] text-[color:var(--ink-soft)]"
                      }`}
                    >
                      <p>{m.body as string}</p>
                      <p className={`mt-0.5 text-xs ${mine ? "text-white/70" : "text-[color:var(--ink-muted)]"}`}>
                        {new Date(m.created_at as string).toLocaleString("fr-FR")}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <form action={sendMessage} className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input type="hidden" name="patient_id" value={patient.id} />
            <textarea
              name="body"
              required
              rows={2}
              placeholder="Écrire un message…"
              className="flex-1 rounded-lg border border-[color:var(--hairline)] bg-white px-3 py-2 text-sm text-[color:var(--ink)] focus:border-[color:var(--ink-accent)] focus:outline-none focus:ring-2 focus:ring-[color:var(--ink-accent)]/20"
            />
            <button
              type="submit"
              className="self-end rounded-lg bg-[color:var(--ink-accent)] px-4 py-2 text-sm font-medium text-white transition-opacity duration-150 hover:opacity-90 sm:self-auto"
            >
              Envoyer
            </button>
          </form>
        </section>
```

If `--surface-muted` is not an existing token in this page's CSS-variable scope, use `bg-[color:var(--hairline)]/40` instead (check the `.rehab-panel` scope's defined variables before assuming a new one — see Step 3).

- [ ] **Step 3: Confirm the CSS variables used actually exist**

Run: `grep -rn "\-\-surface-muted\|\-\-hairline\|\-\-ink-accent\|\-\-ink-soft\|\-\-ink-muted" app/globals.css`

If `--surface-muted` isn't defined anywhere in that output, replace `bg-[color:var(--surface-muted)]` in Step 2 with `bg-[color:var(--hairline)]/40` before proceeding — don't introduce an undefined CSS variable.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors mentioning `app/dashboard/patients/[id]/page.tsx`.

- [ ] **Step 5: Lint**

Run: `npx eslint "app/dashboard/patients/[id]/page.tsx"`
Expected: clean.

- [ ] **Step 6: Manual verification**

As a patient, send a message (Task 3's compose box). As the instructor, open that patient's detail page: confirm the patient's message appears left-aligned, the instructor's own prior messages appear right-aligned, and re-running the Task 1 Step 5 verification query (`select count(*) from patient_messages where sender='patient' and read_by_instructor_at is null`) now returns 0 for that thread after the page has been opened once.

- [ ] **Step 7: Commit**

```bash
git add "app/dashboard/patients/[id]/page.tsx"
git commit -m "$(cat <<'EOF'
Mark patient messages read on open, render sender-aligned bubbles

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_011JRGK1q9vP21g7m98MeEx7
EOF
)"
```

---

### Task 5: Dashboard unread-messages query (groundwork only)

**Files:**
- Create: `lib/dashboard/unreadMessages.ts`

**Interfaces:**
- Consumes: `patient_messages.sender`, `read_by_instructor_at` (Task 1).
- Produces: `UnreadMessageRow { patientId: string; patientName: string; body: string; createdAt: string }` and `loadUnreadMessages(supabase, instructorId): Promise<UnreadMessageRow[]>` — this exact type and function name is what the dashboard-redesign plan's "Messages non lus" section will import. **This task does not modify `app/dashboard/page.tsx`** — wiring this into the dashboard UI is explicitly the next plan's job (`2026-09-02-dashboard-redesign-design.md`).

- [ ] **Step 1: Write the helper**

```ts
import type { SupabaseClient } from "@supabase/supabase-js";

export interface UnreadMessageRow {
  patientId: string;
  patientName: string;
  body: string;
  createdAt: string;
}

// Patient-authored messages this instructor hasn't opened yet, most recent
// first. Consumed by the dashboard's "Messages non lus" section.
export async function loadUnreadMessages(
  supabase: SupabaseClient,
  instructorId: string,
): Promise<UnreadMessageRow[]> {
  const { data } = await supabase
    .from("patient_messages")
    .select("patient_id, body, created_at, patients(full_name)")
    .eq("instructor_id", instructorId)
    .eq("sender", "patient")
    .is("read_by_instructor_at", null)
    .order("created_at", { ascending: false });

  return (data ?? []).map((m) => ({
    patientId: m.patient_id as string,
    patientName: (m.patients as { full_name: string | null } | null)?.full_name ?? "Patient",
    body: m.body as string,
    createdAt: m.created_at as string,
  }));
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors mentioning `lib/dashboard/unreadMessages.ts`.

- [ ] **Step 3: Lint**

Run: `npx eslint lib/dashboard/unreadMessages.ts`
Expected: clean.

- [ ] **Step 4: Manual sanity check**

In the SQL editor, run the equivalent query directly to confirm the shape matches what the helper expects:

```sql
select pm.patient_id, pm.body, pm.created_at, p.full_name
from public.patient_messages pm
join public.patients p on p.id = pm.patient_id
where pm.instructor_id = '<some real instructor uuid>'
  and pm.sender = 'patient'
  and pm.read_by_instructor_at is null
order by pm.created_at desc;
```

Confirm the columns line up with `UnreadMessageRow` (this is a manual check, not a runnable test — this repo has no test framework, per this plan's Global Constraints).

- [ ] **Step 5: Commit**

```bash
git add lib/dashboard/unreadMessages.ts
git commit -m "$(cat <<'EOF'
Add loadUnreadMessages helper for the upcoming dashboard redesign

Groundwork only — not wired into app/dashboard/page.tsx yet. That's
the dashboard-redesign plan's job, which imports this exact function.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_011JRGK1q9vP21g7m98MeEx7
EOF
)"
```
