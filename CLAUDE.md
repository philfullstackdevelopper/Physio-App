@AGENTS.md

# EasyPhysio — Project Specification

This file is the source of truth for this project. Read it fully before making changes. If a request conflicts with this spec, flag the conflict instead of silently deviating. If you notice the *code* has drifted from what this file says, flag that too and propose a correction to this file rather than silently trusting either one — this file has gone stale before and caused an agent to treat live features as forbidden.

## 1. What this app is

A multi-tenant SaaS platform ("suivi en ligne") for physiotherapy instructors (kinés) to manage patient exercise programs and track adherence. One platform, many instructors, each instructor's patients and data completely isolated from every other instructor's.

The entire user interface is in French. Do not add an internationalization/translation layer — hardcode French strings directly.

## 2. User roles

There are three roles. Build for exactly these three — do not add extra roles (e.g. "clinic admin," "assistant") unless explicitly asked.

**Admin** (the platform owner, i.e. Philippe): manages the platform itself. Built so far: approving new instructor signups from `/admin` (see migration `0023_instructor_approval.sql` — instructors default to `pending` on self-serve signup and must be approved before they can use the dashboard).

**Instructor** (the physiotherapist / kiné): signs up, waits for admin approval, logs in, manages their own roster of patients, builds programs for patients from a shared exercise library, views patient adherence, messages their patients, sets their own per-patient price and connects Stripe to get paid.

**Patient**: logs in, accepts CGU + health-data consent, sees their assigned program for today, marks exercises/sessions as done, messages their instructor, can export or delete their own data. Patients do not manage other patients and cannot see other instructors' or other patients' data.

## 3. Data model

The schema lives in `supabase/migrations/` (numbered SQL files, applied in order via `node scripts/migrate.mjs`). **That directory is the source of truth for the schema — do not hand-copy or re-describe individual columns here, they will drift.** Read the migrations directly when you need exact column names/types.

Conceptually, the schema is organized around:

- **Identity**: `instructors`, `patients` (owned by an instructor), and — for the Phase-2 auth migration only (see §7) — `auth.users`, `auth_tokens`, `app_users`.
- **Exercise library**: `exercises` (shared library, any instructor can use any exercise), `conditions` (named protocols, e.g. "Lombalgie chronique"), `workouts` (session alternatives within a condition), `workout_exercises`, plus `instructor_hidden_exercises` (per-instructor hide list). A workout with `patient_id` set is a **patient-specific copy** created by « Ajuster la séance » (`source_workout_id` points at the original); it is visible only to that patient and their instructor (migration 0044) and never appears in library lists.
- **Assignment & adherence**: a patient is assigned a `condition` and optionally a `recommended_workout_id`; completing a session writes a `workout_logs` row. `patient_profiles`, `patient_feedback`, `patient_documents` hold richer per-patient clinical/intake detail beyond the Phase-1 basics.
- **Billing**: `instructor_connect_accounts` (Stripe Connect account id — deliberately its own table, not a column on `instructors`, so the instructor's own RLS update policy can't let them redirect their own patients' payments — see `lib/billing/platformFee.ts`), `platform_invoices`.
- **Messaging**: `patient_messages` — instructor-to-patient messaging, already live (dashboard patient detail page and the patient app both use it).
- **Compliance**: `0018_health_data_consent.sql`, `0019_terms_acceptance.sql` — explicit consent gates, required before a patient can proceed.

### RLS rules to enforce

- An instructor can read/write only rows in `patients` where `instructor_id` matches their own auth id, and can read `workout_logs` of their own patients.
- A patient can read only their own row in `patients`, and can read/write only their own rows in `workout_logs`.
- `exercises` (the shared library) is readable by all authenticated instructors and patients, but only instructors can insert/update/delete (an instructor may modify only exercises they created; platform ones are read-only).
- `conditions`, `workouts`, and `workout_exercises` are readable by all authenticated users. Pre-loaded platform rows (`created_by` is null) are read-only to instructors. An instructor can insert their own conditions/workouts and update/delete only their own.
- RLS is enabled on every table from the start — never add a table without RLS policies in the same migration.
- Before applying any policy, explain in plain language what it does and why, so Philippe can confirm it matches this intent.

## 4. Core user flows (current)

**Instructor**
1. Sign up (`/signup`) → account is created `pending` → Philippe approves from `/admin` → instructor can log in.
2. See a list of their own patients; add a new patient (Clerk invitation, patient sets their own password via Clerk's flow).
3. Assign the patient to a **condition**, which already offers several **workouts** (session alternatives). Optionally recommend a specific workout.
4. Create their own conditions/workouts/exercises in addition to the pre-loaded platform library.
5. View a patient's **adherence** (completions vs. recommended times/week), and message the patient directly.
6. From the patient page, click « Ajuster la séance » to add/remove exercises for that patient only — the app copies the séance for them and sends them an automatic message.
7. Set their own monthly per-patient price and connect a Stripe account (`/dashboard/facturation`) to get paid directly by patients.

**Patient**
1. Log in (Clerk), accept CGU and health-data consent on first use.
2. See workout alternatives for their condition, with the instructor's recommendation highlighted.
3. Open a workout, do the guided session (pain feedback at the end; the phase brake in `lib/exercise/stageProgress.ts` only ever slows progression down), and mark it done → `workout_logs`.
4. Message their instructor; from `/patient/compte`, export their data (JSON) or delete their account.

**Billing (money flow)** — two flows kept strictly separate: patients pay their instructor directly via the instructor's own Stripe Connect account (EasyPhysio never touches that money — avoids compérage risk); the platform separately bills the instructor a prorated 15% fee per active patient (`lib/billing/platformFee.ts`). There is no flat subscription plan anymore — the old "Kiné Pro" flat plan was removed in favor of this per-patient model.

## 5. Explicitly out of scope (still not built)

- Email/SMS reminders
- Rich scheduling (calendars, recurring rules beyond a plain text frequency field)
- Multi-language support
- Analytics beyond what the instructor UI shows today (adherence %, day-over-day tiles, 30-day pain history). No exports, no cross-patient reports.
- Any role beyond Admin / Instructor / Patient

## 6. Permanently dropped (do not resurrect without being asked)

**Télésoin (remote video sessions) and camera-based pose-tracking exercise analysis.** Both were fully built, then deliberately removed — not paused. Migration `0024_drop_telesoin.sql` drops the `video_calls` table outright and says explicitly "dropped from the product entirely — not paused." If a request seems to want either of these back, flag it rather than reintroducing the old components (`VideoCall`, `TelesoinDossier`, `PoseTracker`, etc. — already fully removed, don't recreate them from git history without explicit confirmation).

## 7. Planned but not currently active

Two pieces of scaffolding exist in the repo for future work. Both are intentionally unfinished — don't "complete" them unprompted, and don't delete them either.

**Self-hosted Postgres + custom auth (Scalingo migration, "Phase 2").** The long-term plan is to move off Supabase to a self-hosted Postgres on Scalingo, with `auth.ts` (Auth.js/NextAuth, credentials-based) replacing the current Clerk-based auth. Status: `auth.ts`, `lib/db/pool.ts`, `lib/db/withUserContext.ts`, `lib/auth/password.ts`, `lib/auth/tokens.ts`, and the `app/api/auth/[...nextauth]/route.ts` route exist and are explicitly commented "NOT YET WIRED INTO THE LIVE APP." Migration `0017_users_and_auth_tokens.sql` recreates `auth.users`/`auth.uid()` on plain Postgres specifically so the existing RLS policies keep working unchanged after the cutover. **Known issue:** the `next-auth` and `bcryptjs` packages this code imports are not currently installed (missing from `package.json`/`node_modules`), which breaks `npm run build` today even though nothing in the live app calls this code — because `app/api/auth/[...nextauth]/route.ts` is still a real route Next.js compiles. Either install those two packages before resuming this work, or exclude that route from the build in the meantime — check with Philippe before doing either, since this is mid-flight work.

**AI-generated rehab protocols** (`lib/ai/protocol.ts`, `app/api/protocol/route.ts`). Currently a mock/placeholder with invented example conditions and exercises, not wired to any UI. This is meant to become a real feature eventually, but only once it's built on the clinical partner's real protocols — never on invented/mock clinical content, and never connected to real patients before that clinical review happens. The current placeholder data must not be mistaken for reviewed clinical content.

## 8. Technical stack (already set up — do not change without discussion)

- **Next.js 16** (App Router, TypeScript, Tailwind CSS 4, Turbopack) — frontend and backend together. Next.js 16 renamed `middleware.ts` → `proxy.ts` (same job, runs before each request) — this codebase already uses `proxy.ts`.
- **React 19**, icons via **lucide-react** (no emoji as UI icons — use real icons or flag the need for real photos). The instructor app uses one palette, declared as Tailwind `@theme` tokens in `app/globals.css` (`app-bg`, `surface`, `line`, `ink`, `muted`, `brand`, `ok`, `warn`, `danger` + `-soft` variants); Fraunces (`font-display`) is for the marketing site only.
- **Clerk** (`@clerk/nextjs`) — current authentication for both instructors and patients (frFR localization). This replaced an earlier Supabase-Auth-based system; see §7 for the *next* planned auth migration.
- **Supabase** — Postgres database and file storage. Client wired up under `lib/supabase/`. Supabase's own Auth product is no longer used (Clerk is), but the Postgres database and Storage remain live.
- **Stripe** (Connect) — per-patient billing, see §4.
- **Vercel** — hosting, auto-deploys on every push to the `main` branch on GitHub.
- **GitHub** — repo at `philfullstackdevelopper/Physio-App`.

Environment variables live in `.env.local` locally and in Vercel's project environment variables for production. Never commit `.env.local` to git, and never print or read its contents unless the user asks.

## 9. Working conventions

- Philippe is a complete beginner to coding. Before running any command or making any non-trivial change, briefly explain what it does and why in plain language.
- Prefer small, incremental steps he can verify (run locally, check in browser) over large multi-file changes in one go.
- When implementing RLS policies or anything touching data isolation between instructors, always explain the policy before applying it — this is the one part of the app that must never be wrong.
- Keep all UI text in French.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
