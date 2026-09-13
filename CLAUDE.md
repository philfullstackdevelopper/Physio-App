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

- **Identity**: `instructors`, `patients` (owned by an instructor), and `app_users` — live today, not Phase-2-only: it's the Clerk-id ↔ internal-uuid mapping every login resolves through (`lib/auth/user-map.ts`), and `current_app_user_id()` (every RLS policy's identity check) reads through it. `auth.users`/`auth_tokens` (migration `0017`) are the actually-unused ones — leftover scaffolding for the abandoned Auth.js replacement-of-Clerk plan (see §7), not touched by any live code path.
- **Exercise library**: `exercises` (shared library, any instructor can use any exercise), `conditions` (named protocols, e.g. "Lombalgie chronique"), `workouts` (session alternatives within a condition), `workout_exercises`, plus `instructor_hidden_exercises` (per-instructor hide list). A workout with `patient_id` set is a **patient-specific copy** created by « Ajuster la séance » (`source_workout_id` points at the original); it is visible only to that patient and their instructor (migration 0044) and never appears in library lists.
- **Assignment & adherence**: a patient is assigned a `condition` and an ordered list of recommended workouts (`patient_recommended_workouts`, migration 0035); completing a session writes a `workout_logs` row. `patient_profiles` and `patient_feedback` hold richer per-patient clinical/intake detail beyond the Phase-1 basics. `patient_documents` (and message attachments) were deliberately dropped entirely (migration 0056, 2026-09-13) — see §6.
- **Billing**: `instructor_connect_accounts` (Stripe Connect account id — deliberately its own table, not a column on `instructors`, so the instructor's own RLS update policy can't let them redirect their own patients' payments — see `lib/billing/platformFee.ts`), `platform_invoices`, `subscriptions` (one row per patient, written only by the server from Stripe — `plan` is one of the three offers `essentiel`/`standard`/`premium`, or a legacy value), and the kiné's own offer prices `instructors.tier_*_cents` (null = the platform defaults in `lib/billing/plans.ts`; migration 0053).
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
7. Set their own price for each of the three patient offers (platform defaults in `lib/billing/plans.ts`) and connect a Stripe account (`/dashboard/facturation`) to get paid directly by patients.

**Patient**
1. Log in (Clerk), accept CGU, complete the onboarding wizard (situation, profile, equipment, health-data consent), then pick one of their kiné's three offers on `/patient/abonnement` — 7 days free, then billed monthly straight to the kiné's Stripe Connect account. Manage or cancel it any time from `/patient/compte` (Stripe Customer Portal). The order is enforced by `app/patient/layout.tsx` + `lib/patient/home-data.ts` (`isProfileComplete`, then `hasActiveTier`).
2. See workout alternatives for their condition, with the instructor's recommendation highlighted.
3. Open a workout, do the guided session (pain feedback at the end; the phase brake in `lib/exercise/stageProgress.ts` only ever slows progression down), and mark it done → `workout_logs`.
4. Message their instructor; from `/patient/compte`, export their data (JSON) or delete their account.

**Billing (money flow)** — two flows kept strictly separate: patients pay their instructor directly via the instructor's own Stripe Connect account (EasyPhysio never touches that money — avoids compérage risk); the platform separately bills the instructor a prorated 15% fee per active patient (`lib/billing/platformFee.ts`). There is no flat subscription plan anymore — the old "Kiné Pro" flat plan was removed in favor of this per-patient model. Patients choose between three monthly offers — Essentiel / Standard / Premium (weekly-séance cap and video library, `lib/billing/plans.ts`; the prices are kiné-editable defaults) — with a 7-day Stripe trial before the first charge; see `docs/superpowers/specs/2026-09-08-patient-program-tiers-design.md` and `docs/superpowers/plans/2026-09-10-patient-tiers-trial-and-cancel.md`. Not built yet from that spec: strict weekly-cap enforcement on the kiné side, the active-patient counter, public pricing on the marketing site, and the actual collection of the 15% (sub-project 2).

## 5. Explicitly out of scope (still not built)

- Email/SMS reminders
- Rich scheduling (calendars, recurring rules beyond a plain text frequency field)
- Multi-language support
- Analytics beyond what the instructor UI shows today (adherence %, day-over-day tiles, 30-day pain history). No exports, no cross-patient reports.
- Any role beyond Admin / Instructor / Patient

## 6. Permanently dropped (do not resurrect without being asked)

**Télésoin (remote video sessions) and camera-based pose-tracking exercise analysis.** Both were fully built, then deliberately removed — not paused. Migration `0024_drop_telesoin.sql` drops the `video_calls` table outright and says explicitly "dropped from the product entirely — not paused." If a request seems to want either of these back, flag it rather than reintroducing the old components (`VideoCall`, `TelesoinDossier`, `PoseTracker`, etc. — already fully removed, don't recreate them from git history without explicit confirmation).

## 7. Active migration: Supabase → Scalingo (HDS compliance)

**This is now the standing target architecture, not a someday-maybe** — real French patient health data legally requires HDS-certified hosting (art. L.1111-8 CSP), and Supabase/Vercel are not HDS-certified. Scalingo is, and this migration is how the app gets there. As of 2026-09-13 the mechanics are fully proven and the app's data-access code is already rewired for it — what's left is operational (see below), not more architecture work. Do not propose the old "Auth.js/NextAuth replaces Clerk" plan described in earlier drafts of this file — that was abandoned; **Clerk is kept** (HDS certification covers hosting of health data, and Clerk never holds health data, only identity).

**The architecture**: the app's own code is unchanged from a Supabase-shaped mental model — it still calls `@supabase/supabase-js`, still enforces per-instructor/per-patient isolation via Postgres RLS policies keyed on `current_app_user_id()`. What changes is only what's *behind* that client:
- **PostgREST** (self-hosted on a Scalingo app, `easyphysio-postgrest`) replaces Supabase's own REST layer. It verifies the same Clerk session JWT the app already sends (via Clerk's public JWKS), and RLS policies apply exactly as before.
- A tiny **Caddy** reverse proxy sits in front of PostgREST in the same container, because `@supabase/supabase-js` hardcodes calling `<url>/rest/v1/<table>` — PostgREST itself serves tables at the root, so Caddy strips the `/rest/v1` prefix before forwarding.
- Scalingo's managed Postgres role has neither `CREATEROLE` nor `BYPASSRLS` (verified directly against the database) — there is no way to recreate Supabase's `service_role` bypass-everything key. The ~19 places that used to call `createAdminClient()` now do one of two things instead: (a) go through the *normal* RLS-scoped client, where a real policy already (or newly) allows it, or (b) call one of a small number of narrow, single-purpose SQL functions living in an `internal` schema that PostgREST never exposes (`lib/db/admin.ts`, a direct, server-only Postgres connection — see `supabase/migrations/0057_scalingo_admin_bypass_functions.sql` for the full design rationale and a real security lesson learned building it: `revoke execute from public` does nothing when there's only one Postgres role, since the role owns every function it creates).
- These same functions/policies are also applied to the still-live Supabase database, purely additively, so the exact same application code works correctly on both backends during the migration window — see that migration file's own notes.

**What's actually left (operational, not architectural)** — see the memory note "HDS hosting requirement" for the full step-by-step cutover runbook: refresh the Scalingo data copy one final time, flip `NEXT_PUBLIC_SUPABASE_URL` and `SCALINGO_DATABASE_URL` to the real (non-test) values, a full manual smoke test, then promote the test PostgREST app to permanent infrastructure. Philippe has not yet bought a production domain name or moved Clerk to a production instance — neither is required to finish the Scalingo cutover itself (Scalingo provides a free `*.scalingo.io` subdomain, same idea as Vercel's `*.vercel.app`); both only matter for the actual public launch, which is also still waiting on the exercise demonstration videos being filmed and added to the platform.

**Two-stage plan, decided 2026-09-13**: development moves onto Scalingo starting now — today's `easyphysio` app runs in Scalingo's `osc-fr1` region, which is **not** HDS-certified (only `osc-secnum-fr1` is, and that region needs a Scalingo support request to unlock). That's fine for now since there is no real patient data yet (pre-launch). The plan is explicitly two stages, not one: (1) now — finish the cutover onto Scalingo's ordinary region, as the new standing development target; (2) at actual public-launch time, once the exercise videos are filmed and on the platform — upgrade the Scalingo subscription to the HDS-certified `osc-secnum-fr1` region/plan, *and* handle the other launch-gated items together (buy the domain, move Clerk to production, legal review). Don't treat stage 1 as if it were already HDS-compliant — it isn't yet, on purpose, until stage 2.

**AI-generated rehab protocols** (`lib/ai/protocol.ts`, `app/api/protocol/route.ts`). Currently a mock/placeholder with invented example conditions and exercises, not wired to any UI. This is meant to become a real feature eventually, but only once it's built on the clinical partner's real protocols — never on invented/mock clinical content, and never connected to real patients before that clinical review happens. The current placeholder data must not be mistaken for reviewed clinical content. (This one really is someday-maybe, unlike the Scalingo migration above — don't build on it unprompted.)

## 8. Technical stack (already set up — do not change without discussion)

- **Next.js 16** (App Router, TypeScript, Tailwind CSS 4, Turbopack) — frontend and backend together. Next.js 16 renamed `middleware.ts` → `proxy.ts` (same job, runs before each request) — this codebase already uses `proxy.ts`.
- **React 19**, icons via **lucide-react** (no emoji as UI icons — use real icons or flag the need for real photos). The instructor app uses one palette, declared as Tailwind `@theme` tokens in `app/globals.css` (`app-bg`, `surface`, `line`, `ink`, `muted`, `brand`, `ok`, `warn`, `danger` + `-soft` variants); Fraunces (`font-display`) is for the marketing site only.
- **Clerk** (`@clerk/nextjs`) — authentication for both instructors and patients (frFR localization), staying in place through and after the Scalingo migration (see §7) — HDS certification is about hosting health data, not identity, and Clerk holds no health data. Still on a development instance; moving to a production instance needs a real domain, not yet bought (see §7).
- **Scalingo Postgres + PostgREST** (the database, see §7) — **cut over on 2026-09-13 for development**: `NEXT_PUBLIC_SUPABASE_URL` in `.env.local` now points at the self-hosted PostgREST + Caddy app on Scalingo, and `SCALINGO_DATABASE_URL` at the Scalingo Postgres addon (through `scalingo db-tunnel` on a laptop — the addon has no public internet access; once the Next.js app itself runs on Scalingo it reaches the database directly). Verified end-to-end with the real app and a real Clerk session. The app's own code (`lib/supabase/*`) is unchanged — same `@supabase/supabase-js` client, just a different URL. Supabase's database is no longer used by the app, but has NOT been deleted yet — it's the rollback: swap the two env vars back and everything runs on Supabase again.
- **Supabase Storage** — still the file-storage backend, for the single remaining bucket `exercise-media` (exercise demo videos, not health data). Philippe wants this off Supabase too; Scalingo has no persistent file storage of its own (containers are ephemeral), so the target is **Outscale OOS** (S3-compatible, Scalingo's own recommended pairing) — `lib/storage/s3.ts` is already written and dormant, waiting only on an Outscale account + access keys that Philippe has to create himself. Until then, `NEXT_PUBLIC_SUPABASE_STORAGE_URL` / `SUPABASE_STORAGE_URL` keep Storage pointed at Supabase separately from the database URL (`lib/supabase/client.ts` `createStorageClient()`, `lib/supabase/admin.ts`) — a single `supabase-js` client can't serve both, since PostgREST has no Storage API.
- **Stripe** (Connect) — per-patient billing, see §4.
- **Vercel** — hosting today, auto-deploys on every push to the `main` branch on GitHub. Migrating to Scalingo alongside the database (§7) — an app already exists there (`easyphysio`), auto-deploying the same way.
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
